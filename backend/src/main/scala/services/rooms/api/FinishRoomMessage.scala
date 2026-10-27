package services.rooms.api

import cats.effect.IO
import cats.syntax.all.*
import services.rooms.objects.Session
import services.rooms.utils.RoomAccess
import services.system.api.APIMessage
import services.system.objects.Connection

/** A player acknowledges only their own finish presentation, identified by KO tick. */
final case class FinishRoomMessage(session: Session, tick: Long) extends APIMessage[Unit]:
  def plan(connection: Connection): IO[Unit] =
    RoomAccess.withPlayer(connection, session) { room =>
      room.simulation.get.flatMap(_.traverse_(_.completeFinish(session.side, tick))) *> room.signal
    }
