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
    <div className="mb-2 grid min-w-0 grid-cols-2 gap-2">
      {teams.map((team, side) => (
        <section
          key={side}
          className={`min-w-0 rounded-none p-2 [@media(max-height:500px)]:p-1 ${active?.[0] === side ? (side === 0 ? "bg-[#a44761]/8" : "bg-[#2a5f5a]/8") : "bg-[#30251a]/4"}`}
          aria-label={`${side + 1}P 出战阵容`}
        >
          <h2
            className={`mb-1 flex flex-wrap items-center justify-between gap-1 text-xs font-bold [@media(max-height:500px)]:sr-only ${side === 0 ? "text-[#8f354e]" : "text-[#2a5f5a]"}`}
          >
            <span>{labels[side]}</span>
            <small className="text-[9px] font-normal text-[#80786d]">
              {statuses?.[side] ??
                (active?.[0] === side ? "正在选择" : "出战阵容")}
            </small>
          </h2>
          <div
            className={`grid min-w-0 gap-1.5 sm:gap-2 ${team.length === 3 ? "grid-cols-3" : "grid-cols-1"}`}
          >
            {team.map((id, slot) => {
              const selected = active?.[0] === side && active?.[1] === slot;
              return (
                <div key={slot} className="relative min-w-0">
                  <p
                    className={`hidden text-[9px] sm:block [@media(max-height:500px)]:hidden ${side === 0 ? "text-[#8f354e]/80" : "text-[#2a5f5a]/80"}`}
                  >
                    {team.length === 3 ? orders[slot] : "出战角色"}
                  </p>
                  <button
                    type="button"
                    disabled={!onSlot || isDisabled?.(side, slot)}
                    onClick={() => onSlot?.(side, slot)}
                    onDoubleClick={() => onClear?.(side, slot)}
                    aria-label={`${side + 1}P ${team.length === 3 ? orders[slot] : "出战角色"}：${id === null ? "未选择" : ROSTER[id].name}`}
                    aria-pressed={selected}
                    className={`relative flex h-[clamp(44px,8dvh,76px)] w-full min-w-0 touch-manipulation overflow-hidden rounded-none ${team.length === 1 ? "flex-row items-center gap-3 px-2 text-left" : "flex-col justify-end text-center"} disabled:cursor-default focus-visible:outline-2 focus-visible:outline-cyan-200  ${selected ? (side === 0 ? "bg-[#a44761]/12" : "bg-[#2a5f5a]/12") : "bg-[#30251a]/4"}`}
                  >
                    <span className="absolute left-1 top-0 z-10 hidden text-[8px] text-white [@media(max-height:500px)]:block">
                      {side + 1}P
                    </span>
                    {id !== null ? (
                      <img
                        src={
                          bandPortrait(assets, id)?.face ??
                          assets.characters[id].portrait
                        }
                        alt=""
                        className={
                          team.length === 1
                            ? "h-full w-12 shrink-0 rounded-none object-cover object-center"
                            : "absolute inset-0 size-full object-cover object-center"
                        }
                      />
                    ) : (
                      <span
                        className={
                          team.length === 1
                            ? "grid size-10 shrink-0 place-items-center rounded-none bg-[#30251a]/5 text-xl text-[#80786d]"
                            : "absolute inset-0 grid place-items-center text-xl text-[#80786d]"
                        }
                      >
                        +
                      </span>
                    )}
                    <span
                      className={
                        team.length === 1
                          ? "relative min-w-0 truncate pr-6 text-[11px] font-medium text-[#565045] sm:text-sm"
                          : "relative block w-full truncate bg-linear-to-t from-slate-950 via-slate-950/90 to-transparent px-0.5 pt-5 pb-2 text-[9px] text-white sm:text-xs"
                      }
                    >
                      {id === null ? "待选" : ROSTER[id].name}
                    </span>
                  </button>
                  {id !== null && onClear && !isDisabled?.(side, slot) && (
                    <button
                      type="button"
                      onClick={() => onClear(side, slot)}
                      aria-label={`移除 ${labels[side]} ${ROSTER[id].name}`}
                      className="absolute right-0 top-4 grid size-8 place-items-center rounded-none bg-[#30251a]/6 text-sm text-[#565045] hover:bg-[#a44761] hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-200"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
