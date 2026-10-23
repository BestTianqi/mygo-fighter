package services.rooms.objects.apiTypes

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import services.rooms.objects.RoomView

final case class SessionResponse(token: String, side: Int, room: RoomView)

object SessionResponse:
  given Encoder[SessionResponse] = deriveEncoder
  given Decoder[SessionResponse] = deriveDecoder
