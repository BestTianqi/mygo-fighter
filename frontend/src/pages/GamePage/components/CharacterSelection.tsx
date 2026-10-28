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
import { BattleRulesPanel } from "./BattleRulesPanel";
import { MATCH_FORMATS, teamSizeFor } from "../../../game/battleRules";
const selectClass =
  "min-h-11 rounded-none bg-[#30251a]/6 px-3 py-2 text-sm text-[#211f1a] touch-manipulation focus-visible:outline-2 focus-visible:outline-cyan-200";
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
  const brawl = selection.format === "3ffa";
  const labels = selection.teams.map((_, side) =>
    side === 0
      ? "1P"
      : selection.mode === "duel"
        ? `${side + 1}P`
        : `CPU ${side}`,
  );
  function confirm() {
    if (!complete) return;
    const teams = selection.teams as number[][];
    onStart({
      mode: selection.mode,
      format: selection.format,
      characters: teams.map((team) => team[0]),
      ...(teamSizeFor(selection.format) > 1 ? { teams } : {}),
      settings: selection.settings,
      rules: selection.rules,
    });
  }
  return (
    <section
      className="mx-auto grid h-dvh max-w-[1600px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-[#f5f0e5] px-3 sm:px-6"
      aria-label="角色选择"
    >
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
              onChange={(event) =>
                update(() => controller.setMode(event.target.value as Mode))
              }
            >
              <option value="cpu">
                {brawl ? "1P + 两位电脑" : "单人对战"}
              </option>
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
              onChange={(event) =>
                update(() => controller.setFormat(event.target.value as Format))
              }
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
      <div className="min-h-0 overflow-y-auto py-3 [scrollbar-width:thin]">
        <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(150px,22%)_minmax(0,1fr)] [@media(max-height:500px)]:grid-cols-1">
          <div className="hidden sm:block [@media(max-height:500px)]:hidden">
            <CharacterPortraitPreview
              key={preview}
              assets={assets}
              character={preview}
            />
          </div>
          <div className="min-w-0">
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
              isDisabled={() => selection.rules.banCount > 0}
            />
            {selection.rules.banCount > 0 && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 bg-[#30251a]/4 px-3 py-2 text-xs">
                <div className="min-w-0 space-y-1">
                  {[0, 1].map((side) => (
                    <p
                      key={side}
                      className={
                        side === 0 ? "text-[#8f354e]" : "text-[#2a5f5a]"
                      }
                    >
                      {side === 0
                        ? "1P"
                        : selection.mode === "duel"
                          ? "2P"
                          : "CPU"}{" "}
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
                  onClick={() => update(() => controller.restartDraft())}
                  className="min-h-11 px-2 text-[#80786d] hover:text-[#8f354e]"
                >
                  重新禁选
                </button>
              </div>
            )}
            <div className="mb-3 flex items-center justify-between [@media(max-height:500px)]:mb-1">
              <h2 className="text-xs text-[#80786d]">
                {selection.phase === "ban" ? "轮流禁用角色" : "选择阵容"}
              </h2>
              <p className="text-xs text-[#80786d]">
                {selection.phase === "ban"
                  ? `${selection.bans.length} / ${selection.rules.banCount * 2} 已禁用`
                  : `${selection.teams.flat().filter((id) => id !== null).length} / ${teamSizeFor(selection.format) * selection.teams.length} 已出战`}
              </p>
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
                      (pick, slot) =>
                        pick === id && slot !== selection.active[1],
                    )
              }
              onChoose={(id) => {
                setPreview(id);
                setError(
                  controller.pick(id)
                    ? ""
                    : "请选择未禁用且未被当前阵容占用的角色。",
                );
                setSelection(controller.snapshot());
              }}
            />
            <p
              className="mt-3 min-h-9 rounded-none bg-[#a44761]/6 px-3 py-2 text-xs text-[#8f354e]"
              role="status"
            >
              {error ||
                (complete
                  ? "阵容已就绪，选择场地后登台。"
                  : selection.phase === "ban"
                    ? `轮到 ${selection.active[0] === 0 ? "1P" : selection.mode === "duel" ? "2P" : "CPU"} 禁用第 ${Math.floor(selection.bans.length / 2) + 1} 名角色。`
                    : `为 ${labels[selection.active[0]]} 选择第 ${selection.active[1] + 1} 位角色。`)}
            </p>
            {brawl && (
              <p className="mt-2 text-xs leading-5 text-[#80786d]">
                三人同时登场，各带 3 名角色。击倒后等待 5
                秒由下一名上场，最后存活的一方获胜。
                {selection.mode === "cpu" && "你控制 1P，另外两方由电脑控制。"}
                每队角色不可重复，不同队伍可以选择相同角色。
              </p>
            )}
          </div>
        </div>
        <section className="mt-3 pt-3" aria-label="场地与规则">
          <BattleRulesPanel
            rules={selection.rules}
            format={selection.format}
            rosterSize={ROSTER.length}
            practice={selection.mode === "practice"}
            onChange={(changes) => update(() => controller.setRules(changes))}
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
          <div
            aria-label="选择场地"
            className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]"
          >
            {assets.stages.map((scene, arena) => (
              <button
                key={scene.id}
                onClick={() => update(() => controller.setSettings({ arena }))}
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
      </div>
      <footer className="z-10 flex items-center justify-between gap-3  bg-[#f5f0e5] py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <label className="flex items-center gap-3 text-xs text-[#80786d]">
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
          className="min-w-32 flex-1 sm:max-w-64"
        >
          登台对战 ↗
        </Button>
      </footer>
    </section>
  );
}
