package services.system.objects.internal

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}

/** Instance registration payload sent by a rooms process, also used as its heartbeat. */
final case class InstanceSummary(
    instanceId: String,
    instanceUrl: String,
    capacity: Int,
    rooms: Vector[RoomSummary]
)

object InstanceSummary:
  given Encoder[InstanceSummary] = deriveEncoder
  given Decoder[InstanceSummary] = deriveDecoder
