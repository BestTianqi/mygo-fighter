import type { Move } from "../../objects/Move";
import { ROSTER } from "../roster";
import { FEEL } from "../rules";

/** Shared balance runs once after every band and chain has been registered. */
export function applyBalance(MOVES: Record<string, Move>): void {
  const normalDamage = (damage: number) =>
    Math.max(1, Math.round(Math.round(damage * 0.75) * 0.9));
  for (const profile of ROSTER) {
    profile.heavyDamage = normalDamage(profile.heavyDamage);
    profile.lightReach = FEEL.normalReach;
    profile.heavyReach = FEEL.normalReach * FEEL.heavyReachMultiplier;
  }
  for (const [key, move] of Object.entries(MOVES)) {
    if (move.category === "normal") {
      move.damage = normalDamage(move.damage);
      move.duration += 80;
      const strong = move.strength === 3 && !move.jab && !move.chain;
      // Every normal, including all J follow-ups and crouch/air variants, uses
      // one box. Heavy attacks extend both axes by the same 1.2 ratio.
      const range = strong ? FEEL.heavyReachMultiplier : 1;
      move.reach = FEEL.normalReach * range;
      move.vertical = FEEL.normalHeightTolerance * range;
      if (move.pulses)
        move.pulses = move.pulses.map((p) => ({
          ...p,
          damage: normalDamage(p.damage),
          reach: move.reach,
          vertical: move.vertical,
        }));
    }
    if (
      (move.category === "special" || move.category === "super") &&
      move.damage > 0 &&
      !move.projectile &&
      !move.targetArea &&
      !move.targetLock &&
      !move.delayedArea
    )
      move.vertical = Math.max(
        move.vertical ?? 0,
        move.category === "super"
          ? FEEL.superHeightTolerance
          : FEEL.skillHeightTolerance,
      );
    if (move.category !== "super" || key === "super") continue;
    for (const timing of [
      "duration",
      "start",
      "end",
      "invuln",
      "expansion",
      "waveDuration",
      "movementEnd",
    ] as const) {
      if (move[timing])
        move[timing] = Math.max(10, Math.round(move[timing] / 20) * 10);
    }
    if (move.shots) move.shots = move.shots.map((t) => Math.round(t / 20) * 10);
    if (move.pulses)
      move.pulses = move.pulses.map((p) => ({
        ...p,
        at: Math.round(p.at / 20) * 10,
      }));
    move.hitstop ??= 100;
  }
}
