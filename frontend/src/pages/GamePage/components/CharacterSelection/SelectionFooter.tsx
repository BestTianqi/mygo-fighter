import { ArrowUpRight } from "../ArrowUpRight";
import { Button } from "../../../../components/ui/Button";
import { CPU_DIFFICULTIES } from "../../../../game/cpuDifficulty";
import type { MatchConfig } from "../../../../game/objects/MatchOptions";
import type { CharacterSelectionModel } from "./hooks/useCharacterSelection";

const selectClass =
  "min-h-11 rounded-none bg-[#30251a]/6 px-3 py-2 text-sm text-[#211f1a] touch-manipulation focus-visible:outline-2 focus-visible:outline-cyan-200";
export function SelectionFooter({ model }: { model: CharacterSelectionModel }) {
  const { selection, complete, confirm } = model;
  return (
    <footer className="z-10 flex items-center justify-between gap-3  bg-[#f5f0e5] py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <label className="flex items-center gap-3 text-xs text-[#80786d]">
        {selection.mode === "practice" ? "练习木桩" : "电脑难度"}
        {selection.mode === "practice" ? (
          <select
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
            className={selectClass}
            disabled={selection.mode !== "cpu"}
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
      <Button
        primary
        onClick={confirm}
        disabled={!complete}
        className="min-w-32 flex-1 sm:max-w-64"
      >
        登台对战{" "}
        <ArrowUpRight className="ml-2 inline-block size-4 align-text-bottom" />
      </Button>
    </footer>
  );
}
