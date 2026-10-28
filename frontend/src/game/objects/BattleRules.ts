/** Shared by local combat, prediction and the authoritative room simulation. */
export interface BattleRules {
  /** Bans per player, followed by alternating exclusive picks. */
  banCount: number;
  maxHealth: number;
  disableSupers: boolean;
  infiniteEnergy: boolean;
  disableNormals: boolean;
  disableTransform: boolean;
  noCooldowns: boolean;
}
