package services.rooms.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}

final case class DraftState(bans: Vector[Int] = Vector.empty)

object DraftState:
  given Encoder[DraftState] = deriveEncoder
  given Decoder[DraftState] = deriveDecoder
