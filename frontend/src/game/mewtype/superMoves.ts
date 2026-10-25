import type { Move, Pulse } from "../objects/Move";
import { createMoveRegistrar } from "./createMoveRegistrar";
import { CHARACTERS } from "./roster";

export function registerSuperMoves(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  const superNames: Record<number, string> = {
    10: "梦限大·无数次做梦",
    11: "饥饿狂战士·开饭啦",
    12: "临兵斗者皆阵列在前",
    13: "最高のバンド·世界へ",
    14: "兔食者·不会放开由乃亲",
  };
  const superDurations: Record<number, number> = {
    10: 3000,
    11: 2200,
    12: 11500,
    13: 2800,
    14: 5150,
  };
  for (const c of CHARACTERS) {
    // Viola's complete kit is authored together in violaMoves.ts.
    if (c.id === 15) continue;
    const duration = superDurations[c.id!];
    const damages =
      c.id === 11
        ? Array(5).fill(10)
        : c.id === 14
          ? Array(6).fill(8)
          : c.id === 12
            ? [...Array(8).fill(5), 10]
            : [8, 12, 28];
    const pulses: Pulse[] = damages.map((damage, i) => ({
      at:
        Math.round(
          (500 + (i * (duration - 1100)) / (damages.length - 1)) / 10,
        ) * 10,
      damage,
      reach: Math.min(420, 220 + i * 100),
      stun: 400,
      push: i === damages.length - 1 ? 240 : 15,
      ...(c.id === 12 ? { glyph: "临兵斗者皆阵列在前"[i] } : {}),
    }));
    if (c.id === 11) {
      pulses.forEach((pulse, i) => {
        pulse.at = 200 + i * 360;
        pulse.reach = 230 + i * 30;
        pulse.stun = 300;
        pulse.push = i === 4 ? 240 : 8;
      });
      pulses.at(-1)!.launch = 300;
    }
    add(c.id!, "super", superNames[c.id!], {
      category: "super",
      duration,
      start: 500,
      end: pulses.at(-1)!.at + 90,
      damage: 48,
      invuln: 100,
      reach: 420,
      vertical: 300,
      pulses,
      ...(c.id === 10
        ? {
            arale: "dream" as const,
            projectile: true,
            shots: pulses.map((p) => p.at),
            speed: 600,
            lifetime: 600,
            height: 100,
            radiusX: 32,
            radiusY: 250,
          }
        : {}),
      ...(c.id === 12
        ? {
            damage: 50,
            targetArea: true,
            targetLock: true,
            areaRadius: 210,
            fixedDamage: true,
            damageReduction: 0.8,
            invuln: 0,
            hitstop: 40,
          }
        : {}),
      ...(c.id === 14 ? { nonoka: "eater" as const } : {}),
      ...(c.id === 13 ? { yuno: "world" as const } : {}),
      ...(c.id === 11
        ? {
            ritsu: "hungry" as const,
            damage: 50,
            start: 200,
            movement: 180,
            movementEnd: 1800,
            hitstop: 50,
          }
        : {}),
    });
    if (c.id === 13) MOVES[`mewtype_${c.id}_virtual_super`].omni = true;
  }
}
