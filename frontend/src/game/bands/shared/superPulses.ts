import type { Pulse } from "../../objects/Move";
/** Shared pulse spacing; authored damage, timing overrides and effects stay with the form. */
export function createSuperPulses(
  duration: number,
  damages: number[],
  glyphs?: string,
): Pulse[] {
  return damages.map((damage, i) => ({
    at:
      Math.round((500 + (i * (duration - 1100)) / (damages.length - 1)) / 10) *
      10,
    damage,
    reach: Math.min(420, 220 + i * 100),
    stun: 400,
    push: i === damages.length - 1 ? 240 : 15,
    ...(glyphs ? { glyph: glyphs[i] } : {}),
  }));
}
