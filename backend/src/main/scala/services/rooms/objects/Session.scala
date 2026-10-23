package services.rooms.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}

final case class Session(id: String, token: String, code: String, side: Int)

object Session:
  given Encoder[Session] = deriveEncoder
  given Decoder[Session] = deriveDecoder
