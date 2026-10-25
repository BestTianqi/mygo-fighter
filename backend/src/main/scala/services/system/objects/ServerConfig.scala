package services.system.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}

final case class ServerConfig(
    host: String,
    port: Int,
    webRoot: String,
    maxRooms: Int = 20,
    trustLocalProxy: Boolean = false
)

object ServerConfig:
  given Encoder[ServerConfig] = deriveEncoder[ServerConfig]
  given Decoder[ServerConfig] = deriveDecoder[ServerConfig]
