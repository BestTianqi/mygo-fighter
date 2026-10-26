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
  const scheme = band.schemeFor(f);
  if (pressed("super")) return scheme.super || null;
  if (pressed("transform") && scheme.transform)
    return (!f.penguin && scheme.transform) || null;
  for (let i = 1; i <= 3; i++)
    if (pressed("skill" + i)) {
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
      if (
        (direction === "back" && i === 1) ||
        (direction === "forward" && i === 3)
      )
        return "throw";
      return scheme.base[i - 1];
    }
  return band.skill?.(f, input, pressed, airborne);
}
