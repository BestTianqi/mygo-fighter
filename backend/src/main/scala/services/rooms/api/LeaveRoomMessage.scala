package services.rooms.api

import cats.effect.IO
import cats.syntax.all.*

import services.rooms.objects.*
import services.rooms.utils.RoomAccess
import services.system.api.APIMessage
import services.system.objects.Connection

final case class LeaveRoomMessage(session: Session) extends APIMessage[Unit]:
  def plan(connection: Connection): IO[Unit] =
    RoomAccess.withPlayer(connection, session) { room =>
      room.peers.get.flatMap(
        _.get(session.side).traverse_(
          _.control.tryOffer(org.http4s.websocket.WebSocketFrame.Close()).void
        )
      ) *>
        room.peers.update(_ - session.side) *>
        room.state.update(s => s.copy(players = s.players.updated(session.side, None))) *>
        connection.sessions.update(_ - session.token) *> room.resetLobby *>
        room.state.get.flatMap(s =>
          if s.players.forall(_.isEmpty) then room.stop *> connection.rooms.update(_ - s.code)
          else IO.unit
        )
    }
