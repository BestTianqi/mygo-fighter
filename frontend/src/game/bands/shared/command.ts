import type { Band } from "../../objects/Band";

/**
 * Form-specific normals share the authored standing J chain. Throws are
 * universal; skill slots are handled earlier by `resolveSchemeSkill`.
 */
export function schemeCommand(
  normalFor: Band["normalFor"],
  prefixFor: Band["prefixFor"],
): NonNullable<Band["command"]> {
  return (match, f, requested, input) => {
    const stance = !match.grounded(f)
      ? "air"
      : input.crouch
        ? "crouch"
        : "standing";
    if (requested === "light" && stance === "standing") {
      const prefix = prefixFor(f);
      if (f.attack === normalFor(f, "light")) return `${prefix}Jab2`;
      if (f.attack === `${prefix}Jab2`) return `${prefix}Jab3`;
    }
    if (requested === "light" || requested === "heavy")
      return normalFor(f, requested, stance);
    if (requested === "throw") return "throw";
    return null;
  };
}
