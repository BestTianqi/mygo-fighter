package services.rooms.api

import cats.effect.IO
import cats.syntax.all.*
import services.rooms.objects.Connection
import services.rooms.objects.apiTypes.SessionResponse
import services.rooms.utils.{RoomAccess, RoomRuntime}

/** Creates a room and joins it as the host. The lobby may place the room with an allocated code;
  * without a lobby the instance generates the code itself.
  */
final case class CreateRoomMessage(code: Option[String] = None)
    extends NoRequestMessage[SessionResponse]:
  def plan(connection: Connection): IO[SessionResponse] =
    val placed = code.map(_.trim.toUpperCase)
    IO.raiseUnless(placed.forall(_.matches("[A-F0-9]{6}")))(IllegalArgumentException("请重试创建房间"))
      *> RoomAccess.nonce(3).map(fallback => placed.getOrElse(fallback)).flatMap { roomCode =>
        RoomRuntime.create(roomCode).flatMap { room =>
          connection.rooms
            .modify { rooms =>
              if rooms.size >= connection.config.maxRooms then
                (
                  rooms,
                  Left(IllegalArgumentException("服务器房间已满，请稍后创建；已有房间仍可加入。"))
                )
              else if rooms.contains(roomCode) then
                (rooms, Left(IllegalArgumentException("请重试创建房间")))
              else (rooms.updated(roomCode, room), Right(()))
            }
            .flatMap(IO.fromEither)
            .flatMap(_ =>
              room.start(connection.roomSupervisor) *>
                JoinRoomMessage(roomCode)
                  .plan(connection)
                  .flatTap(_ =>
                    connection.lobby
                      .fold(IO.unit)(lobby => lobby.register(roomCode).start.void)
                  )
            )
        }
      }
