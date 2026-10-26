import { WORLD } from "../../data/rules";
import type { Move } from "../../objects/Move";
import { STAGE_FORM } from "../../mujica/forms";
import { CHARACTERS } from "../../mujica/roster";
import {
  PENGUIN_SUPER_TUNING,
  penguinSuperPulses,
} from "../shared/derivedSupers";

/** Stage normal range and authored combat timings are independent of video duration. */
export function tuneMujica(MOVES: Record<string, Move>): void {
  for (const move of Object.values(MOVES)) {
    if (
      move.category !== "normal" ||
      move.form !== "stage" ||
      !CHARACTERS.some((character) => character.id === move.ownerCharacter)
    )
      continue;
    move.reach! *= STAGE_FORM.normalRangeMultiplier;
    move.vertical! *= STAGE_FORM.normalRangeMultiplier;
    if (move.pulses)
      move.pulses = move.pulses.map((pulse) => ({
        ...pulse,
        reach: move.reach,
        vertical: move.vertical,
      }));
  }
  Object.assign(MOVES.mujica_8_normal_super, {
    duration: 1000,
    start: 50,
    end: 710,
    hitstop: 30,
    fixedDamage: true,
    pulses: MOVES.mujica_8_normal_super.pulses!.map((pulse, i) => ({
      ...pulse,
      at: 60 + i * 280,
    })),
  });
  for (const form of ["normal", "stage"])
    Object.assign(MOVES[`mujica_5_${form}_super`], {
      name: "练习结束后再吵·追踪低鸣",
      umiri: "pursuit",
      projectile: true,
      homing: true,
      fixedDamage: true,
      damage: 30,
      duration: 650,
      start: 100,
      end: 150,
      hitstop: 60,
      pulses: undefined,
      shots: undefined,
      speed: 760,
      lifetime: 4500,
      height: 110,
      radiusX: 38,
      radiusY: 64,
      reach: WORLD.right - WORLD.left,
      maxReach: WORLD.right - WORLD.left,
      stun: 480,
      push: 240,
    });
  for (const form of ["normal", "stage"]) {
    const move = MOVES[`mujica_6_${form}_super`];
    Object.assign(move, {
      sakiko: "ascension",
      targetArea: true,
      targetLock: true,
      areaRadius: 330,
      reach: 330,
      vertical: 330,
      duration: 1750,
      start: 0,
      end: 1350,
      hitstop: 30,
      // Control releases on the cast tick; the rain retains the original damage.
      fixedDamage: true,
      pulses: move.pulses!.map((pulse, i) => ({ ...pulse, at: 250 + i * 500 })),
    });
  }
  // The Mortis super mirrors the tuned penguin super; both tunes read the same
  // shared constants, so this no longer depends on MyGO tuning first.
  Object.assign(MOVES.mujica_8_stage_super, {
    name: "Mortis·失控尖叫",
    mortis: "scream",
    projectile: true,
    radial: true,
    fixedDamage: true,
    omni: true,
    duration: PENGUIN_SUPER_TUNING.duration,
    start: PENGUIN_SUPER_TUNING.start,
    end: PENGUIN_SUPER_TUNING.end,
    hitstop: PENGUIN_SUPER_TUNING.hitstop,
    damage: PENGUIN_SUPER_TUNING.damage,
    shots: [...PENGUIN_SUPER_TUNING.shots],
    pulses: penguinSuperPulses(),
    reach: PENGUIN_SUPER_TUNING.reach,
    speed: PENGUIN_SUPER_TUNING.speed,
    lifetime: PENGUIN_SUPER_TUNING.lifetime,
    height: PENGUIN_SUPER_TUNING.height,
    stun: PENGUIN_SUPER_TUNING.stun,
    push: PENGUIN_SUPER_TUNING.push,
  });
  for (const form of ["normal", "stage"])
    Object.assign(MOVES["mujica_7_" + form + "_super"], {
      duration: 1000,
      start: 80,
      end: 930,
      crawlSpeed: 600,
      forwardCrawl: true,
      damage: 10,
      fixedDamage: true,
      hitstop: 0,
      pulses: [100, 280, 460, 640, 820].map((at, i) => ({
        at,
        damage: 10,
        reach: 200,
        stun: 240,
        push: i === 4 ? 180 : 0,
      })),
    });
}
