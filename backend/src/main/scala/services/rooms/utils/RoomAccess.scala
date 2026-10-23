package services.rooms.utils

import cats.effect.IO

import services.rooms.objects.Session
import services.system.objects.Connection

object RoomAccess:
  private[rooms] def withPlayer[A](connection: Connection, session: Session)(
      action: RoomRuntime => IO[A]
  ): IO[A] =
    RoomRuntime.find(connection, session.code).flatMap { room =>
      room.lock.permit.use { _ =>
        room.state.get.flatMap { state =>
          IO.raiseUnless(state.players.lift(session.side).flatten.exists(_.id == session.id))(
            IllegalArgumentException("房间连接已失效，请重新加入")
          ) *>
            IO.monotonic.flatMap(room.lastActivity.set) *> action(room)
        }
      }
    }

  private[rooms] def nonce(bytes: Int): IO[String] = IO {
    val data = new Array[Byte](bytes)
    new java.security.SecureRandom().nextBytes(data)
    data.map(b => f"${b & 0xff}%02X").mkString
  }
