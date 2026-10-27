import type { Band } from "../../objects/Band";
import type { Fighter } from "../../objects/Fighter";
import type { Input } from "../../objects/Input";

/**
 * Unified-mode skill resolution: scheme base slots plus directional variants.
 * Bands with extra unified commands (MyGO's forward-heavy overhead) add a
 * `skill` hook that is tried after the scheme, matching the original order.
 */
export function resolveSchemeSkill(
  band: Band,
  f: Fighter,
  input: Input,
  pressed: (key: string) => boolean,
  airborne: boolean,
): string | null | undefined {
  // Most fixed steps only move or use normals. Build the form's skill scheme
  // only when a skill is actually pressed (especially important in GraalJS).
  if (pressed("super")) return band.schemeFor(f).super || null;
  if (pressed("transform")) {
    const transform = band.schemeFor(f).transform;
    if (transform) return (!f.penguin && transform) || null;
  }
  for (let i = 1; i <= 3; i++)
    if (pressed("skill" + i)) {
      const scheme = band.schemeFor(f);
      const gesture = input.pressDirections?.["skill" + i] || input;
      const horizontal =
        (Number(!!gesture.right) - Number(!!gesture.left)) * f.facing;
      const direction = gesture.crouch
        ? "down"
        : horizontal > 0
          ? "forward"
          : horizontal < 0
            ? "back"
            : "";
      if (airborne && direction === "down" && scheme.variants["airDown" + i])
        return scheme.variants["airDown" + i];
      if (scheme.variants[direction + i]) return scheme.variants[direction + i];
      if (direction === "forward" && i === 3) return "throw";
      return scheme.base[i - 1];
    }
  return band.skill?.(f, input, pressed, airborne);
}
