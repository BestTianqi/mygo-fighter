import { Button } from "../../../../components/ui/Button";

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
  return (
    <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 pt-3 pb-[env(safe-area-inset-bottom)]">
      {draft && draft.phase !== "complete" && (
        <Button
          tone="light"
          primary
          onClick={submitDraft}
          disabled={candidate === null || !myTurn || locked || !bothConnected}
        >
          {draft.phase === "ban" ? "确认禁用" : "确认出战"}
        </Button>
      )}
      <Button tone="light" disabled={busy} onClick={model.leaveRoom}>
        离开房间
      </Button>
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
        className="min-w-36"
      >
        {room.preparing || status === "preparing"
          ? "正在准备对战…"
          : status === "reconnecting"
            ? "正在恢复连接…"
            : busy
              ? "请稍候…"
              : ownReady
                ? "取消准备"
                : "准备开战"}
      </Button>
    </footer>
  );
}
