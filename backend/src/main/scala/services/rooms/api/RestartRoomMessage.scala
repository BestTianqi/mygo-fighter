package services.rooms.api

import cats.effect.IO
import cats.syntax.all.*

import services.rooms.objects.*
import services.rooms.utils.RoomAccess
import services.system.api.APIMessage
import services.system.objects.Connection

final case class RestartRoomMessage(session: Session) extends APIMessage[Unit]:
  def plan(connection: Connection): IO[Unit] =
    RoomAccess.withPlayer(connection, session) { room =>
      IO.raiseUnless(session.side == 0)(IllegalArgumentException("请由房主重新开战")) *>
        room.state.get.flatMap(state =>
          IO.raiseUnless(state.players.forall(_.exists(_.connected)))(
            IllegalArgumentException("等待对方重新连接")
          ) *>
            room.simulation.get.flatMap(_.traverse_(_.restart))
        )
    }
