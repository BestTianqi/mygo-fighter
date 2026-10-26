import { useState } from "react";
import { ROSTER } from "../../../game/engine";
import type { Assets } from "../../../game/objects/Assets";
import type {
  MatchConfig,
  Mode,
  Format,
} from "../../../game/objects/MatchOptions";
import { createSelectionState } from "../functions/createSelectionState";
import { Button } from "../../../components/ui/Button";
import { CharacterPortraitPreview } from "./CharacterPortraitPreview";
import { RosterGrid } from "./RosterGrid";
import { SelectionLineups } from "./SelectionLineups";
const selectClass =
  "min-h-11 rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm touch-manipulation";
export function CharacterSelection({
  assets,
  config,
  onStart,
  onBack,
}: {
  assets: Assets;
  config: MatchConfig;
  onStart: (config: MatchConfig) => void;
  onBack: () => void;
}) {
  const [controller] = useState(() => {
    const state = createSelectionState(ROSTER.length);
    state.open(config);
    return state;
  });
  const [selection, setSelection] = useState(controller.snapshot());
  const [preview, setPreview] = useState(0);
  const [error, setError] = useState("");
  const update = (action: () => unknown) => {
    action();
    setSelection(controller.snapshot());
    setError("");
  };
  const stage = assets.stages[selection.settings.arena];
  const complete = controller.isComplete();
  function confirm() {
    if (!complete) return;
    const teams = selection.teams as number[][];
    onStart({
      mode: selection.mode,
      format: selection.format,
      characters: teams.map((team) => team[0]),
      ...(selection.format === "3v3" ? { teams } : {}),
      settings: selection.settings,
    });
  }
  return (
    <section
      className="mx-auto max-w-7xl px-4 py-6 sm:px-8"
      aria-label="角色选择"
    >
      <header className="mb-8 flex flex-wrap items-center justify-between gap-5">
        <div>
          <button
            onClick={onBack}
            className="-mt-2 mb-2 inline-flex min-h-11 touch-manipulation items-center text-xs text-slate-400 hover:text-white"
          >
            ← 主菜单
          </button>
          <p className="text-[10px] tracking-[.3em] text-cyan-200">
            CHARACTER SELECT
          </p>
          <h1 className="mt-1 text-3xl font-bold">选择对战角色</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="grid gap-1 text-xs text-slate-400">
            对战模式
            <select
              className={selectClass}
              value={selection.mode}
              onChange={(event) =>
                update(() => controller.setMode(event.target.value as Mode))
              }
            >
              <option value="cpu">单人对战</option>
              <option value="duel">本地双人</option>
              <option value="practice">自由练习</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs text-slate-400">
            出战人数
            <select
              className={selectClass}
              value={selection.format}
              disabled={selection.mode === "practice"}
              onChange={(event) =>
                update(() => controller.setFormat(event.target.value as Format))
              }
            >
              <option value="1v1">1v1 单人战</option>
              <option value="3v3">3v3 车轮战</option>
            </select>
          </label>
        </div>
      </header>
      <SelectionLineups
        assets={assets}
        teams={selection.teams}
        active={selection.active}
        labels={["1P", selection.mode === "duel" ? "2P" : "CPU"]}
        onSlot={(side, slot) => update(() => controller.selectSlot(side, slot))}
        onClear={(side, slot) => update(() => controller.clearSlot(side, slot))}
      />
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <CharacterPortraitPreview
          key={preview}
          assets={assets}
          character={preview}
        />
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs text-slate-400">01 / 选择阵容</h2>
            <p className="text-xs text-slate-400">
              {selection.teams.flat().filter((id) => id !== null).length} /{" "}
              {selection.format === "3v3" ? 6 : 2}
            </p>
          </div>
          <RosterGrid
            assets={assets}
            preview={preview}
            onPreview={setPreview}
            teams={selection.teams}
            onChoose={(id) => {
              setPreview(id);
              setError(controller.pick(id) ? "" : "同一队伍请选择不同角色。");
              setSelection(controller.snapshot());
            }}
          />
          <p className="mt-4 min-h-5 text-xs text-pink-200" role="status">
            {error ||
              (complete
                ? "阵容已就绪，选择场地后登台。"
                : `为 ${selection.active[0] + 1}P 选择第 ${selection.active[1] + 1} 位角色。双击阵容格可清除。`)}
          </p>
        </div>
      </div>
      <section
        className="mt-7 rounded-2xl border border-white/10 bg-white/3 p-5"
        aria-label="场地与规则"
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs text-slate-400">02 / 场地与规则</p>
            <h2 className="mt-1 text-lg font-semibold">
              {stage.name}{" "}
              <small className="ml-2 text-xs font-normal text-slate-400">
                {stage.layout}
              </small>
            </h2>
          </div>
          <div className="flex gap-4 text-xs">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selection.settings.terrain}
                onChange={(event) =>
                  update(() =>
                    controller.setSettings({ terrain: event.target.checked }),
                  )
                }
              />
              分层地形
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selection.settings.sound}
                onChange={(event) =>
                  update(() =>
                    controller.setSettings({ sound: event.target.checked }),
                  )
                }
              />
              音效与语音
            </label>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-3">
          {assets.stages.map((scene, arena) => (
            <button
              key={scene.id}
              onClick={() => update(() => controller.setSettings({ arena }))}
              aria-pressed={selection.settings.arena === arena}
              className={`w-36 shrink-0 overflow-hidden rounded-xl border text-left ${selection.settings.arena === arena ? "border-pink-200" : "border-white/10"}`}
            >
              <img
                src={scene.thumbnail}
                alt=""
                loading="lazy"
                className="aspect-video w-full object-cover"
              />
              <span className="block truncate p-2 text-xs">{scene.name}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap justify-between gap-4">
          <label className="flex items-center gap-3 text-xs text-slate-400">
            {selection.mode === "practice" ? "练习木桩" : "电脑难度"}
            {selection.mode === "practice" ? (
              <select
                className={selectClass}
                value={selection.settings.dummy}
                onChange={(event) =>
                  update(() =>
                    controller.setSettings({
                      dummy: event.target
                        .value as MatchConfig["settings"]["dummy"],
                    }),
                  )
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
                  update(() =>
                    controller.setSettings({
                      difficulty: Number(event.target.value),
                    }),
                  )
                }
              >
                <option value={0}>轻松</option>
                <option value={1}>标准</option>
                <option value={2}>认真</option>
              </select>
            )}
          </label>
          <Button
            primary
            onClick={confirm}
            disabled={!complete}
            className="min-w-48"
          >
            登台对战 ↗
          </Button>
        </div>
      </section>
    </section>
  );
}
