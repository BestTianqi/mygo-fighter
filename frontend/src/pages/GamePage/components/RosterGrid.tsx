import { ROSTER } from "../../../game/engine";
import { BAND_LABEL } from "../../../game/objects/BandId";
import type { Assets } from "../../../game/objects/Assets";
import { bandPortrait } from "../functions/bandArt";

/** Square face cards keep the local and online rosters visually identical. */
export function RosterGrid({
  assets,
  preview,
  onPreview,
  onChoose,
  disabled = false,
  isDisabled,
  bans = [],
  teams = [],
}: {
  assets: Assets;
  preview: number;
  onPreview: (id: number) => void;
  onChoose: (id: number) => void;
  disabled?: boolean;
  isDisabled?: (id: number) => boolean;
  bans?: number[];
  teams?: (number | null)[][];
}) {
  return (
    <div
      className="grid min-w-0 grid-cols-4 content-start gap-1.5 self-start min-[600px]:grid-cols-8"
      aria-label="全部角色"
    >
      {ROSTER.map((character, id) => {
        const banned = bans.includes(id);
        const sides = teams.flatMap((team, side) =>
          team.includes(id) ? [side] : [],
        );
        return (
          <button
            type="button"
            key={id}
            disabled={disabled || banned || isDisabled?.(id)}
            onFocus={() => onPreview(id)}
            onMouseEnter={() => onPreview(id)}
            onClick={() => onChoose(id)}
            aria-label={`${banned ? "已禁用" : "选择"}${character.name}`}
            aria-pressed={preview === id}
            className={`group relative h-[clamp(56px,8dvh,80px)] min-[600px]:h-[clamp(64px,11dvh,112px)] [@media(max-height:500px)]:h-14 min-w-0 touch-manipulation overflow-hidden rounded-none text-center text-white transition motion-safe:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 ${preview === id ? "bg-[#a44761]/10 shadow-[0_6px_20px_#a4476130] opacity-100" : "bg-[#30251a]/4 opacity-80 hover:opacity-100"}`}
          >
            <img
              src={
                bandPortrait(assets, id)?.face ?? assets.characters[id].portrait
              }
              alt=""
              loading="lazy"
              className={`absolute inset-0 size-full object-cover object-center ${banned ? "grayscale" : ""}`}
            />
            <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-slate-950 via-slate-950/85 to-transparent px-1 pt-6 pb-1.5">
              <span className="block truncate text-center text-[9px] font-bold sm:text-[11px]">
                {character.name}
              </span>
              <small className="block truncate text-center text-[7px] text-slate-400 sm:text-[8px]">
                {BAND_LABEL[character.band ?? "mygo"]}
              </small>
            </span>
            {banned ? (
              <span className="absolute inset-x-0 top-2 bg-slate-950/80 py-1 text-[10px] font-bold tracking-widest text-pink-200">
                已禁用
              </span>
            ) : (
              <span className="absolute top-1 left-1 flex gap-1">
                {sides.map((side) => (
                  <span
                    key={side}
                    className={`rounded-none px-1.5 py-0.5 text-[9px] font-bold text-slate-950 ${side === 0 ? "bg-pink-200" : "bg-cyan-200"}`}
                  >
                    {side + 1}P
                  </span>
                ))}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
