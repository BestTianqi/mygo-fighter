package services.rooms.api

import cats.effect.IO
import cats.syntax.all.*

import services.rooms.objects.*
import services.rooms.utils.{RoomAccess, RoomDraft}
import services.system.api.APIMessage
import services.system.objects.Connection

final case class LobbyRoomMessage(session: Session) extends APIMessage[Unit]:
  def plan(connection: Connection): IO[Unit] =
    RoomAccess.withPlayer(connection, session) { room =>
      room.state.update(s => if s.draft.nonEmpty then RoomDraft.reset(s) else s) *> room.resetLobby
    }
