package services.rooms.api

import cats.effect.IO
import cats.syntax.all.*

import services.rooms.objects.*
import services.rooms.utils.RoomAccess
import services.system.api.APIMessage
import services.system.objects.Connection

final case class PauseRoomMessage(session: Session, paused: Boolean) extends APIMessage[Unit]:
  def plan(connection: Connection): IO[Unit] =
    RoomAccess.withPlayer(connection, session) { room =>
      room.state.get.flatMap { state =>
        IO.raiseUnless(
          paused || (state.loaded.size == 2 && state.players.forall(_.exists(_.connected)))
        )(
          IllegalArgumentException("等待双方重新连接并加载角色")
        ) *>
          room.simulation.get.flatMap(_.traverse_(_.pause(paused))) *> room.resumeClock
      }
    }
