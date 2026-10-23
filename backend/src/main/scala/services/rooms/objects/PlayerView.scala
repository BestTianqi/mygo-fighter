package services.rooms.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}

final case class PlayerView(character: Int, ready: Boolean, connected: Boolean)

object PlayerView:
  given Encoder[PlayerView] = deriveEncoder
  given Decoder[PlayerView] = deriveDecoder
