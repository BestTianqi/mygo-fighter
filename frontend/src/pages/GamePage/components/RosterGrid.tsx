import { ROSTER } from "../../../game/engine";
import { bandFor } from "../../../game/bands";
import type { Assets } from "../../../game/objects/Assets";
import { bandPortrait } from "../functions/bandArt";

const labels = { mygo: "MyGO!!!!!", mujica: "Ave Mujica", mewtype: "MewType" };

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
      className="grid min-w-0 grid-cols-3 content-start gap-2 self-start sm:grid-cols-5"
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
            className={`group relative aspect-square min-w-0 touch-manipulation overflow-hidden rounded-xl border text-center transition motion-safe:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 ${preview === id ? "border-white/70 bg-white/10" : "border-white/10 bg-white/3"}`}
          >
            <img
              src={
                bandPortrait(assets, id)?.face ?? assets.characters[id].portrait
              }
              alt=""
              loading="lazy"
              className={`absolute inset-0 size-full object-cover object-center ${banned ? "grayscale" : ""}`}
            />
            <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-slate-950 via-slate-950/85 to-transparent px-1 pt-7 pb-2">
              <span className="block truncate text-center text-[10px] font-medium sm:text-xs">
                {character.name}
              </span>
              <small className="block truncate text-center text-[8px] text-slate-400 sm:text-[9px]">
                {labels[bandFor(id).id]}
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
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold text-slate-950 ${side === 0 ? "bg-pink-200" : "bg-cyan-200"}`}
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
