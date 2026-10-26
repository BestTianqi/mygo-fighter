import { useState, type ReactNode } from "react";
import { ROSTER, MOVES } from "../../../game/engine";
import { schemeFor } from "../../../game/controls";
import type { Assets } from "../../../game/objects/Assets";
import { BAND_LABEL } from "../../../game/objects/BandId";
import { bandPortrait } from "../functions/bandArt";

/** The same character art and move preview serves local and online selection. */
export function CharacterPortraitPreview({
  assets,
  character,
  children,
}: {
  assets: Assets;
  character: number;
  children?: ReactNode;
}) {
  const [stageForm, setStageForm] = useState(false);
  const profile = ROSTER[character];
  const scheme = schemeFor({ character, stageForm });
  return (
    <aside className="grid min-w-0 grid-cols-[110px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-white/10 bg-linear-to-b from-indigo-900/30 to-slate-900 sm:grid-cols-[170px_minmax(0,1fr)] lg:block">
      <div className="relative min-h-56 overflow-hidden lg:h-72">
        <img
          src={
            bandPortrait(assets, character, stageForm ? "stage" : "normal")
              ?.portrait ?? assets.characters[character].portrait
          }
          alt={profile.name}
          className="size-full object-contain object-top"
        />
        <span className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-slate-900 to-transparent" />
      </div>
      <div className="relative min-w-0 p-4 lg:p-5">
        <p className="text-[9px] tracking-widest text-slate-400">
          {BAND_LABEL[profile.band ?? "mygo"]}
        </p>
        <h2
          className="mt-1 text-xl font-bold sm:text-2xl"
          style={{ color: profile.color }}
        >
          {profile.name}
        </h2>
        <p className="mt-2 text-[10px] text-slate-400 sm:text-xs">
          {profile.role} / {profile.archetype}
        </p>
        {assets.mujicaPortraits[character] && (
          <button
            type="button"
            aria-pressed={stageForm}
            onClick={() => setStageForm(!stageForm)}
            className="mt-2 min-h-8 rounded-full border border-white/20 px-3 py-1 text-[10px] focus-visible:outline-2 focus-visible:outline-cyan-200"
          >
            {stageForm ? "演出服" : "常态"} · 切换预览
          </button>
        )}
        <dl className="mt-3 space-y-1.5 text-[10px] sm:text-xs">
          {[...scheme.base, scheme.super].map(
            (move, i) =>
              move && (
                <div key={move} className="flex gap-3">
                  <dt className="font-mono text-pink-200">
                    {["U", "I", "O", "P"][i]}
                  </dt>
                  <dd className="text-slate-300">{MOVES[move]?.name}</dd>
                </div>
              ),
          )}
        </dl>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </aside>
  );
}
