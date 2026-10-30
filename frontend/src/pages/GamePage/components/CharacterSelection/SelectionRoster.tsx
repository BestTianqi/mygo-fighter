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
    ? "阵容就绪"
    : selection.phase === "ban"
      ? `${labels[selection.active[0]]} · 禁用第 ${Math.floor(selection.bans.length / 2) + 1} 名角色`
      : `${labels[selection.active[0]]} · 选择第 ${selection.active[1] + 1} 位角色`;
  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(170px,21%)_minmax(0,1fr)] lg:gap-6 [@media(max-height:500px)]:grid-cols-1">
      <div className="hidden lg:block [@media(max-height:500px)]:hidden">
        <CharacterPortraitPreview
          key={preview}
          assets={assets}
          character={preview}
          fillHeight
        />
      </div>
      <div className="min-w-0">
        <div
          className={`mb-3 flex flex-wrap items-center justify-between gap-2 rounded-none px-3 py-2.5 ${error ? "bg-crimson/25 text-ember" : "bg-silver/6 text-ivory"}`}
        >
          <p className="text-xs leading-5" role="status" aria-live="polite">
            {error || status}
          </p>
          <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted">
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
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-none bg-panel px-3 py-2 text-xs">
            <div className="min-w-0 space-y-1">
              {[0, 1].map((side) => (
                <p
                  key={side}
                  className={side === 0 ? "text-ember" : "text-silver"}
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
              className="min-h-11 rounded-none px-2 text-muted hover:text-ember focus-visible:outline-2 focus-visible:outline-ember"
            >
              重新禁选
            </button>
          </div>
        )}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 [@media(max-height:500px)]:mb-1">
          <h2 className="text-xs font-semibold text-ivory">
            {selection.phase === "ban" ? "点击头像禁用" : "全部角色"}
          </h2>
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
          <p className="mt-3 rounded-none bg-panel px-3 py-2 text-xs leading-5 text-muted">
            三方同场，每队 3 人；击倒后 5 秒替补登场，存活到最后的一方获胜。
          </p>
        )}
      </div>
    </div>
  );
}
