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
  "min-h-11 rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-slate-100 touch-manipulation focus-visible:outline-2 focus-visible:outline-cyan-200";
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
      className="mx-auto max-w-[1440px] px-4 pt-4 pb-6 sm:px-8"
      aria-label="角色选择"
    >
      <header className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
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
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
            选择对战角色
          </h1>
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
      <div className="grid min-w-0 gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <CharacterPortraitPreview
          key={preview}
          assets={assets}
          character={preview}
        />
        <div className="min-w-0">
          <SelectionLineups
            assets={assets}
            teams={selection.teams}
            active={selection.active}
            labels={["1P", selection.mode === "duel" ? "2P" : "CPU"]}
            statuses={selection.teams.map((team, side) =>
              team.every((id) => id !== null)
                ? "阵容已就绪"
                : selection.active[0] === side
                  ? "正在选择"
                  : "等待选择",
            )}
            onSlot={(side, slot) => {
              const id = selection.teams[side][slot];
              if (id !== null) setPreview(id);
              update(() => controller.selectSlot(side, slot));
            }}
            onClear={(side, slot) =>
              update(() => controller.clearSlot(side, slot))
            }
          />
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs text-slate-400">选择阵容</h2>
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
          <p
            className="mt-3 min-h-9 rounded-lg bg-white/4 px-3 py-2 text-xs text-pink-200"
            role="status"
          >
            {error ||
              (complete
                ? "阵容已就绪，选择场地后登台。"
                : `为 ${selection.active[0] === 0 ? "1P" : selection.mode === "duel" ? "2P" : "CPU"} 选择第 ${selection.active[1] + 1} 位角色。`)}
          </p>
        </div>
      </div>
      <section
        className="mt-5 rounded-xl border border-white/10 bg-white/3 p-4"
        aria-label="场地与规则"
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs text-slate-400">场地与规则</p>
            <h2 className="mt-1 text-lg font-semibold">
              {stage.name}{" "}
              <small className="mt-1 block text-xs font-normal text-slate-400">
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
                  update(() =>
                    controller.setSettings({ terrain: event.target.checked }),
                  )
                }
              />
              分层地形
            </label>
            <label className="flex min-h-11 items-center gap-2">
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
        <div aria-label="选择场地" className="flex gap-2 overflow-x-auto pb-3">
          {assets.stages.map((scene, arena) => (
            <button
              key={scene.id}
              onClick={() => update(() => controller.setSettings({ arena }))}
              aria-pressed={selection.settings.arena === arena}
              className={`group relative w-32 shrink-0 overflow-hidden rounded-lg border text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 ${selection.settings.arena === arena ? "border-pink-200 ring-1 ring-pink-200" : "border-white/10 hover:border-white/40"}`}
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
      </section>
      <footer className="sticky bottom-0 z-10 -mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 bg-[#080e1cf2] px-4 py-3 backdrop-blur-md sm:-mx-8 sm:px-8">
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
          className="min-w-40 flex-1 sm:max-w-64"
        >
          登台对战 ↗
        </Button>
      </footer>
    </section>
  );
}
