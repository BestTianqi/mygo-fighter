package services.edge.routes

import cats.effect.{IO, Ref}
import fs2.Stream
import io.circe.Json
import io.circe.syntax.*
import java.util.Locale
import org.http4s.circe.*
import org.http4s.dsl.io.*
import org.http4s.server.websocket.WebSocketBuilder2
import org.http4s.websocket.WebSocketFrame
import org.http4s.{HttpRoutes, Request, Response, Status}
import services.edge.objects.EdgeConnection
import services.edge.utils.{InstanceClient, SocketProxy}
import services.system.routes.OriginCheck

/** Public `/ws` entry. The edge authenticates the room code, opens one upstream socket to the rooms
  * instance that owns it and relays complete frames in both directions; no room state is copied.
  */
object EdgeSocketRoutes:
  private val ConnectionLost = "房间连接已失效，请重新加入"
  private val ServiceUnavailable = "联机服务暂时不可用，请稍后重试"

  private[edge] def routes(
      connection: EdgeConnection,
      client: InstanceClient,
      sockets: SocketProxy,
      builder: WebSocketBuilder2[IO]
  ): HttpRoutes[IO] = HttpRoutes.of[IO] { case request @ GET -> Root / "ws" =>
    if !OriginCheck.sameOrigin(request) then Forbidden()
    else
      roomCode(request) match
        case None       => BadRequest(Json.obj("error" -> "缺少房间码".asJson))
        case Some(code) =>
          client
            .owner(code)
            .flatMap {
              case None              => errorSocket(builder, ConnectionLost)
              case Some(instanceUrl) =>
                connect(connection, sockets, builder, upstreamUrl(instanceUrl, code), code)
            }
            .handleErrorWith(failureResponse)
  }

  /** Allocates the upstream resource for the lifetime of the browser socket. Both relay directions
    * close the upstream socket when either side ends, so an abandoned browser never leaks a socket.
    */
  private def connect(
      connection: EdgeConnection,
      sockets: SocketProxy,
      builder: WebSocketBuilder2[IO],
      url: String,
      code: String
  ): IO[Response[IO]] =
    Ref.of[IO, Boolean](false).flatMap { released =>
      sockets.connect(url, connection.config.internalSecret).allocated.flatMap {
        case (upstream, release) =>
          val closeUpstream =
            released.getAndSet(true).flatMap(already => if already then IO.unit else release)
          builder
            .withOnClose(closeUpstream)
            .build(
              upstream.frames.onFinalize(closeUpstream),
              _.evalMap(upstream.send).onFinalize(closeUpstream)
            )
            .handleErrorWith(error =>
              connection.owners
                .invalidate(code)
                .productR(closeUpstream)
                .productR(failureResponse(error))
            )
      }
    }

  /** A handshake the edge already rejected: send one error frame, then close the socket. */
  private def errorSocket(builder: WebSocketBuilder2[IO], message: String): IO[Response[IO]] =
    val payload = Json.obj("type" -> "error".asJson, "message" -> message.asJson).noSpaces
    builder.build(Stream.emit(WebSocketFrame.Text(payload, true)), _.drain)

  private def roomCode(request: Request[IO]): Option[String] =
    request.uri.query.params
      .get("room")
      .map(_.trim.toUpperCase(Locale.ROOT))
      .filter(_.matches("[A-F0-9]{6}"))

  private def upstreamUrl(instanceUrl: String, code: String): String =
    val base = instanceUrl.trim.stripSuffix("/")
    val socketBase =
      if base.startsWith("https://") then "wss://" + base.stripPrefix("https://")
      else if base.startsWith("http://") then "ws://" + base.stripPrefix("http://")
      else base
    s"$socketBase/internal/ws?room=$code"

  private def failureResponse(error: Throwable): IO[Response[IO]] =
    val status =
      if InstanceClient.isTimeout(error) then Status.GatewayTimeout else Status.BadGateway
    IO.pure(Response[IO](status).withEntity(Json.obj("error" -> ServiceUnavailable.asJson)))
