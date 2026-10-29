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
}: {
  assets: Assets;
  character: number;
  children?: ReactNode;
  compact?: boolean;
}) {
  const [stageForm, setStageForm] = useState(false);
  const profile = ROSTER[character];
  const scheme = schemeFor({ character, stageForm });
  return (
    <aside className="grid min-w-0 grid-cols-[120px_minmax(0,1fr)] self-start overflow-hidden rounded-none bg-white/40 sm:block">
      <div
        className={`relative min-h-0 overflow-hidden bg-linear-to-br from-[#d1d5c3]/30 via-transparent to-[#dab2bb]/20 ${compact ? "h-[clamp(100px,20dvh,200px)]" : "h-[clamp(120px,25dvh,280px)]"}`}
      >
        <img
          src={
            bandPortrait(assets, character, stageForm ? "stage" : "normal")
              ?.portrait ?? assets.characters[character].portrait
          }
          alt={profile.name}
          className="absolute inset-0 size-full object-contain object-top h-[120%]"
        />
        <span className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-[#f7f3eb] to-transparent" />
      </div>
      <div className="relative min-w-0 p-3">
        <p className="text-[9px] tracking-widest text-[#80786d]">
          {BAND_LABEL[profile.band ?? "mygo"]}
        </p>
        <h2 className="mt-1 text-lg font-medium text-[#211f1a] sm:text-xl">
          {profile.name}
        </h2>
        <p className="mt-2 text-[10px] text-[#80786d] sm:text-xs">
          {profile.role} / {profile.archetype}
        </p>
        {assets.mujicaPortraits[character] && (
          <button
            type="button"
            aria-pressed={stageForm}
            onClick={() => setStageForm(!stageForm)}
            className="mt-2 min-h-11 rounded-none bg-[#30251a]/6 px-3 py-1 text-[10px] focus-visible:outline-2 focus-visible:outline-cyan-200"
          >
            {stageForm ? "演出服" : "常态"} · 切换预览
          </button>
        )}
        {!compact && (
          <dl className="mt-2 space-y-1 text-[10px] sm:text-xs">
            {[...scheme.base, scheme.super].map(
              (move, i) =>
                move && (
                  <div key={move} className="flex items-baseline gap-2  pb-1.5">
                    <dt className="min-w-5 rounded-none bg-[#a44761]/8 text-center font-mono text-[#8f354e]">
                      {["U", "I", "O", "P"][i]}
                    </dt>
                    <dd className="text-[#565045]">{MOVES[move]?.name}</dd>
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
