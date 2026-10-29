import { MATCH_FORMATS } from "../../../../game/battleRules";
import type { Format, Mode } from "../../../../game/objects/MatchOptions";
import type { CharacterSelectionModel } from "./hooks/useCharacterSelection";

const selectClass =
  "min-h-11 rounded-none bg-[#30251a]/6 px-3 py-2 text-sm text-[#211f1a] touch-manipulation focus-visible:outline-2 focus-visible:outline-cyan-200";
export function SelectionHeader({
  model,
  onBack,
}: {
  model: Pick<
    CharacterSelectionModel,
    "selection" | "brawl" | "setMode" | "setFormat"
  >;
  onBack: () => void;
}) {
  const { selection, brawl } = model;
  return (
    <header className="flex flex-wrap items-center justify-between gap-2 py-2 sm:py-3 max-[380px]:py-1 [@media(max-height:500px)]:py-1">
      <div className="max-[380px]:grid max-[380px]:grid-cols-[auto_1fr] max-[380px]:items-center max-[380px]:gap-x-3">
        <button
          onClick={onBack}
          className="max-[380px]:row-span-2 inline-flex min-h-8 touch-manipulation items-center text-xs text-[#80786d] hover:text-[#211f1a]"
        >
          ← 主菜单
        </button>
        <p className="max-[380px]:col-start-2 text-[9px] font-bold tracking-[.3em] text-[#946b2a] [@media(max-height:500px)]:hidden">
          CHARACTER SELECT
        </p>
        <h1 className="max-[380px]:col-start-2 text-lg font-medium tracking-tight sm:text-2xl [@media(max-height:500px)]:hidden">
          选择对战角色
        </h1>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="grid gap-1 text-xs text-[#80786d]">
          对战模式
          <select
            className={selectClass}
            value={selection.mode}
            onChange={(event) => model.setMode(event.target.value as Mode)}
          >
            <option value="cpu">{brawl ? "1P + 两位电脑" : "单人对战"}</option>
            <option value="duel" disabled={brawl}>
              本地双人
            </option>
            <option value="practice">自由练习</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs text-[#80786d]">
          对战形式
          <select
            className={selectClass}
            value={selection.format}
            disabled={selection.mode === "practice"}
            onChange={(event) => model.setFormat(event.target.value as Format)}
          >
            {MATCH_FORMATS.map((format) => (
              <option key={format} value={format}>
                {format === "3ffa"
                  ? "三人混战 · 每人 3 角色"
                  : `${format} ${format === "1v1" ? "单人战" : "车轮战"}`}
              </option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
}
