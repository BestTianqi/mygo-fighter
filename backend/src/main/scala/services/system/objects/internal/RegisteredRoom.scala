package services.system.objects.internal

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}

/** A rooms instance confirming that a placed room code now exists on that instance. */
final case class RegisteredRoom(code: String, instanceId: String)

object RegisteredRoom:
  given Encoder[RegisteredRoom] = deriveEncoder
  given Decoder[RegisteredRoom] = deriveDecoder
