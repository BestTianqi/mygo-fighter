import { isMujica } from "../combatData";
import { STAGE_FORM } from "../mujica";
import type { Fighter } from "../objects/Fighter";
export const clamp = (x: number, a: number, b: number) =>
  Math.max(a, Math.min(b, x));
// Common denominator of 2/3/4/5/6/8/9-hit skills keeps full-hit resource
// budgets exact, including thresholds such as the 50-point transformation.
export const RESONANCE_UNITS = 360;
export const outgoingMultiplier = (f: Fighter, attack: string) =>
  isMujica(f.character) && f.stageForm && attack !== "mujicaTransform"
    ? STAGE_FORM.damageMultiplier
    : 1;
