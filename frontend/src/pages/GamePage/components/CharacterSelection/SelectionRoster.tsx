import type { Assets } from "../../../../assets/objects/Assets";
import { ROSTER } from "../../../../game/engine";
import { CharacterPortraitPreview } from "../CharacterPortraitPreview";
import { RosterGrid } from "../RosterGrid";
import { SelectionLineups } from "../SelectionLineups";
import type { CharacterSelectionModel } from "./hooks/useCharacterSelection";

export function SelectionRoster({
  model,
  assets,
}: {
  model: Pick<
    CharacterSelectionModel,
    | "selection"
    | "preview"
    | "error"
    | "complete"
    | "brawl"
    | "labels"
    | "setPreview"
    | "selectSlot"
    | "clearSlot"
    | "restartDraft"
    | "chooseCharacter"
  >;
  assets: Assets;
}) {
  const { selection, preview, error, complete, brawl, labels, setPreview } =
    model;
  const picked = selection.teams.flat().filter((id) => id !== null).length;
  const total = selection.teams.flat().length;
  const status = complete
    ? "阵容已就绪。可调整场地与规则，或直接登台。"
    : selection.phase === "ban"
      ? `轮到 ${labels[selection.active[0]]} 禁用第 ${Math.floor(selection.bans.length / 2) + 1} 名角色，点击下方头像。`
      : `为 ${labels[selection.active[0]]} 选择第 ${selection.active[1] + 1} 位角色，点击下方头像。`;
  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(170px,21%)_minmax(0,1fr)] lg:gap-6 [@media(max-height:500px)]:grid-cols-1">
      <div className="hidden lg:block [@media(max-height:500px)]:hidden">
        <CharacterPortraitPreview
          key={preview}
          assets={assets}
          character={preview}
        />
      </div>
      <div className="min-w-0">
        <div
          className={`mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2.5 ${error ? "border-[#bb3266]/30 bg-[#bb3266]/8 text-[#bb3266]" : "border-[#1aa8b8]/20 bg-[#1aa8b8]/6 text-[#101d33]"}`}
        >
          <p className="text-xs leading-5" role="status" aria-live="polite">
            {error || status}
          </p>
          <span className="shrink-0 text-[11px] font-medium tabular-nums text-[#61718b]">
            {selection.phase === "ban"
              ? `${selection.bans.length} / ${selection.rules.banCount * 2} 已禁用`
              : `${picked} / ${total} 已选`}
          </span>
        </div>
        <SelectionLineups
          assets={assets}
          teams={selection.teams}
          active={
            selection.phase === "ban" ||
            (selection.rules.banCount > 0 && complete)
              ? null
              : selection.active
          }
          labels={labels}
          statuses={selection.teams.map((team, side) =>
            team.every((id) => id !== null)
              ? "阵容已就绪"
              : selection.active[0] === side
                ? selection.phase === "ban"
                  ? "正在禁用"
                  : "正在选择"
                : `还差 ${team.filter((id) => id === null).length} 位`,
          )}
          onSlot={model.selectSlot}
          onClear={(side, slot) => model.clearSlot(side, slot)}
          isDisabled={() => selection.rules.banCount > 0}
        />
        {selection.rules.banCount > 0 && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#d9e2ef] bg-white/65 px-3 py-2 text-xs">
            <div className="min-w-0 space-y-1">
              {[0, 1].map((side) => (
                <p
                  key={side}
                  className={side === 0 ? "text-[#bb3266]" : "text-[#16818f]"}
                >
                  {side === 0 ? "1P" : selection.mode === "duel" ? "2P" : "CPU"}{" "}
                  禁用：
                  {Array.from(
                    { length: selection.rules.banCount },
                    (_, slot) => {
                      const id = selection.bans[slot * 2 + side];
                      return id === undefined ? "待禁用" : ROSTER[id].name;
                    },
                  ).join(" / ")}
                </p>
              ))}
            </div>
            <button
              type="button"
              onClick={() => model.restartDraft()}
              className="min-h-11 rounded px-2 text-[#61718b] hover:text-[#bb3266] focus-visible:outline-2 focus-visible:outline-[#1aa8b8]"
            >
              重新禁选
            </button>
          </div>
        )}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 [@media(max-height:500px)]:mb-1">
          <h2 className="text-xs font-semibold text-[#101d33]">
            {selection.phase === "ban" ? "点击头像禁用" : "全部角色"}
          </h2>
          <p className="text-[10px] text-[#61718b]">
            {selection.rules.banCount > 0
              ? "禁选完成后，双方交替选择"
              : "点击阵容中的位置可更换角色"}
          </p>
        </div>
        <RosterGrid
          assets={assets}
          preview={preview}
          onPreview={setPreview}
          teams={selection.teams}
          bans={selection.bans}
          disabled={selection.rules.banCount > 0 && complete}
          isDisabled={(id) =>
            selection.rules.banCount > 0
              ? selection.teams.some((team) => team.includes(id))
              : selection.teams[selection.active[0]].some(
                  (pick, slot) => pick === id && slot !== selection.active[1],
                )
          }
          onChoose={model.chooseCharacter}
        />
        {brawl && (
          <p className="mt-3 rounded-lg bg-white/65 px-3 py-2 text-xs leading-5 text-[#61718b]">
            三人同时登场，各带 3 名角色。击倒后等待 5
            秒由下一名上场，最后存活的一方获胜。
            {selection.mode === "cpu" && "你控制 1P，另外两方由电脑控制。"}
            每队角色不可重复，不同队伍可以选择相同角色。
          </p>
        )}
      </div>
    </div>
  );
}
