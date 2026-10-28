import type { Move } from "../../objects/Move";

/** Authored combat timings deliberately differ from recorded video durations. */
export function tuneMewtype(MOVES: Record<string, Move>): void {
  const arale = MOVES.mewtype_10_virtual_super;
  Object.assign(arale, {
    duration: 1060,
    start: 100,
    end: 650,
    damage: 40,
    fixedDamage: true,
    hitstop: 30,
    shots: [100, 340, 580],
    pulses: arale.pulses!.map((pulse, i) => ({
      ...pulse,
      at: 100 + i * 240,
      damage: [10, 12, 18][i],
    })),
    homing: true,
    speed: 920,
    lifetime: 1800,
    height: 110,
    radiusX: 46,
    radiusY: 140,
    maxReach: 1200,
    reach: 1200,
  });
  const ritsu = MOVES.mewtype_11_virtual_super;
  Object.assign(ritsu, {
    duration: 1000,
    start: 80,
    end: 730,
    damage: 50,
    fixedDamage: true,
    reach: 500,
    vertical: 420,
    movementEnd: 750,
    pulses: ritsu.pulses!.map((pulse, i) => ({
      ...pulse,
      at: 80 + i * 150,
      damage: 10,
      reach: 320 + i * 45,
      stun: 340,
      push: i === 4 ? pulse.push : 0,
      ...(i === 4 ? { knockdown: 600 } : {}),
    })),
  });
  const yuno = MOVES.mewtype_13_virtual_super;
  Object.assign(yuno, {
    duration: 1120,
    start: 160,
    end: 820,
    damage: 50,
    fixedDamage: true,
    reach: 600,
    vertical: 420,
    pulses: yuno.pulses!.map((pulse, i) => ({
      ...pulse,
      at: 160 + i * 300,
      damage: [10, 15, 25][i],
      reach: 360 + i * 120,
      stun: 360,
      push: i === 2 ? pulse.push : 0,
      ...(i === 2 ? { knockdown: 650 } : {}),
    })),
  });
}
