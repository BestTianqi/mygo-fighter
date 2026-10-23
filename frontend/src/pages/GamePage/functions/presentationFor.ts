import type { Assets, Presentation } from "../../../game/objects/Assets";
import type { FighterIdentity } from "../../../game/objects/Fighter";
import type { Scheme } from "../../../game/objects/Scheme";
import { schemeFor } from "../../../game/controls";
export function presentationFor(
  assets: Assets,
  fighter: FighterIdentity,
  attack: string | null,
  scheme: Scheme = schemeFor(fighter),
): Presentation | null {
  const media = assets.memeSkills[String(fighter.character)];
  if (!media || !attack) return null;
  const slot =
    attack === scheme.super
      ? "p"
      : attack === scheme.transform
        ? "h"
        : (["u", "i", "o"][scheme.base.indexOf(attack)] ??
          ["u", "i", "o"][
            Number(
              Object.entries(scheme.variants)
                .find(([, move]) => move === attack)?.[0]
                .slice(-1),
            ) - 1
          ]);
  const variants = media.variants ?? {};
  const variant =
    fighter.stageForm && variants["stage_" + attack]
      ? "stage_" + attack
      : attack;
  const entry = variants[variant] ?? media.slots?.[slot];
  if (!entry) return null;
  const referenced = entry.videoRef
    ? assets[entry.videoRef as keyof Assets]
    : undefined;
  return {
    ...entry,
    ...(typeof referenced === "string" ? { video: referenced } : {}),
    slot: slot ?? entry.slot ?? null,
  };
}
