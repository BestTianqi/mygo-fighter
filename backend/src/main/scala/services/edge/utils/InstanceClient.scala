package services.edge.utils

import cats.effect.IO
import io.circe.parser
import java.net.URI
import java.net.http.{HttpClient, HttpRequest, HttpResponse, HttpTimeoutException}
import java.nio.charset.StandardCharsets
import java.time.Duration
import java.util.concurrent.TimeoutException
import scala.concurrent.duration.*
import services.edge.objects.{EdgeConfig, EdgeConnection}
import services.system.objects.internal.{PlacementResult, RoomOwnerResult}

/** One internal HTTP reply; error bodies and `Retry-After` are forwarded to the public caller. */
private[edge] final case class UpstreamResponse(
    status: Int,
    body: Array[Byte],
    retryAfter: Option[String]
):
  def bodyText: String = new String(body, StandardCharsets.UTF_8)

/** Calls from the public edge to the internal lobby and rooms services. The edge never owns room
  * state: it only asks the lobby where a code lives and replays the public payload unchanged, so
  * the owning service keeps validating every message. Timeouts are short because a browser request
  * must fail fast instead of queueing behind an unavailable dependency.
  */
private[edge] final class InstanceClient private (
    client: HttpClient,
    config: EdgeConfig,
    owners: OwnerCache
):
  private val PlacementTimeout = 500.millis
  private val lobbyBase: Option[String] = config.lobbyUrl.map(trimTrailingSlash)
  private val directBase: Option[String] = config.roomsDirectUrl.map(trimTrailingSlash)

  private[edge] def lobbyUrl: Option[String] = lobbyBase

  private[edge] def directUrl: Option[String] = directBase

  /** Asks the lobby for a globally unique room code and the rooms instance that owns it. */
  private[edge] def place: IO[Either[UpstreamResponse, PlacementResult]] =
    lobbyBase match
      case None       => IO.raiseError(IllegalStateException("edge is configured without a lobby"))
      case Some(base) =>
        postJson(s"$base/internal/place", "{}", PlacementTimeout).flatMap { response =>
          if response.status >= 200 && response.status < 300 then
            IO.fromEither(parser.decode[PlacementResult](response.bodyText)).map(Right(_))
          else IO.pure(Left(response))
        }

  /** Cached code → rooms instance lookup; unknown codes fall through to the lobby. */
  private[edge] def owner(code: String): IO[Option[String]] =
    owners.get(code).flatMap {
      case cached @ Some(_) => IO.pure(cached)
      case None             =>
        lookupOwner(code).flatMap {
          case Some(result) => owners.put(code, result.instanceUrl).as(Some(result.instanceUrl))
          case None         => IO.pure(None)
        }
    }

  private def lookupOwner(code: String): IO[Option[RoomOwnerResult]] =
    lobbyBase match
      case None       => IO.pure(directBase.map(url => RoomOwnerResult("", url)))
      case Some(base) =>
        get(s"$base/internal/rooms/$code", config.ownerLookupTimeoutMs.millis).flatMap { response =>
          if response.status == 200 then
            IO.fromEither(parser.decode[RoomOwnerResult](response.bodyText)).map(Some(_))
          else if response.status == 404 then IO.pure(None)
          else
            IO.raiseError(
              IllegalStateException(s"lobby owner lookup failed with ${response.status}")
            )
        }

  /** Forwards one public API message to the owning rooms instance without changing its payload. */
  private[edge] def forward(
      instanceUrl: String,
      name: String,
      body: String
  ): IO[UpstreamResponse] =
    postJson(
      s"${trimTrailingSlash(instanceUrl)}/internal/api/$name",
      body,
      config.forwardTimeoutMs.millis
    )

  /** Cheap health probe; the caller decides how a failed probe is reported. */
  private[edge] def health(baseUrl: String, timeout: FiniteDuration): IO[Boolean] =
    get(s"${trimTrailingSlash(baseUrl)}/internal/health", timeout).map(response =>
      response.status >= 200 && response.status < 300
    )

  private def get(url: String, timeout: FiniteDuration): IO[UpstreamResponse] =
    send(builder(url, timeout).GET().build(), timeout)

  private def postJson(url: String, body: String, timeout: FiniteDuration): IO[UpstreamResponse] =
    val request = builder(url, timeout)
      .header("Content-Type", "application/json")
      .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
      .build()
    send(request, timeout)

  private def builder(url: String, timeout: FiniteDuration): HttpRequest.Builder =
    val result = HttpRequest
      .newBuilder(URI.create(url))
      .timeout(Duration.ofMillis(timeout.toMillis))
      .header("Accept", "application/json")
    config.internalSecret.foreach(secret => result.header("X-Mygo-Internal", secret))
    result

  private def send(request: HttpRequest, timeout: FiniteDuration): IO[UpstreamResponse] =
    IO.fromCompletableFuture(IO(client.sendAsync(request, HttpResponse.BodyHandlers.ofByteArray())))
      .timeout(timeout)
      .map { response =>
        UpstreamResponse(
          response.statusCode(),
          response.body(),
          Option(response.headers().firstValue("Retry-After").orElse(null))
        )
      }

  private def trimTrailingSlash(value: String): String = value.trim.stripSuffix("/")

private[edge] object InstanceClient:
  private[edge] def create(connection: EdgeConnection): InstanceClient =
    new InstanceClient(connection.httpClient, connection.config, connection.owners)

  /** Transport failures map to 504 when any layer in the cause chain timed out. */
  private[edge] def isTimeout(error: Throwable): Boolean =
    Iterator
      .iterate(error)(_.getCause)
      .takeWhile(_ != null)
      .take(16)
      .exists {
        case _: TimeoutException     => true
        case _: HttpTimeoutException => true
        case _                       => false
      }
