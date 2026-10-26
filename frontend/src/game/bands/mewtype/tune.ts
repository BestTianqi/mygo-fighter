import type { Move } from "../../objects/Move";

/** Authored combat timings deliberately differ from recorded video durations. */
export function tuneMewtype(MOVES: Record<string, Move>): void {
  const arale = MOVES.mewtype_10_virtual_super;
  Object.assign(arale, {
    duration: 1200,
    start: 120,
    end: 810,
    hitstop: 30,
    shots: [120, 420, 720],
    pulses: arale.pulses!.map((pulse, i) => ({ ...pulse, at: 120 + i * 300 })),
    speed: 700,
    lifetime: 1400,
    height: 110,
    radiusX: 34,
    radiusY: 100,
    maxReach: 900,
    reach: 900,
  });
}
