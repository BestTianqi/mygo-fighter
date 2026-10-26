import { bandFor } from "../../../game/bands";
import type { Atlas, Assets, Portrait } from "../../../game/objects/Assets";
import type { BandId } from "../../../game/objects/BandId";

type FormAtlases = Pick<Assets, "mujicaForms" | "mewtypeForms">;
type PortraitSources = Pick<
  Assets,
  "mygoPortraits" | "mewtypePortraits" | "mujicaPortraits"
>;

/** Form a band hydrates default artwork from; MyGO owns one flat character atlas. */
const BASE_FORM: Record<BandId, string | null> = {
  mygo: null,
  mujica: "normal",
  mewtype: "virtual",
};

/** Per-form atlas registry for bands that store artwork by form. */
function formAtlases(
  assets: FormAtlases,
  band: BandId,
  character: number,
): Record<string, Atlas> | undefined {
  if (band === "mujica") return assets.mujicaForms[character];
  if (band === "mewtype") return assets.mewtypeForms[character];
  return undefined;
}

/** Extra MyGO sheets that are not part of a character's base atlas. */
function mygoActionAtlases(assets: Assets): Atlas[][] {
  return [
    [
      assets.anonActions,
      assets.anonNormals,
      assets.milkDragon,
      assets.jabActions[0],
    ],
    [assets.soyoActions, assets.soyoTensora, assets.jabActions[1]],
    [assets.tomoriActions, assets.penguin, assets.jabActions[2]],
    [assets.ranaParfaitActions],
    [],
  ];
}

function portraitIdles(
  assets: PortraitSources,
  band: BandId,
  character: number,
): Atlas[] {
  if (band === "mujica")
    return Object.values(assets.mujicaPortraits[character] ?? {}).map(
      (portrait) => portrait.idle,
    );
  const portrait =
    band === "mewtype"
      ? assets.mewtypePortraits?.[character]
      : assets.mygoPortraits?.[character];
  return portrait ? [portrait.idle] : [];
}

/** One form's atlas; MyGO's single atlas ignores the form name. */
export function bandAtlas(
  assets: FormAtlases & Pick<Assets, "characters">,
  character: number,
  form: string,
): Atlas {
  const band = bandFor(character).id;
  return (
    formAtlases(assets, band, character)?.[form] ?? assets.characters[character]
  );
}

/** Default atlas for a manifest entry: the band's base form, or MyGO's own. */
export function bandDefaultAtlas<T extends Atlas>(
  character: number,
  base: T,
  assets: FormAtlases,
): T | Atlas {
  const band = bandFor(character).id;
  const form = BASE_FORM[band];
  if (!form) return base;
  return formAtlases(assets, band, character)?.[form] ?? base;
}

/** Portrait in one form; MyGO and Mewtype keep one portrait per character. */
export function bandPortrait(
  assets: PortraitSources,
  character: number,
  form?: string,
): Portrait | undefined {
  const band = bandFor(character).id;
  if (band === "mygo") return assets.mygoPortraits?.[character];
  if (band === "mewtype") return assets.mewtypePortraits?.[character];
  const portraits = assets.mujicaPortraits[character];
  return (form ? portraits?.[form] : undefined) ?? portraits?.normal;
}

/** Every atlas a character can be drawn from, so the renderer warms them first. */
export function bandAtlases(assets: Assets, character: number): Atlas[] {
  const band = bandFor(character).id;
  const forms = formAtlases(assets, band, character);
  if (forms)
    return [
      ...Object.values(forms),
      ...portraitIdles(assets, band, character),
      ...(assets.mujicaMaskForms[character]
        ? [assets.mujicaMaskForms[character]]
        : []),
      ...(character === 7 ? Object.values(assets.memeCrawlForms) : []),
      ...(character === 6 ? [assets.sakikoCustomerActions] : []),
    ];
  return [
    assets.characters[character],
    ...portraitIdles(assets, band, character),
    ...(mygoActionAtlases(assets)[character] ?? []),
  ];
}
