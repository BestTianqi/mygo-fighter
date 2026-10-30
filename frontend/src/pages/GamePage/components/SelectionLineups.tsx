import { useEffect, useRef } from "react";
import { bandPortrait } from "../../../assets/bandArt";
import type { Assets } from "../../../assets/objects/Assets";
import { ROSTER } from "../../../game/engine";

const orders = ["先锋", "中坚", "大将"];
const slotLabel = (size: number, slot: number) =>
  size === 1 ? "出战角色" : size === 3 ? orders[slot] : `第 ${slot + 1} 位`;
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
  const lineups = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const slot = lineups.current?.querySelector<HTMLButtonElement>(
      'button[aria-pressed="true"]',
    );
    const track = slot?.parentElement?.parentElement;
    if (!slot || !track || track.scrollWidth <= track.clientWidth) return;
    const card = slot.getBoundingClientRect();
    const viewport = track.getBoundingClientRect();
    if (card.left < viewport.left)
      track.scrollLeft -= viewport.left - card.left;
    else if (card.right > viewport.right)
      track.scrollLeft += card.right - viewport.right;
  }, [active?.[0], active?.[1]]);
  return (
    <div
      ref={lineups}
      className={`mb-4 grid min-w-0 gap-2 sm:gap-3 ${teams.length === 3 ? "grid-cols-1 min-[600px]:grid-cols-3" : "grid-cols-2"}`}
    >
      {teams.map((team, side) => (
        <section
          key={side}
          className={`min-w-0 rounded-xl border p-2 sm:p-3 [@media(max-height:500px)]:p-1.5 ${teams.length === 3 ? "grid grid-cols-[48px_minmax(0,1fr)] items-center gap-2 min-[600px]:block" : ""} ${active?.[0] === side ? (side === 0 ? "border-[#bb3266]/45 bg-[#bb3266]/5" : side === 1 ? "border-[#1aa8b8]/50 bg-[#1aa8b8]/5" : "border-[#647bd4]/45 bg-[#647bd4]/5") : "border-[#d9e2ef] bg-white/70"}`}
          aria-label={`${side + 1}P 出战阵容`}
        >
          <h2
            className={`mb-2 flex flex-wrap items-center justify-between gap-1 text-xs font-bold ${teams.length === 3 ? "max-[599px]:mb-0 max-[599px]:flex-col max-[599px]:text-center" : ""} ${side === 0 ? "text-[#bb3266]" : side === 1 ? "text-[#16818f]" : "text-[#596bbb]"}`}
          >
            <span>{labels[side]}</span>
            <small className="text-[10px] font-normal text-[#61718b]">
              {statuses?.[side] ??
                (active?.[0] === side ? "正在选择" : "出战阵容")}
            </small>
          </h2>
          {team.length > 3 && (
            <p className="mb-1 text-[9px] text-[#61718b] min-[600px]:hidden">
              左右滑动查看 {team.length} 个位置
            </p>
          )}
          <div
            className={`grid min-w-0 justify-items-center gap-1.5 sm:gap-2 ${team.length === 1 ? "grid-cols-1" : team.length === 2 ? "grid-cols-2" : team.length === 3 ? "grid-cols-3" : "auto-cols-[64px] grid-flow-col overflow-x-auto pb-1 [scrollbar-width:thin] min-[600px]:grid-flow-row min-[600px]:grid-cols-4 min-[600px]:overflow-x-visible min-[600px]:pb-0"}`}
          >
            {team.map((id, slot) => {
              const selected = active?.[0] === side && active?.[1] === slot;
              return (
                <div
                  key={slot}
                  className={`relative w-full min-w-0 max-w-28 ${teams.length === 3 ? "max-[599px]:max-w-16" : ""}`}
                >
                  <p className="mb-1 text-center text-[9px] text-[#61718b] [@media(max-height:500px)]:hidden">
                    {slotLabel(team.length, slot)}
                  </p>
                  <button
                    type="button"
                    disabled={!onSlot || isDisabled?.(side, slot)}
                    onClick={() => onSlot?.(side, slot)}
                    onDoubleClick={() => onClear?.(side, slot)}
                    aria-label={`${side + 1}P ${slotLabel(team.length, slot)}：${id === null ? "未选择" : ROSTER[id].name}`}
                    aria-pressed={selected}
                    className={`relative flex aspect-square w-full min-w-0 touch-manipulation flex-col items-center justify-end overflow-hidden rounded-lg border-2 text-center disabled:cursor-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1aa8b8] [@media(max-height:500px)]:mx-auto [@media(max-height:500px)]:max-w-16 ${selected ? (side === 0 ? "border-[#bb3266] bg-[#bb3266]/8" : side === 1 ? "border-[#1aa8b8] bg-[#1aa8b8]/8" : "border-[#647bd4] bg-[#647bd4]/8") : "border-transparent bg-[#d9e2ef]/60"}`}
                  >
                    <span
                      className={`absolute left-1 top-1 z-10 rounded bg-[#101d33]/75 px-1 text-[8px] text-white ${team.length > 3 ? "block" : "hidden [@media(max-height:500px)]:block"}`}
                    >
                      {team.length > 3 ? `第 ${slot + 1} 位` : `${side + 1}P`}
                    </span>
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
                      <span className="absolute inset-0 grid place-items-center pb-5 text-2xl font-light text-[#61718b]">
                        +
                      </span>
                    )}
                    <span
                      className={`relative block w-full truncate px-1 py-1.5 text-[10px] font-medium sm:text-xs ${id === null ? "text-[#61718b]" : "bg-linear-to-t from-[#101d33] via-[#101d33]/90 to-transparent pt-5 text-white"}`}
                    >
                      {id === null
                        ? selected
                          ? "选择角色"
                          : "待选"
                        : ROSTER[id].name}
                    </span>
                  </button>
                  {id !== null && onClear && !isDisabled?.(side, slot) && (
                    <button
                      type="button"
                      onClick={() => onClear(side, slot)}
                      aria-label={`移除 ${labels[side]} ${ROSTER[id].name}`}
                      className="absolute right-0 top-4 z-20 grid size-8 place-items-center rounded-bl-lg rounded-tr-lg bg-[#101d33]/80 text-sm text-white hover:bg-[#bb3266] focus-visible:outline-2 focus-visible:outline-[#1aa8b8]"
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
