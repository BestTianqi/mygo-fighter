import { type ReactNode } from "react";
import type { Assets } from "../../../../assets/objects/Assets";
import { Button } from "../../../../components/ui/Button";
import type { GameView } from "../../objects/GameView";
import type { BattleActions } from "./objects/BattleActions";

import { isWaitingForPlayers } from "./functions/isWaitingForPlayers";

function BarButton({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-11 shrink-0 touch-none items-center justify-center rounded-none bg-panel/90 text-sm font-semibold text-white select-none active:bg-raised disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-ember"
    >
      {children}
    </button>
  );
}

/** Floating buttons stay reachable while the full-field stage hides the toolbar. */
function FieldButton({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="pointer-events-auto flex size-11 touch-none items-center justify-center rounded-none bg-void/90 text-xs font-semibold text-white shadow-lg select-none active:bg-raised disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-ember"
    >
      {children}
    </button>
  );
}

/** Compact battle controls replace the wide page buttons on touch devices. */
export function MobileBattleBar({
  assets,
  runtime,
  view,
  onEnterFull,
}: {
  assets: Assets;
  runtime: BattleActions | null;
  view: GameView;
  onEnterFull: () => void;
}) {
  const room = view.network.room;
  const status = room
    ? view.network.status === "reconnecting"
      ? "正在重连"
      : room.players.some((player) => !player?.connected)
        ? "等待对方重连"
        : `${view.network.side + 1}P · ${view.network.rtt === null ? "连接中" : view.network.rtt + " ms RTT"}`
    : assets.stages[view.config?.settings.arena ?? 0].name;
  return (
    <header className="relative z-40 flex shrink-0 items-center justify-between gap-2 bg-void/80 px-[max(0.5rem,env(safe-area-inset-left))] py-1.5 pr-[max(0.5rem,env(safe-area-inset-right))] pt-[calc(0.375rem+env(safe-area-inset-top))]">
      <div className="flex min-w-0 items-center gap-2">
        <BarButton
          label="打开对战菜单"
          onClick={() => void runtime?.pause(true)}
          disabled={!runtime || view.phase === "finished"}
        >
          菜单
        </BarButton>
        <span className="truncate text-[10px] text-ivory/80">{status}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <BarButton
          label={view.paused ? "继续对战" : "暂停对战"}
          onClick={() => void runtime?.pause()}
          disabled={
            !runtime ||
            view.phase === "finished" ||
            (view.paused && isWaitingForPlayers(view))
          }
        >
          {view.paused ? "继续" : "暂停"}
        </BarButton>
        <BarButton
          label="招式表"
          onClick={() => runtime?.showDialog("moves")}
          disabled={!runtime}
        >
          招
        </BarButton>
        <BarButton
          label="操作说明"
          onClick={() => runtime?.showDialog("help")}
          disabled={!runtime}
        >
          ?
        </BarButton>
        <BarButton
          label={view.sound ? "关闭音效" : "开启音效"}
          onClick={() => runtime?.setSound(!view.sound)}
          disabled={!runtime}
        >
          {view.sound ? "音" : "静"}
        </BarButton>
        <BarButton label="进入全屏" onClick={onEnterFull}>
          全屏
        </BarButton>
      </div>
    </header>
  );
}

export function FullFieldControls({
  view,
  runtime,
  waitingForPlayers,
  toggleFullField,
}: {
  view: GameView;
  runtime: BattleActions | null;
  waitingForPlayers: boolean;
  toggleFullField: () => void;
}) {
  return (
    <div
      role="group"
      aria-label="全屏快捷操作"
      className="absolute right-[max(0.5rem,env(safe-area-inset-right))] top-[max(0.5rem,env(safe-area-inset-top))] z-40 flex items-center gap-1.5"
    >
      <FieldButton
        label={view.paused ? "继续对战" : "暂停对战"}
        onClick={() => void runtime?.pause()}
        disabled={
          !runtime ||
          view.phase === "finished" ||
          (view.paused && waitingForPlayers)
        }
      >
        {view.paused ? "继续" : "暂停"}
      </FieldButton>
      <FieldButton label="退出全屏" onClick={toggleFullField}>
        退出
      </FieldButton>
    </div>
  );
}

export function BattleToolbar({
  view,
  runtime,
  waitingForPlayers,
  toggleFullField,
  canTransform = false,
}: {
  view: GameView;
  runtime: BattleActions | null;
  waitingForPlayers: boolean;
  toggleFullField: () => void;
  canTransform?: boolean;
}) {
  return (
    <>
      <nav
        className="mt-4 flex flex-wrap items-center justify-center gap-2"
        aria-label="游戏操作"
      >
        <Button onClick={() => runtime?.returnToMenu()}>返回主菜单</Button>
        <Button
          disabled={
            !runtime ||
            view.phase === "finished" ||
            (view.paused && waitingForPlayers)
          }
          onClick={() => void runtime?.pause()}
        >
          {view.paused ? "继续对战" : "暂停与设置"}
        </Button>
        <Button
          disabled={
            !!view.network.room &&
            (view.network.side !== 0 || waitingForPlayers)
          }
          onClick={() => void runtime?.restart()}
        >
          重新开始
        </Button>
        <Button onClick={() => runtime?.showDialog("moves")}>招式表</Button>
        <Button onClick={() => runtime?.showDialog("help")}>操作说明</Button>
        <Button
          aria-pressed={view.sound}
          onClick={() => runtime?.setSound(!view.sound)}
        >
          {view.sound ? "音效开" : "音效关"}
        </Button>
        <Button onClick={toggleFullField}>全屏</Button>
      </nav>
      <p className="mt-3 text-center text-xs leading-6 text-muted">
        {view.lastMove ||
          `AD 移动 · W 跳跃${view.config?.rules?.disableNormals ? "" : " · J/K 攻击"} · L 瞬移 · U/I/O 技能${canTransform ? " · H 变身" : ""}${view.config?.rules?.disableSupers ? "" : " · P 大招"}`}
      </p>
      {(view.error || view.network.error) && (
        <p role="alert" className="mt-3 text-center text-xs text-ember">
          {view.error || view.network.error}
        </p>
      )}
    </>
  );
}
