package services.rooms.api

import cats.effect.IO
import cats.syntax.all.*
import services.rooms.objects.{PlayerInput, Session}
import services.rooms.utils.RoomAccess

import services.rooms.objects.Connection

final case class SubmitInputMessage(session: Session, peerId: String, input: PlayerInput)
    extends APIMessage[Unit]:
  def plan(connection: Connection): IO[Unit] =
    RoomAccess.withPlayer(connection, session) { room =>
      room.peers.get.flatMap { peers =>
        IO.raiseUnless(peers.get(session.side).exists(_.id == peerId))(
          IllegalArgumentException("连接已由新页面替换")
        ) *>
          room.simulation.get.flatMap(_.traverse_(_.input(session.side, input)))
      }
    }
