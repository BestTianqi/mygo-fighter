import { bandFor, FEEL, profileFor } from "../combatData";
import type { Fighter } from "../objects/Fighter";
import type { Match } from "../engine";

export const clamp = (x: number, a: number, b: number) =>
  Math.max(a, Math.min(b, x));
// Common denominator of 2/3/4/5/6/8/9-hit skills keeps full-hit resource
// budgets exact, including thresholds such as the 50-point transformation.
export const RESONANCE_UNITS = 360;
export const gravityFor = (match: Match) =>
  FEEL.gravity * (match.options.rules.lowGravity ? 0.6 : 1);
export const movementSpeed = (match: Match, fighter: Fighter) =>
  profileFor(fighter).speed * match.options.rules.speedMultiplier;
export const outgoingMultiplier = (f: Fighter, attack: string) => {
  const transform = bandFor(f.character).transform;
  return transform && f.stageForm && attack !== transform.move
    ? transform.damageMultiplier
    : 1;
};
