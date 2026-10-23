import type { Assets, CharacterArt } from "../../../game/objects/Assets";
type AssetManifest = Omit<Assets, "characters"> & {
  characters: (CharacterArt | { id: number; key: string; portrait: string })[];
};

/** Later bands store their atlases by form; hydrate a uniform runtime character view. */
export function hydrateAssets(value: AssetManifest): Assets {
  if (value.characters?.length !== 15 || value.stages?.length !== 15)
    throw new Error("素材清单不完整。");
  const characters = value.characters.map((character, id) => {
    const base =
      id < 5
        ? (character as CharacterArt)
        : (id >= 10 ? value.mewtypeForms : value.mujicaForms)[id]?.[
            id >= 10 ? "virtual" : "normal"
          ];
    if (!base?.atlas || !base.frames?.length || !character.portrait)
      throw new Error(`角色 ${id + 1} 的素材不完整。`);
    return { ...base, ...character };
  });
  return { ...value, characters };
}
export async function loadAssets(signal: AbortSignal): Promise<Assets> {
  const response = await fetch("/assets.json", { signal });
  if (!response.ok) throw new Error("无法读取角色与场地素材。");
  return hydrateAssets((await response.json()) as AssetManifest);
}
