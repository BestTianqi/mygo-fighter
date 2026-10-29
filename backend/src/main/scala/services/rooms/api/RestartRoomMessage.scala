package services.rooms.api

import cats.effect.IO
import cats.syntax.all.*

import services.rooms.objects.*
import services.rooms.utils.RoomAccess

final case class RestartRoomMessage(session: Session) extends APIMessage[Unit]:
  def plan(connection: Connection): IO[Unit] =
    RoomAccess.withPlayer(connection, session) { room =>
      IO.raiseUnless(session.side == 0)(IllegalArgumentException("请由房主重新开战")) *>
        room.state.get.flatMap(state =>
          IO.raiseUnless(
            state.loaded.size == state.players.size && state.players.forall(_.exists(_.connected))
          )(
            IllegalArgumentException("等待所有玩家重新连接并加载角色")
          ) *>
            room.simulation.get.flatMap(_.traverse_(_.restart)) *> room.resumeClock
        )
    }
