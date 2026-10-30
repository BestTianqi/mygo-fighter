import { MATCH_FORMATS } from "../../../../game/battleRules";
import type { Format, Mode } from "../../../../game/objects/MatchOptions";
import type { CharacterSelectionModel } from "./hooks/useCharacterSelection";
import { Button } from "../../../../components/ui/Button";

const selectClass =
  "w-full min-h-11 min-w-0 rounded-none bg-panel px-3 py-2 text-sm font-medium text-ivory touch-manipulation focus-visible:outline-2 focus-visible:outline-ember disabled:opacity-60";
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
    <header className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 [@media(max-height:500px)]:py-2">
      <div className="min-w-0">
        <Button type="button" onClick={onBack} className="text-xs">
          主菜单
        </Button>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-wider sm:text-3xl [@media(max-height:500px)]:hidden">
          选择角色
        </h1>
      </div>
      <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:gap-3">
        <label className="grid min-w-0 gap-1.5 text-[11px] text-muted">
          模式
          <select
            aria-label="对战模式"
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
        <label className="grid min-w-0 gap-1.5 text-[11px] text-muted">
          形式
          <select
            aria-label="对战形式"
            className={selectClass}
            value={selection.format}
            disabled={selection.mode === "practice"}
            onChange={(event) => model.setFormat(event.target.value as Format)}
          >
            {MATCH_FORMATS.map((format) => (
              <option key={format} value={format}>
                {format === "3ffa"
                  ? "三人混战"
                  : `${format} ${format === "1v1" ? "单人战" : "车轮战"}`}
              </option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
}
