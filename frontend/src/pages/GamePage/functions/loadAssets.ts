import type { Assets, CharacterArt } from "../../../game/objects/Assets";
import { ROSTER } from "../../../game/data/roster";
import { bandDefaultAtlas } from "./bandArt";
type AssetManifest = Omit<Assets, "characters"> & {
  characters: (CharacterArt | { id: number; key: string; portrait: string })[];
};

/** Bands that store atlases by form hydrate through the registry, MyGO uses its own. */
export function hydrateAssets(value: AssetManifest): Assets {
  if (value.characters?.length !== ROSTER.length || value.stages?.length !== 15)
    throw new Error("素材清单不完整。");
  const characters = value.characters.map((character, id) => {
    const base = bandDefaultAtlas(id, character as CharacterArt, value);
    if (!base?.atlas || !base.frames?.length || !character.portrait)
      throw new Error(`角色 ${id + 1} 的素材不完整。`);
    return { ...base, ...character };
  });
  return { ...value, characters };
}
export async function loadAssets(signal: AbortSignal): Promise<Assets> {
  const base = new URL(import.meta.env.BASE_URL, document.baseURI);
  const response = await fetch(new URL("assets.json", base), { signal });
  if (!response.ok) throw new Error("无法读取角色与场地素材。");
  // The source manifest keeps stable root-relative media names. Resolve every
  // nested atlas, portrait, recording and video against the deployed app path.
  const manifest: AssetManifest = JSON.parse(
    await response.text(),
    (_key, value: unknown) =>
      typeof value === "string" && value.startsWith("/media/")
        ? new URL(value.slice(1), base).href
        : value,
  );
  return hydrateAssets(manifest);
}
