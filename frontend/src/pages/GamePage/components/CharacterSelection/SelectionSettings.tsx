import type { Assets } from "../../../../assets/objects/Assets";
import { ROSTER } from "../../../../game/engine";
import { BattleRulesPanel } from "../BattleRulesPanel";
import type { CharacterSelectionModel } from "./hooks/useCharacterSelection";

export function SelectionSettings({
  model,
  assets,
}: {
  model: Pick<
    CharacterSelectionModel,
    "selection" | "setRules" | "setSettings"
  >;
  assets: Assets;
}) {
  const { selection } = model;
  const stage = assets.stages[selection.settings.arena];
  return (
    <section className="mt-3 pt-3" aria-label="场地与规则">
      <BattleRulesPanel
        rules={selection.rules}
        format={selection.format}
        rosterSize={ROSTER.length}
        practice={selection.mode === "practice"}
        onChange={(changes) => model.setRules(changes)}
      />
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs text-[#80786d]">场地与规则</p>
          <h2 className="mt-1 text-sm font-semibold">
            {stage.name}{" "}
            <small className="ml-2 hidden text-[10px] font-normal text-[#80786d] lg:inline">
              {stage.layout}
            </small>
          </h2>
        </div>
        <div className="flex flex-wrap gap-4 text-xs">
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              checked={selection.settings.terrain}
              onChange={(event) =>
                model.setSettings({ terrain: event.target.checked })
              }
            />
            分层地形
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              checked={selection.settings.sound}
              onChange={(event) =>
                model.setSettings({ sound: event.target.checked })
              }
            />
            音效与语音
          </label>
        </div>
      </div>
      <div
        aria-label="选择场地"
        className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]"
      >
        {assets.stages.map((scene, arena) => (
          <button
            key={scene.id}
            onClick={() => model.setSettings({ arena })}
            aria-pressed={selection.settings.arena === arena}
            className={`group relative w-24 shrink-0 overflow-hidden rounded-none text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 lg:pointer-fine:w-56 xl:pointer-fine:w-64 ${selection.settings.arena === arena ? "bg-white/70 shadow-lg shadow-[#946b2a]/10" : "bg-[#30251a]/4 opacity-65 hover:opacity-100"}`}
          >
            <img
              src={scene.thumbnail}
              alt=""
              loading="lazy"
              className="h-10 w-full object-cover lg:pointer-fine:aspect-video lg:pointer-fine:h-auto"
            />
            <span className="block truncate px-2 py-1 text-[10px] lg:pointer-fine:py-2 lg:pointer-fine:text-xs">
              {scene.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
