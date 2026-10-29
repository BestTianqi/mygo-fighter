package services.rooms.routes

import cats.effect.IO
import cats.syntax.all.*
import io.circe.Json
import io.circe.syntax.*
import org.http4s.circe.jsonEncoder
import org.http4s.HttpRoutes
import org.http4s.dsl.io.*
import org.http4s.server.Router
import org.http4s.server.websocket.WebSocketBuilder2
import services.rooms.objects.Connection
import services.system.routes.InternalGuard

/** Internal surface of one rooms process. The edge is the only caller: it forwards public API names
  * under `/internal/api` and proxies the socket under `/internal/ws`.
  */
object RoomInternalRoutes:
  def routes(connection: Connection, builder: WebSocketBuilder2[IO]): HttpRoutes[IO] =
    val health = HttpRoutes.of[IO] { case GET -> Root / "health" =>
      connection.rooms.get.flatMap(rooms =>
        Ok(
          Json.obj(
            "role" -> "rooms".asJson,
            "instanceId" -> connection.config.instanceId.asJson,
            "rooms" -> rooms.size.asJson,
            "ok" -> true.asJson
          )
        )
      )
    }
    InternalGuard.wrap(connection.config.internalSecret)(
      Router(
        "/internal" -> (health <+> APIMessageRouter
          .routes(RoomRoutes.apiMessages, connection) <+> RoomRoutes
          .socketRoutes(connection, builder))
      )
    )
