package services.rooms.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}

final case class RoomView(
    code: String,
    format: String,
    arena: Int,
    terrain: Boolean,
    generation: Int,
    players: Vector[Option[PlayerView]],
    playing: Boolean,
    preparing: Boolean,
    draft: Option[DraftView]
)

object RoomView:
  given Encoder[RoomView] = deriveEncoder
  given Decoder[RoomView] = deriveDecoder
