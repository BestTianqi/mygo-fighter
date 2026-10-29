import type { Move, Pulse } from "../../../../objects/Move";
import { createSuperPulses } from "../../../shared/superPulses";
import { createMoveRegistrar, missile } from "../../shared/createMoveRegistrar";
import { registerNormals as registerNormalTemplate } from "../../shared/registerNormals";
import { registerWave as registerWaveTemplate } from "../../shared/registerWave";
export function registerNormals(MOVES: Record<string, Move>): void {
  registerNormalTemplate(MOVES, 10, [
    "扩音点拍",
    "抬肘应援",
    "高音上挑",
    "扩音重唱",
  ]);
}
export function registerSkills(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  add(10, "u", "梦想就是力量·星光声弹", {
    ...missile,
    arale: "star",
    damage: 16,
    height: 135,
    projectileVy: 240,
    projectileGravity: 640,
    radiusX: 28,
    radiusY: 55,
    maxReach: 650,
    lifetime: 1300,
    start: 140,
    end: 180,
    recast: 1200,
  });
  add(10, "i", "往事翻篇·现在加油", {
    arale: "resolve",
    category: "defense",
    damage: 0,
    durability: 24,
    lifetime: 2000,
    recast: 6000,
    start: 120,
    end: 150,
    duration: 450,
  });
  add(10, "o", "行动起来·破局突进", {
    arale: "action",
    damage: 24,
    movement: 240,
    movementEnd: 280,
    reach: 180,
    vertical: 190,
    start: 180,
    end: 300,
    duration: 650,
    stun: 420,
    push: 260,
    recast: 1800,
  });
}
export function registerWave(MOVES: Record<string, Move>): void {
  registerWaveTemplate(
    MOVES,
    10,
    {
      name: "用歌声对话·直线音波",
      damage: 14,
      speed: 600,
      radiusX: 34,
      radiusY: 48,
      maxReach: 850,
      start: 170,
      duration: 640,
    },
    { arale: "voice" },
  );
}
export function registerSuper(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  const duration = 3000;
  const damages = [8, 12, 28];
  const pulses: Pulse[] = createSuperPulses(duration, damages);
  add(10, "super", "梦限大·无数次做梦", {
    category: "super",
    duration,
    start: 500,
    end: pulses.at(-1)!.at + 90,
    damage: 48,
    invuln: 100,
    reach: 420,
    vertical: 300,
    pulses,
    arale: "dream" as const,
    projectile: true,
    shots: pulses.map((p) => p.at),
    speed: 600,
    lifetime: 600,
    height: 100,
    radiusX: 32,
    radiusY: 250,
  });
}
