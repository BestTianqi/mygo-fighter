import type { Assets } from "../../../game/objects/Assets";
import type { FighterIdentity } from "../../../game/objects/Fighter";
import { bandPortrait } from "./bandArt";

/** One source choice for both preloading and the result cut-in. */
export function finishArtFor(assets: Assets, fighter: FighterIdentity) {
  const id = fighter.character;
  return (
    assets.finishArts?.[id] ??
    (id === 1
      ? assets.soyoFinishArt
      : id === 7
        ? assets.uikaFinishArt
        : (bandPortrait(assets, id, fighter.stageForm ? "stage" : "normal")
            ?.portrait ?? assets.characters[id].portrait))
  );
}
