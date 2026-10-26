package services.rooms.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}

final case class DraftView(bans: Vector[Int], phase: String, turn: Option[Int])

object DraftView:
  given Encoder[DraftView] = deriveEncoder
  given Decoder[DraftView] = deriveDecoder
