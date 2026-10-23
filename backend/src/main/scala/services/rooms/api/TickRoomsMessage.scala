package services.rooms.api

import cats.effect.IO
import cats.syntax.all.*
import scala.concurrent.duration.*
import services.system.api.NoRequestMessage
import services.system.objects.Connection

final case class TickRoomsMessage() extends NoRequestMessage[Unit]:
  def plan(connection: Connection): IO[Unit] =
    IO.monotonic.flatMap { now =>
      connection.rooms.get.flatMap(_.toList.parTraverse_ { (code, room) =>
        room.lastActivity.get.flatMap { active =>
          if now - active < 30.minutes then
            room.tick(now).handleErrorWith { error =>
              room.lock.permit.use(_ =>
                room.resetLobby *> room.peers.get.flatMap(
                  _.values.toList.traverse_(
                    _.send(
                      "error",
                      io.circe.Json.obj("message" -> io.circe.Json.fromString("对战已停止，请重新准备"))
                    )
                  )
                )
              ) *>
                IO.println(s"Room $code stopped: ${error.getClass.getSimpleName}")
            }
          else
            room.lock.permit.use { _ =>
              room.resetLobby *> room.peers.get.flatMap(
                _.values.toList
                  .traverse_(_.control.tryOffer(org.http4s.websocket.WebSocketFrame.Close()).void)
              ) *>
                connection.rooms.update(_ - code) *> connection.sessions.update(
                  _.filterNot(_._2.code == code)
                )
            }
        }
      })
    }
