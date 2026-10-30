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
    <section className="mt-5 pt-4" aria-label="场地与规则">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-5 gap-y-1">
        <div>
          <h2 className="text-sm font-semibold">
            选择场地{" "}
            <span className="ml-2 text-xs font-normal text-muted">
              {stage.name}
            </span>
          </h2>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-muted">
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              className="size-4 accent-crimson"
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
              className="size-4 accent-crimson"
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
        className="flex snap-x gap-2 overflow-x-auto px-0.5 pb-3 pt-0.5 [scrollbar-width:thin]"
      >
        {assets.stages.map((scene, arena) => (
          <button
            key={scene.id}
            type="button"
            onClick={() => model.setSettings({ arena })}
            aria-pressed={selection.settings.arena === arena}
            className={`group relative w-32 shrink-0 snap-start overflow-hidden rounded-none text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember sm:w-40 lg:w-44 ${selection.settings.arena === arena ? "bg-crimson text-white" : "bg-panel text-muted hover:bg-raised hover:text-ivory"}`}
          >
            <img
              src={scene.thumbnail}
              alt=""
              loading="lazy"
              className="aspect-[16/7] w-full object-cover"
            />
            <span className="flex items-center justify-between gap-2 px-2 py-2 text-[11px]">
              <span className="truncate">{scene.name}</span>
              {selection.settings.arena === arena && (
                <span aria-label="已选场地">✓</span>
              )}
            </span>
          </button>
        ))}
      </div>
      <BattleRulesPanel
        rules={selection.rules}
        format={selection.format}
        rosterSize={ROSTER.length}
        practice={selection.mode === "practice"}
        onChange={(changes) => model.setRules(changes)}
      />
    </section>
  );
}
