import type { Move, Pulse } from "../../../../objects/Move";
import { registerBackSkills as registerBackSkillTemplate } from "../../../shared/backSkills";
import { createSuperPulses } from "../../../shared/superPulses";
import { createMoveRegistrar, missile } from "../../shared/createMoveRegistrar";
import { registerNormals as registerNormalTemplate } from "../../shared/registerNormals";
export function registerNormals(MOVES: Record<string, Move>): void {
  registerNormalTemplate(MOVES, 8, "stage", ["人偶轻切", "断线重斩"], 8);
}
export function registerSkills(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  add(8, "stage", "u", "Mortis·替身代演", {
    mortis: "double",
    duration: 760,
    start: 220,
    end: 480,
    pulses: [
      { at: 220, damage: 8, reach: 320, stun: 320, push: 25 },
      { at: 400, damage: 12, reach: 340, stun: 320, push: 220 },
    ],
    reach: 340,
    movement: -100,
    movementEnd: 160,
    recast: 1400,
  });
  add(8, "stage", "i", "我不会弹吉他·装死反击", {
    mortis: "parry",
    category: "defense",
    counter: true,
    counterDamage: 22,
    start: 100,
    end: 650,
    duration: 900,
    damage: 0,
    recast: 4500,
  });
  add(8, "stage", "o", "不要解散·牵线留人", {
    mortis: "snare",
    level: "high",
    delayedArea: true,
    warning: 430,
    areaRadius: 150,
    reach: 420,
    vertical: 180,
    damage: 18,
    stun: 650,
    pull: 150,
    push: 0,
    duration: 850,
    recast: 2600,
  });
  add(8, "stage", "toddler", "我只有两岁", {
    slot: "u",
    command: "↓＋U",
    visualSlot: "skill-u",
    cost: 20,
    mortis: "toddler",
    omni: true,
    reach: 260,
    vertical: 190,
    damage: 14,
    stun: 420,
    push: 230,
    duration: 620,
    start: 150,
    end: 240,
    recast: 1600,
  });
  add(8, "stage", "burger", "我要吃汉堡", {
    ...missile,
    slot: "i",
    command: "↓＋I",
    visualSlot: "skill-o",
    cost: 25,
    mortis: "burger",
    damage: 18,
    stun: 350,
    push: 180,
    speed: 580,
    lifetime: 1250,
    radiusX: 34,
    radiusY: 35,
    duration: 640,
    start: 180,
    end: 210,
    recast: 1400,
  });
  add(8, "stage", "blood_fist", "我的拳头想喝血了", {
    slot: "o",
    command: "↓＋O",
    visualSlot: "heavy",
    mortis: "bloodFist",
    cost: 60,
    damage: 20,
    movement: 120,
    movementEnd: 180,
    reach: 240,
    vertical: 280,
    duration: 760,
    start: 220,
    end: 300,
    stun: 400,
    push: 190,
    hitstop: 90,
    recast: 3000,
    lifestealBuff: { ratio: 0.4, duration: 10000 },
  });
}
export function registerSuper(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  const damages = [8, 12, 28];
  const duration = 8300;
  const pulses: Pulse[] = createSuperPulses(duration, damages);
  add(8, "stage", "super", "从来没觉得玩乐队开心过", {
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
  Object.assign(MOVES.mujica_8_stage_super, {
    name: "Mortis·双生剧场",
    mortis: "theater",
    omni: true,
    reach: 420,
    pulses: [
      { at: 500, damage: 8, reach: 420, stun: 650, pull: 90, push: 0 },
      { at: 4100, damage: 12, reach: 420, stun: 650, pull: 90, push: 0 },
      { at: 7200, damage: 28, reach: 420, stun: 650, push: 240, launch: 240 },
    ],
  });
}
export function registerBackSkills(MOVES: Record<string, Move>): void {
  registerBackSkillTemplate(
    MOVES,
    8,
    "mujica_8_stage",
    ["mujica_8_normal_u", "mujica_8_normal_u", "mujica_8_stage_burger"],
    { form: "stage" },
  );
}
