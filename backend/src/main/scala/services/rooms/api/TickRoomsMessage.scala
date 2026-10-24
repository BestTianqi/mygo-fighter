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
          if now - active < 30.minutes then IO.unit
          else
            room.lock.permit.use { _ =>
              room.stop *> room.resetLobby *> room.peers.get.flatMap(
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
