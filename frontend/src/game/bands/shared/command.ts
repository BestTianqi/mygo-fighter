import type { Band } from "../../objects/Band";

/**
 * Command resolution for scheme bands: light/heavy map to the band's form
 * prefix, throw is the universal throw, and everything else is a skill slot
 * handled earlier by `resolveSchemeSkill`.
 */
export function schemeCommand(normalFor: Band["normalFor"]): NonNullable<
  Band["command"]
> {
  return (match, f, requested, input) => {
    const stance = !match.grounded(f)
      ? "air"
      : input.crouch
        ? "crouch"
        : "standing";
    if (requested === "light" || requested === "heavy")
      return normalFor(f, requested, stance);
    if (requested === "throw") return "throw";
    return null;
  };
}
