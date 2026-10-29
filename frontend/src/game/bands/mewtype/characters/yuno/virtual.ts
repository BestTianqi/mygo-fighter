import type { Move, Pulse } from "../../../../objects/Move";
import { createSuperPulses } from "../../../shared/superPulses";
import { createMoveRegistrar, missile } from "../../shared/createMoveRegistrar";
import { registerNormals as registerNormalTemplate } from "../../shared/registerNormals";
import { registerWave as registerWaveTemplate } from "../../shared/registerWave";
export function registerNormals(MOVES: Record<string, Move>): void {
  registerNormalTemplate(MOVES, 13, [
    "指尖切拍",
    "搓盘回旋",
    "推盘升拍",
    "唱片重落",
  ]);
}
export function registerSkills(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  add(13, "u", "迈向世界·双重低音", {
    ...missile,
    yuno: "bass",
    damage: 8,
    shots: [120, 300],
    start: 120,
    end: 320,
    duration: 650,
    speed: 620,
    push: 80,
    groundShock: true,
    level: "low",
    height: 40,
    radiusY: 30,
  });
  add(13, "i", "放开我·拒绝贴贴", {
    yuno: "release",
    omni: true,
    damage: 14,
    reach: 225,
    vertical: 200,
    movement: -130,
    movementEnd: 220,
    start: 120,
    end: 190,
    duration: 580,
    push: 420,
    stun: 450,
    recast: 1800,
  });
  add(13, "o", "supremacy·海边重奏", {
    yuno: "seaside",
    delayedArea: true,
    damage: 22,
    warning: 500,
    areaRadius: 135,
    reach: 420,
    vertical: 240,
    stun: 650,
    push: 60,
    start: 160,
    end: 180,
    duration: 480,
    recast: 3200,
  });
  MOVES.mewtype_13_virtual_guard = {
    ownerCharacter: 13,
    form: "virtual",
    yuno: "band",
    name: "最棒的乐队·合奏屏障",
    command: "↓＋I",
    slot: "i",
    visualSlot: "skill-i",
    ground: true,
    cost: 25,
    category: "defense",
    durability: 24,
    lifetime: 2000,
    recast: 6000,
    damage: 0,
    duration: 400,
    start: 120,
    end: 140,
  };
}
export function registerWave(MOVES: Record<string, Move>): void {
  registerWaveTemplate(
    MOVES,
    13,
    {
      name: "迈向世界·混音声波",
      damage: 14,
      speed: 560,
      radiusX: 28,
      radiusY: 60,
      maxReach: 780,
      start: 210,
      duration: 680,
    },
    { yuno: "wave" },
  );
}
export function registerSuper(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  const duration = 2800;
  const damages = [8, 12, 28];
  const pulses: Pulse[] = createSuperPulses(duration, damages);
  add(13, "super", "最高のバンド·世界へ", {
    category: "super",
    duration,
    start: 500,
    end: pulses.at(-1)!.at + 90,
    damage: 48,
    invuln: 100,
    reach: 420,
    vertical: 300,
    pulses,
    yuno: "world" as const,
  });
  MOVES[`mewtype_${13}_virtual_super`].omni = true;
}
