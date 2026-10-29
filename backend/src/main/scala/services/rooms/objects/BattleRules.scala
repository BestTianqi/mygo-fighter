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
    noCooldowns: Boolean = false,
    infiniteTime: Boolean = false,
    roundSeconds: Int = 60,
    initialEnergy: Int = 0,
    damageMultiplier: Double = 1,
    speedMultiplier: Double = 1,
    oneHitKO: Boolean = false,
    vampire: Boolean = false,
    lowGravity: Boolean = false,
    infiniteJumps: Boolean = false,
    disableGuard: Boolean = false,
    energyRegen: Int = 0,
    healthRegen: Int = 0,
    freeDash: Boolean = false,
    knockbackMultiplier: Double = 1
)

object BattleRules:
  given Encoder[BattleRules] = deriveEncoder[BattleRules]
  given Decoder[BattleRules] = deriveDecoder[BattleRules]
