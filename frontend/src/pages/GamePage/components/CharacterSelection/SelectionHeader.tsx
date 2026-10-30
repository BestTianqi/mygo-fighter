import { MATCH_FORMATS } from "../../../../game/battleRules";
import type { Format, Mode } from "../../../../game/objects/MatchOptions";
import type { CharacterSelectionModel } from "./hooks/useCharacterSelection";

const selectClass =
  "w-full min-h-11 min-w-0 rounded-lg border border-[#d9e2ef] bg-white px-3 py-2 text-sm font-medium text-[#101d33] touch-manipulation focus-visible:outline-2 focus-visible:outline-[#1aa8b8] disabled:opacity-60";
export function SelectionHeader({
  model,
  onBack,
}: {
  model: Pick<
    CharacterSelectionModel,
    "selection" | "brawl" | "complete" | "setMode" | "setFormat"
  >;
  onBack: () => void;
}) {
  const { selection, brawl, complete } = model;
  const steps = [
    ...(selection.rules.banCount > 0
      ? [
          {
            label: "禁用角色",
            done: selection.phase !== "ban",
            current: selection.phase === "ban",
          },
        ]
      : []),
    { label: "选择阵容", done: complete, current: selection.phase === "pick" },
    { label: "准备登台", done: false, current: complete },
  ];
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-[#d9e2ef] py-3 sm:py-4 [@media(max-height:500px)]:py-2">
      <div className="min-w-0">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-8 touch-manipulation items-center gap-2 rounded text-xs text-[#61718b] hover:text-[#bb3266] focus-visible:outline-2 focus-visible:outline-[#1aa8b8]"
        >
          ← 主菜单
        </button>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl [@media(max-height:500px)]:hidden">
          组建你的出战阵容
        </h1>
        <ol
          aria-label="准备进度"
          className="mt-2 flex flex-wrap items-center gap-3 text-[11px] sm:gap-4 [@media(max-height:500px)]:hidden"
        >
          {steps.map((step, index) => (
            <li
              key={step.label}
              aria-current={step.current ? "step" : undefined}
              className={`flex items-center gap-1.5 ${step.current ? "font-semibold text-[#bb3266]" : step.done ? "text-[#16818f]" : "text-[#61718b]"}`}
            >
              <span
                className={`grid size-5 place-items-center rounded-full text-[10px] ${step.current ? "bg-[#bb3266] text-white" : step.done ? "bg-[#1aa8b8]/12" : "bg-[#d9e2ef]/70"}`}
                aria-hidden="true"
              >
                {step.done ? "✓" : index + 1}
              </span>
              {step.label}
            </li>
          ))}
        </ol>
      </div>
      <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:gap-3">
        <label className="grid min-w-0 gap-1.5 text-[11px] text-[#61718b]">
          对战模式
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
        <label className="grid min-w-0 gap-1.5 text-[11px] text-[#61718b]">
          对战形式
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
