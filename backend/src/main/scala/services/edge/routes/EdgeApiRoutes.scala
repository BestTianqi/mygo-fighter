package services.edge.routes

import cats.effect.IO
import fs2.Stream
import io.circe.syntax.*
import io.circe.{parser, Json}
import java.nio.charset.StandardCharsets
import java.util.Locale
import org.http4s.circe.*
import org.http4s.dsl.io.*
import org.http4s.{Header, HttpRoutes, Request, Response, Status}
import org.typelevel.ci.CIString
import services.edge.objects.EdgeConnection
import services.edge.utils.{InstanceClient, UpstreamResponse}
import services.system.routes.OriginCheck

/** Public `/api/{name}` entry. The edge owns no room state: it places new rooms through the lobby,
  * resolves the owning rooms instance and forwards the original payload unchanged, so the rooms
  * service keeps validating every message with its own rules.
  */
object EdgeApiRoutes:
  private val BodyLimit = 8192
  private val RetryableStatuses = Set(400, 503)
  private val RoomMissing = "找不到房间，请核对房间码"
  private val ConnectionLost = "房间连接已失效，请重新加入"
  private val ServiceUnavailable = "联机服务暂时不可用，请稍后重试"

  private[edge] def routes(connection: EdgeConnection, client: InstanceClient): HttpRoutes[IO] =
    HttpRoutes.of[IO] { case request @ POST -> Root / "api" / name =>
      if !OriginCheck.sameOrigin(request) then Forbidden(Json.obj("error" -> "请从联机服务页面进入".asJson))
      else
        readBody(request).flatMap {
          case None       => PayloadTooLarge()
          case Some(body) => dispatch(connection, client, name, body)
        }
    }

  private def dispatch(
      connection: EdgeConnection,
      client: InstanceClient,
      name: String,
      body: String
  ): IO[Response[IO]] =
    name match
      case "createroom" => createRoom(connection, client)
      case "joinroom"   =>
        normalizedCode(readString(body, "code")) match
          case None       => badRequest(RoomMissing)
          case Some(code) => forwardOwned(client, code, name, body, RoomMissing)
      case _ =>
        tokenCode(readString(body, "token")) match
          case None       => badRequest(ConnectionLost)
          case Some(code) => forwardOwned(client, code, name, body, ConnectionLost)

  /** Places with the lobby, then asks the placed instance to create that exact code. A transient
    * 400/503 from either upstream is retried once with a fresh placement.
    */
  private def createRoom(connection: EdgeConnection, client: InstanceClient): IO[Response[IO]] =
    client.lobbyUrl match
      case None    => createDirectRoom(connection, client)
      case Some(_) =>
        def attempt(retriesLeft: Int): IO[Response[IO]] =
          client.place
            .flatMap {
              case Left(failure) =>
                if retriesLeft > 0 && failure.status == 400 then attempt(retriesLeft - 1)
                else passThrough(failure)
              case Right(placement) =>
                val payload = Json.obj("code" -> placement.code.asJson).noSpaces
                client.forward(placement.instanceUrl, "createroom", payload).flatMap { result =>
                  if retriesLeft > 0 && retryable(result) then attempt(retriesLeft - 1)
                  else if successful(result) then
                    connection.owners
                      .put(placement.code, placement.instanceUrl)
                      .productR(passThrough(result))
                  else passThrough(result)
                }
            }
            .handleErrorWith(failureResponse)
        attempt(1)

  /** Without a lobby the single configured rooms instance generates the room code itself. */
  private def createDirectRoom(
      connection: EdgeConnection,
      client: InstanceClient
  ): IO[Response[IO]] =
    client.directUrl match
      case None              => serviceFailure(Status.BadGateway)
      case Some(instanceUrl) =>
        client
          .forward(instanceUrl, "createroom", "{}")
          .flatMap { result =>
            val remember =
              if successful(result) then
                roomCode(result.bodyText) match
                  case Some(code) => connection.owners.put(code, instanceUrl)
                  case None       => IO.unit
              else IO.unit
            remember.productR(passThrough(result))
          }
          .handleErrorWith(failureResponse)

  /** Forwards one already-authenticated message to the instance that owns its room code. */
  private def forwardOwned(
      client: InstanceClient,
      code: String,
      name: String,
      body: String,
      missing: String
  ): IO[Response[IO]] =
    client
      .owner(code)
      .flatMap {
        case None              => badRequest(missing)
        case Some(instanceUrl) => client.forward(instanceUrl, name, body).flatMap(passThrough)
      }
      .handleErrorWith(failureResponse)

  private def readBody(request: Request[IO]): IO[Option[String]] =
    request.body
      .take((BodyLimit + 1).toLong)
      .compile
      .toVector
      .map { bytes =>
        if bytes.size > BodyLimit then None
        else Some(new String(bytes.toArray, StandardCharsets.UTF_8))
      }

  private def readString(body: String, field: String): Option[String] =
    parser.parse(body).toOption.flatMap(_.hcursor.get[String](field).toOption)

  private def normalizedCode(raw: Option[String]): Option[String] =
    raw.map(_.trim.toUpperCase(Locale.ROOT)).filter(isRoomCode)

  /** Tokens are `<6 uppercase hex>.<session suffix>`; the prefix identifies the room. */
  private def tokenCode(token: Option[String]): Option[String] =
    token
      .map(_.trim)
      .filter(value => value.length > 6 && value.charAt(6) == '.')
      .map(_.take(6))
      .filter(isRoomCode)

  private def isRoomCode(code: String): Boolean = code.matches("[A-F0-9]{6}")

  private def roomCode(responseBody: String): Option[String] =
    parser
      .parse(responseBody)
      .toOption
      .flatMap(_.hcursor.get[String]("token").toOption)
      .map(_.takeWhile(_ != '.'))
      .filter(isRoomCode)

  private def retryable(response: UpstreamResponse): Boolean =
    RetryableStatuses.contains(response.status)

  private def successful(response: UpstreamResponse): Boolean =
    response.status >= 200 && response.status < 300

  private def badRequest(message: String): IO[Response[IO]] =
    IO.pure(Response[IO](Status.BadRequest).withEntity(Json.obj("error" -> message.asJson)))

  private def serviceFailure(status: Status): IO[Response[IO]] =
    IO.pure(Response[IO](status).withEntity(Json.obj("error" -> ServiceUnavailable.asJson)))

  private def failureResponse(error: Throwable): IO[Response[IO]] =
    serviceFailure(
      if InstanceClient.isTimeout(error) then Status.GatewayTimeout else Status.BadGateway
    )

  private def passThrough(result: UpstreamResponse): IO[Response[IO]] =
    val status = Status.fromInt(result.status).getOrElse(Status.BadGateway)
    val response = Response[IO](status)
      .putHeaders(Header.Raw(CIString("Content-Type"), "application/json"))
      .withBodyStream(Stream.emits(result.body.toVector))
    IO.pure(
      result.retryAfter.fold(response)(value =>
        response.putHeaders(Header.Raw(CIString("Retry-After"), value))
      )
    )
