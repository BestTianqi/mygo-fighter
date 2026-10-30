import { ArrowUpRight } from "../ArrowUpRight";
import { Button } from "../../../../components/ui/Button";
import { CPU_DIFFICULTIES } from "../../../../game/cpuDifficulty";
import type { MatchConfig } from "../../../../game/objects/MatchOptions";
import type { CharacterSelectionModel } from "./hooks/useCharacterSelection";

const selectClass =
  "min-h-11 min-w-0 rounded-lg border border-[#d9e2ef] bg-white px-2 py-2 text-xs text-[#101d33] touch-manipulation focus-visible:outline-2 focus-visible:outline-[#1aa8b8]";
export function SelectionFooter({
  model,
  stageName,
}: {
  model: CharacterSelectionModel;
  stageName: string;
}) {
  const { selection, complete, confirm } = model;
  const missing = selection.teams.flat().filter((id) => id === null).length;
  const remainingBans = selection.rules.banCount * 2 - selection.bans.length;
  return (
    <footer className="z-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[#d9e2ef] bg-[#f3f7fc] py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div
        className="w-full min-w-0 sm:w-auto sm:flex-1"
        id="selection-start-status"
      >
        <p
          className={`text-xs font-semibold ${complete ? "text-[#16818f]" : "text-[#101d33]"}`}
        >
          {complete
            ? "✓ 阵容已就绪"
            : selection.phase === "ban"
              ? `还需禁用 ${remainingBans} 名角色`
              : `还差 ${missing} 位出战角色`}
        </p>
        <p className="mt-1 text-[11px] text-[#61718b]">
          {complete
            ? `登台场地：${stageName}`
            : selection.phase === "ban"
              ? "先完成禁用，再为双方选择阵容。"
              : `当前：${model.labels[selection.active[0]]} · 第 ${selection.active[1] + 1} 位`}
        </p>
      </div>
      {selection.mode !== "duel" && (
        <label className="flex min-w-0 flex-1 items-center gap-2 text-[11px] text-[#61718b] sm:flex-none">
          {selection.mode === "practice" ? "练习木桩" : "电脑难度"}
          {selection.mode === "practice" ? (
            <select
              aria-label="练习木桩"
              className={selectClass}
              value={selection.settings.dummy}
              onChange={(event) =>
                model.setSettings({
                  dummy: event.target.value as MatchConfig["settings"]["dummy"],
                })
              }
            >
              <option value="idle">站立</option>
              <option value="guard">站立防御</option>
              <option value="crouch">蹲下防御</option>
            </select>
          ) : (
            <select
              aria-label="电脑难度"
              className={selectClass}
              value={selection.settings.difficulty}
              onChange={(event) =>
                model.setSettings({
                  difficulty: Number(event.target.value),
                })
              }
            >
              {CPU_DIFFICULTIES.map(({ id, label }) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </label>
      )}
      <Button
        primary
        onClick={confirm}
        disabled={!complete}
        aria-describedby="selection-start-status"
        className="min-h-12 min-w-36 flex-1 sm:max-w-56 sm:flex-none"
      >
        {selection.mode === "practice" ? "开始练习" : "登台对战"}{" "}
        <ArrowUpRight className="ml-2 inline-block size-4 align-text-bottom" />
      </Button>
    </footer>
  );
}
