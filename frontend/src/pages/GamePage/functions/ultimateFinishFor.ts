import type { Assets } from "../../../game/objects/Assets";
import type { FighterIdentity } from "../../../game/objects/Fighter";

/** Use the lethal attack's captured form, even after the round clears transformations. */
export function ultimateFinishFor(assets: Assets, fighter: FighterIdentity) {
  const forms = assets.ultimateFinishes?.[fighter.character];
  const form = fighter.stageForm
    ? "stage"
    : fighter.penguin
      ? "penguin"
      : "normal";
  return forms?.[form] ?? forms?.normal;
}
