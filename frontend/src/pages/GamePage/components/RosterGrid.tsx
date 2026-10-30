import { bandPortrait } from "../../../assets/bandArt";
import type { Assets } from "../../../assets/objects/Assets";
import { ROSTER } from "../../../game/engine";

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
            className={`group relative h-[clamp(72px,10dvh,100px)] min-[600px]:h-[clamp(80px,13dvh,128px)] [@media(max-height:500px)]:h-16 min-w-0 touch-manipulation overflow-hidden rounded-none text-center text-white transition-colors disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember ${preview === id ? "bg-crimson opacity-100" : "bg-panel opacity-80 hover:opacity-100"}`}
          >
            <img
              src={
                bandPortrait(assets, id)?.face ?? assets.characters[id].portrait
              }
              alt=""
              loading="lazy"
              className={`absolute inset-0 size-full object-cover object-center ${banned ? "grayscale" : ""}`}
            />
            <span
              className={`absolute inset-x-0 bottom-0 px-1 py-1.5 ${preview === id ? "bg-crimson" : "bg-void/85"}`}
            >
              <span className="block truncate text-center text-[9px] font-bold sm:text-[11px]">
                {character.name}
              </span>
            </span>
            {banned ? (
              <span className="absolute inset-x-0 top-2 bg-void/80 py-1 text-[10px] font-bold tracking-widest text-ember">
                已禁用
              </span>
            ) : (
              <span className="absolute top-1 left-1 flex gap-1">
                {sides.map((side) => (
                  <span
                    key={side}
                    className={`rounded-none px-1.5 py-0.5 text-[9px] font-bold text-void ${side === 0 ? "bg-ember" : side === 1 ? "bg-silver" : "bg-gold"}`}
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
