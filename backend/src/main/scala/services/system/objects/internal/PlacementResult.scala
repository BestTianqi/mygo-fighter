package services.system.objects.internal

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}

/** A rooms instance selected for a new room plus the globally unique room code. */
final case class PlacementResult(instanceId: String, instanceUrl: String, code: String)

object PlacementResult:
  given Encoder[PlacementResult] = deriveEncoder
  given Decoder[PlacementResult] = deriveDecoder
