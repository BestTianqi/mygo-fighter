package services.rooms.api

import cats.effect.IO
import cats.syntax.all.*
import services.rooms.objects.*
import services.rooms.objects.apiTypes.SessionResponse
import services.rooms.utils.{RoomAccess, RoomRuntime}

final case class JoinRoomMessage(code: String) extends APIMessage[SessionResponse]:
  def plan(connection: Connection): IO[SessionResponse] =
    RoomRuntime.find(connection, code.trim.toUpperCase).flatMap { room =>
      room.lock.permit.use { _ =>
        room.stopped.tryGet.flatMap(stopped =>
          IO.raiseWhen(stopped.nonEmpty)(IllegalArgumentException("找不到房间，请核对房间码"))
        ) *> room.state.get.flatMap { state =>
          val side = state.players.indexWhere(_.isEmpty)
          IO.raiseWhen(side < 0)(IllegalArgumentException("房间人数已满")) *>
            RoomAccess.nonce(24).flatMap { suffix =>
              val token = s"${state.code}.$suffix"
              val session = Session(java.util.UUID.randomUUID().toString, token, state.code, side)
              room.state.update(s =>
                s.copy(players =
                  s.players.updated(
                    side,
                    Some(
                      Player(
                        session.id,
                        side,
                        if s.draft.nonEmpty then Vector.empty else Vector(side)
                      )
                    )
                  )
                )
              ) *>
                connection.sessions.update(_.updated(token, session)) *> room.broadcast *>
                room.view.map(view => SessionResponse(token, side, view))
            }
        }
      }
    }
