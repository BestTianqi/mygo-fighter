package services.rooms.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}

final case class Player(
    id: String,
    character: Int,
    ready: Boolean = false,
    connected: Boolean = false
)

object Player:
  given Encoder[Player] = deriveEncoder
  given Decoder[Player] = deriveDecoder
