import type { Move } from "../../../../objects/Move";
import { createMoveRegistrar } from "../../shared/createMoveRegistrar";
import { registerNormals as registerNormalTemplate } from "../../shared/registerNormals";
export function registerNormals(MOVES: Record<string, Move>): void {
  registerNormalTemplate(MOVES, 15, [
    "指尖试探",
    "转身横掌",
    "镜头上挑",
    "退场重踢",
  ]);
}
export function registerSkills(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  add(15, "u", "镜头闪拍", {
    viola: "flash",
    damage: 16,
    omni: true,
    reach: 220,
    vertical: 240,
    duration: 550,
    start: 160,
    end: 210,
    stun: 450,
    push: 70,
    recast: 1400,
  });
  add(15, "i", "断章取义·剪辑陷阱", {
    viola: "edit",
    damage: 24,
    delayedArea: true,
    warning: 700,
    areaRadius: 135,
    vertical: 280,
    duration: 450,
    start: 150,
    end: 180,
    stun: 450,
    push: 120,
    recast: 4000,
  });
  add(15, "o", "原样就好·退场推击", {
    viola: "dismiss",
    damage: 24,
    movement: 160,
    movementEnd: 260,
    reach: 200,
    vertical: 240,
    duration: 700,
    start: 200,
    end: 300,
    stun: 440,
    push: 340,
    knockdown: 450,
    recast: 2000,
  });
}
export function registerWave(MOVES: Record<string, Move>): void {
  MOVES.mewtype_15_virtual_wave = {
    ownerCharacter: 15,
    form: "virtual",
    slot: "u",
    visualSlot: "skill-u",
    command: "↓＋U",
    name: "做得真好·剪辑声波",
    viola: "wave",
    category: "special",
    ground: true,
    projectile: true,
    damage: 14,
    cost: 20,
    duration: 620,
    start: 170,
    end: 210,
    speed: 680,
    maxReach: 820,
    lifetime: 1500,
    height: 110,
    radiusX: 30,
    radiusY: 50,
    stun: 320,
    push: 150,
    chip: 2,
  };
}
export function registerSuper(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  add(15, "super", "引爆点·剪辑放送", {
    viola: "broadcast",
    category: "super",
    damage: 48,
    fixedDamage: true,
    targetArea: true,
    areaRadius: 240,
    reach: 420,
    vertical: 360,
    duration: 2200,
    start: 200,
    end: 1600,
    hitstop: 30,
    pulses: [8, 12, 28].map((damage, i) => ({
      at: 200 + i * 640,
      damage,
      reach: 420,
      stun: 360,
      push: i === 2 ? 240 : 0,
      ...(i === 2 ? { knockdown: 600 } : {}),
    })),
  });
}
