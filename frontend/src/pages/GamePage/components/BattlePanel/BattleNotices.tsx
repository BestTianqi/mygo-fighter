import type { Assets } from "../../../../assets/objects/Assets";
import type { GameView } from "../../objects/GameView";

export function WindowedBattleHeader({
  view,
  assets,
}: {
  view: GameView;
  assets: Assets;
}) {
  return (
    <>
      {view.network.status === "error" && view.network.error && (
        <p role="alert" className="text-center text-pink-200">
          {view.network.error}
        </p>
      )}
      {view.connectionStalled && (
        <p role="status" className="text-center text-amber-200">
          网络更新延迟，正在等待同步…
        </p>
      )}
      {view.diagnostics && (
        <output className="text-xs text-slate-400" aria-label="联机性能">
          {view.diagnostics}
        </output>
      )}
      <header className="mb-3 flex items-center justify-between px-2 text-[10px] tracking-widest text-slate-500">
        <span>MYGO!!!!! / {view.config?.format ?? "1v1"}</span>
        <span>{assets.stages[view.config?.settings.arena ?? 0].name}</span>
        {view.network.room && (
          <span className="text-cyan-200" role="status">
            {view.network.status === "reconnecting"
              ? "正在重连"
              : view.network.room.players.some((player) => !player?.connected)
                ? "等待对方重连"
                : `${view.network.side + 1}P · ${view.network.rtt === null ? "连接中" : view.network.rtt + " ms RTT"}`}
          </span>
        )}
      </header>
    </>
  );
}
export function MobileBattleNotices({ view }: { view: GameView }) {
  return (
    <>
      {view.network.status === "error" && view.network.error && (
        <p
          role="alert"
          className="pointer-events-none absolute inset-x-2 top-[calc(env(safe-area-inset-top)+3.75rem)] z-50 rounded-none bg-slate-950/90 px-3 py-2 text-center text-xs text-pink-200"
        >
          {view.network.error}
        </p>
      )}
      {view.connectionStalled && (
        <p
          role="status"
          className="pointer-events-none absolute inset-x-2 top-[calc(env(safe-area-inset-top)+3.75rem)] z-50 rounded-none bg-slate-950/90 px-3 py-2 text-center text-xs text-amber-200"
        >
          网络更新延迟，正在等待同步…
        </p>
      )}
      {view.error && (
        <p
          role="alert"
          className="pointer-events-none absolute inset-x-2 top-[calc(env(safe-area-inset-top)+3.75rem)] z-50 rounded-none bg-slate-950/90 px-3 py-2 text-center text-xs text-pink-200"
        >
          {view.error}
        </p>
      )}
    </>
  );
}
