import { FEEL } from "../../data/rules";

/** Pulse ticks of the tuned penguin super, reused by the Mujica Mortis super. */
const PENGUIN_SUPER_SHOTS = [50, 230, 410, 590, 770] as const;

/**
 * Numbers the Mujica `mujica_8_stage_super` and the MyGO `penguinSuper` share
 * after tuning. Both bands apply these values directly instead of copying from
 * each other, so the band tune order cannot change the result.
 *
 * The authored values live in `bands/mygo/characters/tomori/penguin.ts`; the derived ones
 * (`push`) are what the shared passes below produce from them.
 */
export const PENGUIN_SUPER_TUNING = {
  damage: 10,
  duration: 1500,
  start: 50,
  end: 930,
  hitstop: 0,
  shots: PENGUIN_SUPER_SHOTS,
  speed: 650,
  lifetime: 1100,
  reach: 650,
  height: 100,
  stun: 360,
  /** `penguinSuper.push` after `scaleSharedMovement` (authored push 10). */
  push: 10 * (FEEL.scale / 2),
} as const;

/** Fresh pulse objects, because both tunes hand them to different moves. */
export function penguinSuperPulses() {
  return PENGUIN_SUPER_SHOTS.map((at) => ({
    at,
    damage: PENGUIN_SUPER_TUNING.damage,
  }));
}
