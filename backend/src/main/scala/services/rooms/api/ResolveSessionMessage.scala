package services.rooms.api

import cats.effect.IO
import services.rooms.objects.Session
import services.system.api.APIMessage
import services.system.objects.Connection

final case class ResolveSessionMessage(token: String) extends APIMessage[Session]:
  def plan(connection: Connection): IO[Session] =
    connection.sessions.get.flatMap(sessions =>
      IO.fromOption(sessions.get(token))(IllegalArgumentException("房间连接已失效，请重新加入"))
    )
