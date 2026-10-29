package services.rooms.api

import cats.effect.IO
import cats.syntax.all.*
import services.rooms.objects.Session

import services.rooms.objects.Connection

final case class DisconnectRoomMessage(session: Session, peerId: String) extends APIMessage[Unit]:
  def plan(connection: Connection): IO[Unit] =
    connection.rooms.get.flatMap(_.get(session.code).traverse_(_.disconnect(session.side, peerId)))
