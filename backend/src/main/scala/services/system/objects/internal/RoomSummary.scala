package services.system.objects.internal

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}

/** One room as reported by a rooms instance in its heartbeat. */
final case class RoomSummary(code: String, players: Int)

object RoomSummary:
  given Encoder[RoomSummary] = deriveEncoder
  given Decoder[RoomSummary] = deriveDecoder
