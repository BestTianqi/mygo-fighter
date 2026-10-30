import { Button } from "../../../../components/ui/Button";
import { ROSTER } from "../../../../game/engine";

import type { LanLobbyModel } from "./hooks/useLanLobby";

export function LobbyReadiness({ model }: { model: LanLobbyModel }) {
  const {
    room,
    draft,
    candidate,
    myTurn,
    locked,
    bothConnected,
    submitDraft,
    busy,
    ownReady,
    allTeamsComplete,
    status,
  } = model;
  if (!room) return null;
  const drafting = !!draft && draft.phase !== "complete";
  const readyCount = room.players.filter((player) => player?.ready).length;
  const guidance = busy
    ? model.pendingLabel
    : status === "reconnecting"
      ? "连接恢复后可继续选人和准备。"
      : room.preparing || status === "preparing"
        ? "正在加载角色，所有人完成后同时开战。"
        : !bothConnected
          ? `分享房间码，等待 ${model.playerCount} 位玩家全部连接。`
          : drafting
            ? !myTurn
              ? `等待 ${(draft.turn ?? 0) + 1}P ${draft.phase === "ban" ? "禁用" : "选择"}角色。`
              : candidate === null
                ? `轮到你了：点击角色，再确认${draft.phase === "ban" ? "禁用" : "出战"}。`
                : `已选 ${ROSTER[candidate].name}，点击确认${draft.phase === "ban" ? "禁用" : "出战"}。`
            : !allTeamsComplete
              ? "等待所有玩家选满出战阵容后，即可准备。"
              : ownReady
                ? `你已准备 · ${readyCount} / ${model.playerCount} 人已准备，等待其他玩家。`
                : "阵容已齐，点击准备开战。所有人准备后自动开始。";
  return (
    <footer className="mt-3 shrink-0 border-t border-[#d9e2ef] pt-3 pb-[env(safe-area-inset-bottom)]">
      <p
        role="status"
        aria-live="polite"
        className="mb-3 text-xs leading-5 text-[#61718b]"
      >
        {guidance}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          tone="light"
          disabled={busy}
          onClick={model.leaveRoom}
          className="max-sm:flex-1"
        >
          {model.pendingLabel === "正在离开房间…"
            ? model.pendingLabel
            : "离开房间"}
        </Button>
        {drafting ? (
          <Button
            tone="light"
            primary
            onClick={submitDraft}
            disabled={candidate === null || !myTurn || locked || !bothConnected}
            className="min-w-36 max-sm:flex-1"
          >
            {busy
              ? "正在同步…"
              : draft.phase === "ban"
                ? "确认禁用"
                : "确认出战"}
          </Button>
        ) : (
          <Button
            tone="light"
            primary
            disabled={
              locked ||
              (!ownReady &&
                (!bothConnected ||
                  !allTeamsComplete ||
                  (!!draft && draft.phase !== "complete")))
            }
            onClick={model.toggleReady}
            className="min-w-36 max-sm:flex-1"
          >
            {room.preparing || status === "preparing"
              ? "正在准备对战…"
              : status === "reconnecting"
                ? "正在恢复连接…"
                : busy
                  ? "正在同步…"
                  : ownReady
                    ? "取消准备"
                    : "准备开战"}
          </Button>
        )}
      </div>
    </footer>
  );
}
