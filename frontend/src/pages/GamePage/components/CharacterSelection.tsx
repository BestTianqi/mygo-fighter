import { useState } from "react";
import { bandFor } from "../../../game/bands";
import { ROSTER, MOVES } from "../../../game/engine";
import { schemeFor } from "../../../game/controls";
import type { Assets } from "../../../game/objects/Assets";
import { BAND_LABEL, type BandId } from "../../../game/objects/BandId";
import type {
  MatchConfig,
  Mode,
  Format,
} from "../../../game/objects/MatchOptions";
import { bandPortrait } from "../functions/bandArt";
import { createSelectionState } from "../functions/createSelectionState";
import { Button } from "../../../components/ui/Button";
const selectClass =
  "rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm";
/** Roster cards keep their original compact labels; the panel uses BAND_LABEL. */
const rosterBandLabel: Record<BandId, string> = {
  mygo: "MyGO!!!!!",
  mujica: "Ave Mujica",
  mewtype: "MewType",
};
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
  const [stageForm, setStageForm] = useState(false);
  const [error, setError] = useState("");
  const update = (action: () => unknown) => {
    action();
    setSelection(controller.snapshot());
    setError("");
  };
  const profile = ROSTER[preview],
    stage = assets.stages[selection.settings.arena];
  const scheme = schemeFor({ character: preview, stageForm });
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
            className="mb-3 text-xs text-slate-400 hover:text-white"
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
      <div className="mb-6 grid grid-cols-2 gap-4">
        {selection.teams.map((team, side) => (
          <section
            key={side}
            className="rounded-2xl border border-white/10 bg-white/3 p-4"
          >
            <h2
              className={`mb-3 text-xs font-bold tracking-widest ${side === 0 ? "text-pink-200" : "text-cyan-200"}`}
            >
              {side === 0 ? "1P" : selection.mode === "duel" ? "2P" : "CPU"} /
              出战顺序
            </h2>
            <div className="flex flex-wrap gap-2">
              {team.map((id, slot) => (
                <button
                  key={slot}
                  onClick={() =>
                    update(() => controller.selectSlot(side, slot))
                  }
                  onDoubleClick={() =>
                    update(() => controller.clearSlot(side, slot))
                  }
                  aria-pressed={
                    selection.active[0] === side && selection.active[1] === slot
                  }
                  className={`min-w-24 flex-1 rounded-xl border p-3 text-left text-sm ${selection.active[0] === side && selection.active[1] === slot ? "border-pink-200 bg-pink-200/10" : "border-white/10"}`}
                >
                  <small className="mb-1 block text-[10px] text-slate-400">
                    0{slot + 1}
                  </small>
                  {id === null ? "选择角色 +" : ROSTER[id].name}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="overflow-hidden rounded-2xl border border-white/10 bg-linear-to-b from-indigo-900/30 to-slate-900">
          <div className="relative h-52 overflow-hidden sm:h-72">
            <img
              src={
                bandPortrait(assets, preview, stageForm ? "stage" : "normal")
                  ?.portrait ?? assets.characters[preview].portrait
              }
              alt={profile.name}
              className="size-full object-contain object-top"
            />
            <span className="absolute bottom-0 inset-x-0 h-20 bg-linear-to-t from-slate-900 to-transparent" />
          </div>
          <div className="relative p-5">
            <p className="text-[10px] tracking-widest text-slate-400">
              {BAND_LABEL[profile.band ?? "mygo"]}
            </p>
            <h2
              className="mt-1 text-2xl font-bold"
              style={{ color: profile.color }}
            >
              {profile.name}
            </h2>
            <p className="mt-2 text-xs text-slate-400">
              {profile.role} / {profile.archetype}
            </p>
            {assets.mujicaPortraits[preview] && (
              <button
                aria-pressed={stageForm}
                onClick={() => setStageForm(!stageForm)}
                className="mt-3 rounded-full border border-white/20 px-3 py-1 text-xs"
              >
                {stageForm ? "演出服" : "常态"} · 切换预览
              </button>
            )}
            <dl className="mt-4 space-y-2 text-xs">
              {[...scheme.base, scheme.super].map(
                (key, i) =>
                  key && (
                    <div key={key} className="flex gap-3">
                      <dt className="font-mono text-pink-200">
                        {["U", "I", "O", "P"][i]}
                      </dt>
                      <dd className="text-slate-300">{MOVES[key]?.name}</dd>
                    </div>
                  ),
              )}
            </dl>
          </div>
        </aside>
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs text-slate-400">01 / 选择阵容</h2>
            <p className="text-xs text-slate-400">
              {selection.teams.flat().filter((id) => id !== null).length} /{" "}
              {selection.format === "3v3" ? 6 : 2}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {ROSTER.map((character, id) => (
              <button
                key={id}
                onFocus={() => {
                  setPreview(id);
                  setStageForm(false);
                }}
                onMouseEnter={() => {
                  setPreview(id);
                  setStageForm(false);
                }}
                onClick={() => {
                  setPreview(id);
                  setStageForm(false);
                  if (!controller.pick(id))
                    setError("同一队伍请选择不同角色。");
                  setSelection(controller.snapshot());
                }}
                aria-label={`选择${character.name}`}
                className={`group overflow-hidden rounded-xl border text-left transition hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-cyan-200 ${preview === id ? "border-white/60 bg-white/10" : "border-white/10 bg-white/3"}`}
              >
                <img
                  src={
                    bandPortrait(assets, id)?.face ??
                    assets.characters[id].portrait
                  }
                  alt=""
                  loading="lazy"
                  className="h-24 w-full object-cover object-[center_18%] sm:h-28"
                />
                <div className="p-2">
                  <span className="block truncate text-xs font-medium">
                    {character.name}
                  </span>
                  <small className="text-[9px] text-slate-500">
                    {rosterBandLabel[bandFor(id).id]}
                  </small>
                </div>
              </button>
            ))}
          </div>
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
