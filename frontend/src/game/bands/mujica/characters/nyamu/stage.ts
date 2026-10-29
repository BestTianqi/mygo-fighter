import type { Move, Pulse } from "../../../../objects/Move";
import { registerBackSkills as registerBackSkillTemplate } from "../../../shared/backSkills";
import { createSuperPulses } from "../../../shared/superPulses";
import {
  combo,
  createMoveRegistrar,
  missile,
} from "../../shared/createMoveRegistrar";
import { registerNormals as registerNormalTemplate } from "../../shared/registerNormals";
export function registerNormals(MOVES: Record<string, Move>): void {
  registerNormalTemplate(MOVES, 9, "stage", ["绯红轻敲", "狂爱重拍"], 0);
}
export function registerSkills(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  add(9, "stage", "u", "素颜公开·摘下面具", {
    nyamu: "reveal",
    damage: 14,
    omni: true,
    reach: 240,
    vertical: 210,
    stun: 540,
    push: 180,
    start: 140,
    end: 200,
    duration: 560,
    recast: 1800,
  });
  add(9, "stage", "i", "双利手·交叉飞棒", {
    ...missile,
    nyamu: "sticks",
    damage: 8,
    shots: [130, 280],
    start: 130,
    end: 300,
    duration: 620,
    speed: 660,
    maxReach: 680,
    height: 110,
    radiusX: 22,
    radiusY: 30,
    recast: 1200,
  });
  add(9, "stage", "o", "我只有Ave Mujica了·绝境鼓点", {
    ...combo([4, 4, 6, 10], 140, 160),
    nyamu: "encore",
    damage: 24,
    movement: 160,
    movementEnd: 250,
    duration: 980,
    recast: 1700,
    pulses: [4, 4, 6, 10].map((damage, n) => ({
      at: 160 + n * 140,
      damage,
      reach: 190 + n * 30,
      stun: 330,
      push: n === 3 ? 240 : 25,
      knockdown: n === 3 ? 500 : 0,
    })),
  });
  add(9, "stage", "smile", "完美笑容·营业反击", {
    nyamu: "smile",
    slot: "u",
    visualSlot: "skill-u",
    command: "↓＋U",
    category: "defense",
    counter: true,
    counterDamage: 18,
    damage: 0,
    cost: 20,
    start: 100,
    end: 400,
    duration: 640,
    recast: 4200,
  });
}
export function registerSuper(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  const damages = Array(8).fill(6);
  const duration = 3500;
  const pulses: Pulse[] = createSuperPulses(duration, damages);
  add(9, "stage", "super", "完美笑容·摘下面具", {
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
    9,
    "mujica_9_stage",
    ["mujica_9_stage_i", "mujica_9_stage_i", "mujica_9_stage_i"],
    { form: "stage" },
  );
}
