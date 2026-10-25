package services.rooms.api

import cats.effect.IO
import cats.syntax.all.*
import services.rooms.objects.apiTypes.SessionResponse
import services.rooms.utils.{RoomAccess, RoomRuntime}
import services.system.api.NoRequestMessage
import services.system.objects.Connection

final case class CreateRoomMessage() extends NoRequestMessage[SessionResponse]:
  def plan(connection: Connection): IO[SessionResponse] =
    RoomAccess.nonce(3).flatMap { code =>
      RoomRuntime.create(code).flatMap { room =>
        connection.rooms
          .modify { rooms =>
            if rooms.size >= connection.config.maxRooms then
              (rooms, Left(IllegalArgumentException("服务器房间已满，请稍后创建；已有房间仍可加入。")))
            else if rooms.contains(code) then (rooms, Left(IllegalArgumentException("请重试创建房间")))
            else (rooms.updated(code, room), Right(()))
          }
          .flatMap(IO.fromEither)
          .flatMap(_ =>
            room.start(connection.roomSupervisor) *> JoinRoomMessage(code).plan(connection)
          )
      }
    }
