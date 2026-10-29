package services.lobby.routes

import cats.effect.IO
import io.circe.Json
import io.circe.syntax.*
import org.http4s.{HttpRoutes, Response, Status}
import org.http4s.circe.CirceEntityCodec.*
import org.http4s.dsl.io.*
import org.http4s.server.Router
import services.lobby.objects.LobbyConnection
import services.lobby.utils.Registry
import services.system.objects.internal.{InstanceSummary, InternalError, RegisteredRoom}
import services.system.routes.InternalGuard

/** Internal surface of the lobby process. The edge places rooms, resolves room ownership and probes
  * health; rooms instances post registrations and heartbeats. All of it stays behind the loopback
  * guard because these endpoints are the placement authority for the whole deployment.
  */
object LobbyInternalRoutes:
  private val FullMessage = "服务器房间已满，请稍后创建；已有房间仍可加入。"
  private val MissingMessage = "找不到房间，请核对房间码"

  def routes(connection: LobbyConnection): HttpRoutes[IO] =
    InternalGuard.wrap(connection.config.internalSecret)(
      Router("/internal" -> endpoints(connection))
    )

  private def endpoints(connection: LobbyConnection): HttpRoutes[IO] =
    HttpRoutes.of[IO] {
      case POST -> Root / "place" =>
        Registry.place(connection).flatMap {
          case Some(placed) => Ok(placed)
          case None         => ServiceUnavailable(InternalError(FullMessage))
        }

      case GET -> Root / "rooms" / code =>
        Registry.owner(connection, code).flatMap {
          case Some(owner) => Ok(owner)
          case None        => NotFound(InternalError(MissingMessage))
        }

      case request @ POST -> Root / "registered" =>
        request
          .as[RegisteredRoom]
          .flatMap(room => Registry.applyRegistered(connection, room))
          .as(Response[IO](Status.NoContent))

      case request @ POST -> Root / "heartbeat" =>
        request
          .as[InstanceSummary]
          .flatMap(summary => Registry.applyHeartbeat(connection, summary))
          .as(Response[IO](Status.NoContent))

      case GET -> Root / "health" =>
        connection.instances.get.flatMap { instances =>
          connection.directory.get.flatMap { directory =>
            Ok(
              Json.obj(
                "role" -> "lobby".asJson,
                "ok" -> true.asJson,
                "instances" -> instances.size.asJson,
                "rooms" -> directory.size.asJson
              )
            )
          }
        }
    }
