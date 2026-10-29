import type { Move, Pulse } from "../../../../objects/Move";
import { registerBackSkills as registerBackSkillTemplate } from "../../../shared/backSkills";
import { createSuperPulses } from "../../../shared/superPulses";
import { createMoveRegistrar, missile } from "../../shared/createMoveRegistrar";
import { registerNormals as registerNormalTemplate } from "../../shared/registerNormals";
export function registerNormals(MOVES: Record<string, Move>): void {
  registerNormalTemplate(MOVES, 5, "stage", ["锚弦轻击", "沉锚重拍"], 8);
}
export function registerSkills(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  add(5, "stage", "u", "意欲何为·三连低鸣", {
    ...missile,
    umiri: "bass",
    groundShock: true,
    level: "low",
    damage: 6,
    shots: [120, 260, 400],
    start: 120,
    end: 420,
    duration: 720,
    speed: 560,
    maxReach: 700,
    lifetime: 1400,
    height: 36,
    radiusX: 34,
    radiusY: 30,
    recast: 1800,
  });
  add(5, "stage", "i", "很遗憾·强制返场", {
    umiri: "hook",
    damage: 20,
    reach: 350,
    vertical: 190,
    start: 180,
    end: 480,
    duration: 840,
    recast: 2200,
    pulses: [
      { at: 180, damage: 7, reach: 350, pull: 170, push: 0, stun: 400 },
      {
        at: 420,
        damage: 13,
        reach: 240,
        push: 150,
        stun: 360,
        launch: 140,
        knockdown: 450,
      },
    ],
  });
  add(5, "stage", "o", "我吃不胖·零卡重摔", {
    umiri: "toss",
    category: "throw",
    damage: 26,
    reach: 110,
    movement: 120,
    movementEnd: 150,
    start: 180,
    end: 240,
    duration: 760,
    recast: 2400,
    stun: 500,
    push: 350,
    launch: 220,
    knockdown: 600,
  });
  add(5, "stage", "schedule", "排期已满·准点反拨", {
    umiri: "schedule",
    slot: "u",
    visualSlot: "skill-i",
    command: "↓＋U",
    category: "defense",
    cost: 20,
    counter: true,
    counterDamage: 20,
    damage: 0,
    start: 100,
    end: 420,
    duration: 680,
    recast: 4200,
  });
}
export function registerSuper(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  const damages = [8, 12, 28];
  const duration = 3400;
  const pulses: Pulse[] = createSuperPulses(duration, damages);
  add(5, "stage", "super", "练习结束后再吵", {
    category: "super",
    duration,
    start: 500,
    end: pulses.at(-1)!.at + 90,
    invuln: 100,
    damage: 48,
    reach: 420,
    vertical: 300,
    pulses,
  });
}
export function registerBackSkills(MOVES: Record<string, Move>): void {
  registerBackSkillTemplate(
    MOVES,
    5,
    "mujica_5_stage",
    ["mujica_5_stage_u", "mujica_5_stage_u", "mujica_5_stage_u"],
    { form: "stage" },
  );
}
