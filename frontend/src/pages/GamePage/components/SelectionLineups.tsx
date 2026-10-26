import { ROSTER } from "../../../game/engine";
import type { Assets } from "../../../game/objects/Assets";
import { bandPortrait } from "../functions/bandArt";

const orders = ["先锋", "中坚", "大将"];
export function SelectionLineups({
  assets,
  teams,
  active,
  labels,
  statuses,
  onSlot,
  onClear,
  isDisabled,
}: {
  assets: Assets;
  teams: (number | null)[][];
  active: number[] | null;
  labels: string[];
  statuses?: string[];
  onSlot?: (side: number, slot: number) => void;
  onClear?: (side: number, slot: number) => void;
  isDisabled?: (side: number, slot: number) => boolean;
}) {
  return (
    <div className="mb-6 grid min-w-0 grid-cols-2 gap-2 sm:gap-4">
      {teams.map((team, side) => (
        <section
          key={side}
          className="min-w-0 rounded-2xl border border-white/10 bg-white/3 p-2.5 sm:p-4"
          aria-label={`${side + 1}P 出战阵容`}
        >
          <h2
            className={`mb-3 flex flex-wrap items-center justify-between gap-1 text-xs font-bold ${side === 0 ? "text-pink-200" : "text-cyan-200"}`}
          >
            <span>{labels[side]}</span>
            <small className="text-[9px] font-normal text-slate-400">
              {statuses?.[side] ?? "出战顺序"}
            </small>
          </h2>
          <div
            className={`grid min-w-0 gap-1.5 sm:gap-2 ${team.length === 3 ? "grid-cols-3" : "grid-cols-1"}`}
          >
            {team.map((id, slot) => {
              const selected = active?.[0] === side && active?.[1] === slot;
              return (
                <div key={slot} className="relative min-w-0">
                  <button
                    type="button"
                    disabled={!onSlot || isDisabled?.(side, slot)}
                    onClick={() => onSlot?.(side, slot)}
                    onDoubleClick={() => onClear?.(side, slot)}
                    aria-label={`${side + 1}P ${team.length === 3 ? orders[slot] : "出战角色"}：${id === null ? "未选择" : ROSTER[id].name}`}
                    aria-pressed={selected}
                    className={`relative flex h-24 w-full min-w-0 touch-manipulation flex-col justify-end overflow-hidden rounded-lg border text-center disabled:cursor-default focus-visible:outline-2 focus-visible:outline-cyan-200 sm:h-28 ${selected ? (side === 0 ? "border-pink-200 bg-pink-200/10" : "border-cyan-200 bg-cyan-200/10") : "border-white/10 bg-slate-900/50"}`}
                  >
                    {id !== null ? (
                      <img
                        src={
                          bandPortrait(assets, id)?.face ??
                          assets.characters[id].portrait
                        }
                        alt=""
                        className="absolute inset-0 size-full object-cover object-center"
                      />
                    ) : (
                      <span className="absolute inset-0 grid place-items-center text-xl text-slate-500">
                        +
                      </span>
                    )}
                    <span
                      className={`absolute inset-x-0 top-0 bg-slate-950/70 px-0.5 py-1 text-[8px] sm:text-[10px] ${side === 0 ? "text-pink-200" : "text-cyan-200"}`}
                    >
                      {team.length === 3 ? orders[slot] : "出战角色"}
                    </span>
                    <span className="relative block w-full truncate bg-linear-to-t from-slate-950 via-slate-950/90 to-transparent px-0.5 pt-5 pb-2 text-[9px] sm:text-xs">
                      {id === null ? "待选" : ROSTER[id].name}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
