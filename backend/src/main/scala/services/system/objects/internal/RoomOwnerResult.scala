package services.system.objects.internal

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}

/** The rooms instance that currently owns a room code. */
final case class RoomOwnerResult(instanceId: String, instanceUrl: String)

object RoomOwnerResult:
  given Encoder[RoomOwnerResult] = deriveEncoder
  given Decoder[RoomOwnerResult] = deriveDecoder
