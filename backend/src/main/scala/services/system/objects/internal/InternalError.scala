package services.system.objects.internal

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}

/** Service-to-service error body; mirrors the public `{"error": "..."}` envelope. */
final case class InternalError(error: String)

object InternalError:
  given Encoder[InternalError] = deriveEncoder
  given Decoder[InternalError] = deriveDecoder
