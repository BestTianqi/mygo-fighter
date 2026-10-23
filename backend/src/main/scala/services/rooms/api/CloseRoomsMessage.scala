package services.rooms.api

import cats.effect.IO
import cats.syntax.all.*
import services.system.api.NoRequestMessage
import services.system.objects.Connection

final case class CloseRoomsMessage() extends NoRequestMessage[Unit]:
  def plan(connection: Connection): IO[Unit] =
    connection.rooms.get.flatMap(
      _.values.toList.traverse_(room =>
        room.lock.permit.use(_ => room.simulation.getAndSet(None).flatMap(_.traverse_(_.close)))
      )
    )
