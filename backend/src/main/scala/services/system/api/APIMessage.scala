package services.system.api

import cats.effect.IO
import services.system.objects.Connection

trait APIMessage[Response]:
  def plan(connection: Connection): IO[Response]

trait NoRequestMessage[Response] extends APIMessage[Response]
