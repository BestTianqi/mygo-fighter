import type { GameView } from "../objects/GameView";
/** Always visible, including when the battle toolbar is hidden. RTT is a measured round trip. */
export function BattleConnection({ view }: { view: GameView }) {
  const { room, rtt, status } = view.network;
  const reconnecting =
    room &&
    (status === "reconnecting" ||
      room.players.some((player) => !player?.connected));
  const delayed = view.connectionStalled || (rtt !== null && rtt > 150);
  return (
    <output
      aria-label="网络延迟"
      className={`pointer-events-none absolute left-1/2 top-[max(0.25rem,env(safe-area-inset-top))] z-40 -translate-x-1/2 whitespace-nowrap rounded-none bg-slate-950/65 backdrop-blur-sm px-2 py-1 font-mono text-[10px] tabular-nums ${reconnecting || delayed ? "text-amber-300" : "text-cyan-200"}`}
    >
      <span aria-hidden="true" className="mr-1">
        ●
      </span>
      {!room
        ? "本地 · 无网络延迟"
        : reconnecting
          ? "连接恢复中…"
          : view.connectionStalled
            ? "同步等待中…"
            : rtt === null
              ? "延迟测量中…"
              : `${Math.round(rtt)} ms RTT`}
    </output>
  );
}
