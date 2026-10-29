package services.rooms.api

import cats.effect.IO
import services.rooms.objects.Connection

trait APIMessage[Response]:
  def plan(connection: Connection): IO[Response]

trait NoRequestMessage[Response] extends APIMessage[Response]
