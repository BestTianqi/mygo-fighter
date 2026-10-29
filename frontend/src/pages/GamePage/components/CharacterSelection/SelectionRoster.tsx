import type { Assets } from "../../../../assets/objects/Assets";
import { teamSizeFor } from "../../../../game/battleRules";
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
  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(150px,22%)_minmax(0,1fr)] [@media(max-height:500px)]:grid-cols-1">
      <div className="hidden sm:block [@media(max-height:500px)]:hidden">
        <CharacterPortraitPreview
          key={preview}
          assets={assets}
          character={preview}
        />
      </div>
      <div className="min-w-0">
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
                ? "正在选择"
                : "等待选择",
          )}
          onSlot={model.selectSlot}
          onClear={(side, slot) => model.clearSlot(side, slot)}
          isDisabled={() => selection.rules.banCount > 0}
        />
        {selection.rules.banCount > 0 && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 bg-[#30251a]/4 px-3 py-2 text-xs">
            <div className="min-w-0 space-y-1">
              {[0, 1].map((side) => (
                <p
                  key={side}
                  className={side === 0 ? "text-[#8f354e]" : "text-[#2a5f5a]"}
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
              className="min-h-11 px-2 text-[#80786d] hover:text-[#8f354e]"
            >
              重新禁选
            </button>
          </div>
        )}
        <div className="mb-3 flex items-center justify-between [@media(max-height:500px)]:mb-1">
          <h2 className="text-xs text-[#80786d]">
            {selection.phase === "ban" ? "轮流禁用角色" : "选择阵容"}
          </h2>
          <p className="text-xs text-[#80786d]">
            {selection.phase === "ban"
              ? `${selection.bans.length} / ${selection.rules.banCount * 2} 已禁用`
              : `${selection.teams.flat().filter((id) => id !== null).length} / ${teamSizeFor(selection.format) * selection.teams.length} 已出战`}
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
        <p
          className="mt-3 min-h-9 rounded-none bg-[#a44761]/6 px-3 py-2 text-xs text-[#8f354e]"
          role="status"
        >
          {error ||
            (complete
              ? "阵容已就绪，选择场地后登台。"
              : selection.phase === "ban"
                ? `轮到 ${selection.active[0] === 0 ? "1P" : selection.mode === "duel" ? "2P" : "CPU"} 禁用第 ${Math.floor(selection.bans.length / 2) + 1} 名角色。`
                : `为 ${labels[selection.active[0]]} 选择第 ${selection.active[1] + 1} 位角色。`)}
        </p>
        {brawl && (
          <p className="mt-2 text-xs leading-5 text-[#80786d]">
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
