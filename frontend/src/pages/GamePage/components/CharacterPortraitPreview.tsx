import { useState, type ReactNode } from "react";
import { bandPortrait } from "../../../assets/bandArt";
import type { Assets } from "../../../assets/objects/Assets";
import { schemeFor } from "../../../game/controls";
import { MOVES, ROSTER } from "../../../game/engine";
import { BAND_LABEL } from "../../../game/objects/BandId";

/** The same character art and move preview serves local and online selection. */
export function CharacterPortraitPreview({
  assets,
  character,
  children,
  compact = false,
  fillHeight = false,
}: {
  assets: Assets;
  character: number;
  children?: ReactNode;
  compact?: boolean;
  fillHeight?: boolean;
}) {
  const [stageForm, setStageForm] = useState(false);
  const profile = ROSTER[character];
  const scheme = schemeFor({ character, stageForm });
  return (
    <aside
      className={`grid min-w-0 grid-cols-[120px_minmax(0,1fr)] overflow-hidden rounded-none bg-panel ${fillHeight ? "h-full sm:flex sm:flex-col" : "self-start sm:block"}`}
    >
      <div
        className={`relative overflow-hidden bg-panel ${fillHeight ? "min-h-40 flex-1" : compact ? "h-[clamp(100px,20dvh,200px)]" : "h-[clamp(120px,25dvh,280px)]"}`}
      >
        <img
          src={
            bandPortrait(assets, character, stageForm ? "stage" : "normal")
              ?.portrait ?? assets.characters[character].portrait
          }
          alt={profile.name}
          className="absolute inset-0 size-full object-contain object-top h-[120%]"
        />
        <span className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-panel to-transparent" />
      </div>
      <div className="relative min-w-0 shrink-0 p-3">
        <p className="text-[9px] tracking-widest text-muted">
          {BAND_LABEL[profile.band ?? "mygo"]}
        </p>
        <h2 className="mt-1 text-lg font-medium text-ivory sm:text-xl">
          {profile.name}
        </h2>
        <p className="mt-2 text-[10px] text-muted sm:text-xs">
          {profile.role} / {profile.archetype}
        </p>
        {assets.mujicaPortraits[character] && (
          <button
            type="button"
            aria-pressed={stageForm}
            aria-label="切换角色形态预览"
            onClick={() => setStageForm(!stageForm)}
            className="mt-2 min-h-11 rounded-none bg-raised px-3 py-1 text-[10px] focus-visible:outline-2 focus-visible:outline-ember"
          >
            {stageForm ? "演出服" : "常态"}
          </button>
        )}
        {!compact && (
          <dl className="mt-2 space-y-1 text-[10px] sm:text-xs">
            {[...scheme.base, scheme.super].map(
              (move, i) =>
                move && (
                  <div key={move} className="flex items-baseline gap-2 pb-1.5">
                    <dt className="min-w-5 rounded-none bg-crimson/25 text-center font-mono text-ember">
                      {["U", "I", "O", "P"][i]}
                    </dt>
                    <dd className="text-muted">{MOVES[move]?.name}</dd>
                  </div>
                ),
            )}
          </dl>
        )}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </aside>
  );
}
