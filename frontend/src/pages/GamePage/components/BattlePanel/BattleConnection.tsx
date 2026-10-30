import type { GameView } from "../../objects/GameView";
/** Always visible, including when the battle toolbar is hidden. RTT is a measured round trip. */
export function BattleConnection({ view }: { view: GameView }) {
  const { room, rtt, status } = view.network;
  const reconnecting =
    room &&
    (status === "reconnecting" ||
      room.players.some((player) => !player?.connected));
  const delayed = view.connectionStalled || (rtt !== null && rtt > 150);
  if (!room) return null;
  return (
    <output
      aria-label="网络延迟"
      className={`pointer-events-none absolute left-[max(0.5rem,env(safe-area-inset-left))] top-[max(0.5rem,env(safe-area-inset-top))] z-40 max-w-[calc(100%-8rem)] truncate rounded-none bg-void/90 px-2 py-2 font-mono text-[10px] tabular-nums ${reconnecting || delayed ? "text-gold" : "text-silver"}`}
    >
      <span aria-hidden="true" className="mr-1">
        ●
      </span>
      {reconnecting
        ? "连接恢复中…"
        : view.connectionStalled
          ? "同步等待中…"
          : rtt === null
            ? "延迟测量中…"
            : `${view.network.side + 1}P · 延迟 ${Math.round(rtt)} ms`}
    </output>
  );
}
