import type { Assets } from "../../../../assets/objects/Assets";
import { ROSTER } from "../../../../game/engine";
import { BattleRulesPanel } from "../BattleRulesPanel";

import type { LanLobbyModel } from "./hooks/useLanLobby";

export function LobbySettings({
  model,
  assets,
  sound,
}: {
  model: Pick<
    LanLobbyModel,
    | "room"
    | "rules"
    | "side"
    | "locked"
    | "ownReady"
    | "changeRules"
    | "setTerrain"
    | "setArena"
    | "setSound"
  >;
  assets: Assets;
  sound: boolean;
}) {
  const { room, rules, side, locked, ownReady, changeRules } = model;
  if (!room) return null;
  const stage = assets.stages[room.arena];
  return (
    <section className="mt-3 min-w-0 pt-2" aria-label="场地与规则">
      <BattleRulesPanel
        rules={rules}
        format={room.format}
        rosterSize={ROSTER.length}
        readOnly={side !== 0}
        disabled={locked}
        onChange={changeRules}
      />
      <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] text-[#80786d]">场地 · 房主选择</p>
          <h3 className="mt-1 text-sm font-semibold">
            {stage.name}
            <small className="ml-2 text-[10px] font-normal text-[#80786d]">
              {stage.layout}
            </small>
          </h3>
        </div>
        <div className="flex flex-wrap gap-4 text-xs">
          <label className="flex min-h-8 items-center gap-2">
            <input
              type="checkbox"
              checked={room.terrain}
              disabled={side !== 0 || locked || ownReady}
              onChange={(event) => model.setTerrain(event.target.checked)}
            />
            分层地形
          </label>
          <label className="flex min-h-8 items-center gap-2">
            <input
              type="checkbox"
              checked={sound}
              onChange={(event) => model.setSound(event.target.checked)}
            />
            音效与语音
          </label>
        </div>
      </div>
      <div className="flex min-w-0 gap-2 overflow-x-auto pb-2">
        {assets.stages.map((scene, arena) => (
          <button
            key={scene.id}
            type="button"
            disabled={side !== 0 || locked || ownReady}
            onClick={() => model.setArena(arena)}
            aria-pressed={room.arena === arena}
            className={`w-24 shrink-0 touch-manipulation overflow-hidden rounded-none text-left disabled:cursor-default focus-visible:outline-2 focus-visible:outline-cyan-200 lg:pointer-fine:w-56 xl:pointer-fine:w-64 ${room.arena === arena ? "bg-white/70 shadow-lg shadow-[#946b2a]/10" : "bg-[#30251a]/4 opacity-65 hover:opacity-100"}`}
          >
            <img
              src={scene.thumbnail}
              alt=""
              loading="lazy"
              className="h-9 w-full object-cover lg:pointer-fine:aspect-video lg:pointer-fine:h-auto"
            />
            <span className="block truncate px-2 py-1 text-[9px] lg:pointer-fine:py-2 lg:pointer-fine:text-xs">
              {scene.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
