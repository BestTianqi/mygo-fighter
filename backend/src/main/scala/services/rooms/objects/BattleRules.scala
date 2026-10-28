package services.rooms.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}

final case class BattleRules(
    banCount: Int = 0,
    maxHealth: Int = 200,
    disableSupers: Boolean = false,
    infiniteEnergy: Boolean = false,
    disableNormals: Boolean = false,
    disableTransform: Boolean = false,
    noCooldowns: Boolean = false
)

object BattleRules:
  given Encoder[BattleRules] = deriveEncoder[BattleRules]
  given Decoder[BattleRules] = deriveDecoder[BattleRules]
