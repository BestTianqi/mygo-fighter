import type { BattleRules } from "./objects/BattleRules";
import type { Format } from "./objects/MatchOptions";
import type { Move } from "./objects/Move";

export const MATCH_FORMATS: readonly Format[] = [
  "1v1",
  "2v2",
  "3v3",
  "4v4",
  "5v5",
  "6v6",
  "7v7",
  "8v8",
];
export const DEFAULT_BATTLE_RULES: Readonly<BattleRules> = Object.freeze({
  banCount: 0,
  maxHealth: 200,
  disableSupers: false,
  infiniteEnergy: false,
  disableNormals: false,
  disableTransform: false,
  noCooldowns: false,
  infiniteTime: false,
  roundSeconds: 60,
  initialEnergy: 0,
  damageMultiplier: 1,
  speedMultiplier: 1,
  oneHitKO: false,
  vampire: false,
  lowGravity: false,
  infiniteJumps: false,
  disableGuard: false,
});
export const DAMAGE_MULTIPLIERS = [0.5, 1, 1.5, 2, 3] as const;
export const SPEED_MULTIPLIERS = [0.75, 1, 1.25, 1.5, 2] as const;
export function teamSizeFor(format: unknown): number {
  return MATCH_FORMATS.includes(format as Format)
    ? Number(String(format)[0])
    : 1;
}
export function maxBanCount(teamSize: number, rosterSize: number): number {
  return Math.max(0, Math.min(7, Math.floor((rosterSize - teamSize * 2) / 2)));
}
export function moveEnabled(
  rules: BattleRules,
  move: Move | undefined,
): boolean {
  return (
    !!move &&
    !(
      (rules.disableNormals && move.category === "normal") ||
      (rules.disableSupers && move.category === "super") ||
      (rules.disableTransform && move.category === "transformation")
    )
  );
}
export function normalizeBattleRules(
  value: Partial<BattleRules> | undefined,
  format: Format,
  rosterSize: number,
): BattleRules {
  const integer = (n: unknown, fallback: number, min: number, max: number) =>
    typeof n === "number" && Number.isFinite(n)
      ? Math.max(min, Math.min(max, Math.round(n)))
      : fallback;
  return {
    banCount: integer(
      value?.banCount,
      0,
      0,
      maxBanCount(teamSizeFor(format), rosterSize),
    ),
    maxHealth: integer(value?.maxHealth, 200, 50, 2000),
    disableSupers: value?.disableSupers === true,
    infiniteEnergy: value?.infiniteEnergy === true,
    disableNormals: value?.disableNormals === true,
    disableTransform: value?.disableTransform === true,
    noCooldowns: value?.noCooldowns === true,
    infiniteTime: value?.infiniteTime === true,
    roundSeconds: integer(value?.roundSeconds, 60, 30, 300),
    initialEnergy: integer(value?.initialEnergy, 0, 0, 100),
    damageMultiplier: DAMAGE_MULTIPLIERS.includes(
      value?.damageMultiplier as (typeof DAMAGE_MULTIPLIERS)[number],
    )
      ? value!.damageMultiplier!
      : 1,
    speedMultiplier: SPEED_MULTIPLIERS.includes(
      value?.speedMultiplier as (typeof SPEED_MULTIPLIERS)[number],
    )
      ? value!.speedMultiplier!
      : 1,
    oneHitKO: value?.oneHitKO === true,
    vampire: value?.vampire === true,
    lowGravity: value?.lowGravity === true,
    infiniteJumps: value?.infiniteJumps === true,
    disableGuard: value?.disableGuard === true,
  };
}
