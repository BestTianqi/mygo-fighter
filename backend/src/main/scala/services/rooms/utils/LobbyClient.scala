package services.rooms.utils

import cats.effect.IO
import io.circe.Json
import io.circe.syntax.*
import java.net.URI
import java.net.http.{HttpClient, HttpRequest, HttpResponse}
import java.time.Duration
import scala.concurrent.duration.*
import services.rooms.objects.RoomsConfig
import services.system.objects.internal.{InstanceSummary, RegisteredRoom}

/** Directory and heartbeat calls owned by a rooms process. Room creation and combat must keep
  * working when the lobby is unavailable, so every call is best-effort with a short timeout.
  */
final class LobbyClient private (config: RoomsConfig):
  private val baseUrl = config.lobbyUrl.getOrElse("")
  private val client = HttpClient.newBuilder().connectTimeout(Duration.ofMillis(300)).build()

  private[rooms] def register(code: String): IO[Unit] =
    post("/internal/registered", RegisteredRoom(code, config.instanceId).asJson)

  private[rooms] def heartbeat(summary: InstanceSummary): IO[Unit] =
    post("/internal/heartbeat", summary.asJson)

  private def post(path: String, body: Json): IO[Unit] =
    (
      for
        request <- IO {
          val builder = HttpRequest
            .newBuilder(URI.create(baseUrl + path))
            .timeout(Duration.ofMillis(500))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body.noSpaces))
          config.internalSecret.foreach(secret => builder.header("X-Mygo-Internal", secret))
          builder.build()
        }
        response <- IO.fromCompletableFuture(
          IO(client.sendAsync(request, HttpResponse.BodyHandlers.discarding()))
        )
        _ <- IO.raiseUnless(response.statusCode() >= 200 && response.statusCode() < 300)(
          IllegalStateException(s"Lobby rejected $path with ${response.statusCode()}")
        )
      yield ()
    ).timeout(1.second).void.handleErrorWith(_ => IO.unit)

object LobbyClient:
  private[rooms] def create(config: RoomsConfig): Option[LobbyClient] =
    config.lobbyUrl.map(_ => new LobbyClient(config))
