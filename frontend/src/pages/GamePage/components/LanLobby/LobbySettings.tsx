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
    <section className="mt-4 min-w-0 pt-4" aria-label="场地与规则">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-1">
        <h3 className="text-sm font-semibold text-ivory">对战设置</h3>
        <p className="text-xs text-muted">
          {side === 0 ? "房主调整规则与场地" : "规则与场地由房主设置"} ·
          音效仅对自己生效
        </p>
      </div>
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
          <p className="text-xs text-muted">场地 · 房主选择</p>
          <h3 className="mt-1 text-sm font-semibold">
            {stage.name}
            <small className="ml-2 text-[11px] font-normal text-muted">
              {stage.layout}
            </small>
          </h3>
        </div>
        <div className="flex flex-wrap gap-4 text-xs">
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              className="size-4 accent-crimson"
              checked={room.terrain}
              disabled={side !== 0 || locked || ownReady}
              onChange={(event) => model.setTerrain(event.target.checked)}
            />
            分层地形
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              className="size-4 accent-crimson"
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
            className={`w-28 shrink-0 touch-manipulation overflow-hidden rounded-none text-left disabled:cursor-default focus-visible:outline-2 focus-visible:outline-ember lg:pointer-fine:w-56 xl:pointer-fine:w-64 ${room.arena === arena ? "bg-crimson/20 text-ivory" : "bg-void text-muted hover:text-ivory"}`}
          >
            <img
              src={scene.thumbnail}
              alt=""
              loading="lazy"
              className="h-9 w-full object-cover lg:pointer-fine:aspect-video lg:pointer-fine:h-auto"
            />
            <span className="block truncate px-2 py-2 text-[11px] lg:pointer-fine:text-xs">
              {room.arena === arena ? "✓ " : ""}
              {scene.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
