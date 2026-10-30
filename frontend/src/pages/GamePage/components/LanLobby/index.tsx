import type { Assets } from "../../../../assets/objects/Assets";
import { Dialog } from "../../../../components/ui/Dialog";
import type { GameView } from "../../objects/GameView";

import { useLanLobby } from "./hooks/useLanLobby";
import { LobbyHeader } from "./LobbyHeader";
import { LobbyReadiness } from "./LobbyReadiness";
import { LobbyRoster } from "./LobbyRoster";
import { LobbySettings } from "./LobbySettings";
import { RoomConnectionPanel } from "./RoomConnectionPanel";

export function LanLobby({
  runtime,
  view,
  assets,
}: {
  runtime: Parameters<typeof useLanLobby>[0];
  view: GameView;
  assets: Assets;
}) {
  const model = useLanLobby(runtime, view.network);
  const { room, error, status } = model;
  return (
    <Dialog
      title={room ? "联机选人" : "联机对战"}
      onClose={model.closeLobby}
      wide={!!room}
      viewport={!!room}
    >
      {!room ? (
        <RoomConnectionPanel model={model} />
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
            <LobbyHeader model={model} />
            <LobbyRoster model={model} assets={assets} />
            <LobbySettings model={model} assets={assets} sound={view.sound} />
          </div>
          <LobbyReadiness model={model} />
        </>
      )}
      {(error || view.error) && (
        <p
          role="alert"
          className="mt-3 shrink-0 bg-crimson/20 px-3 py-2 text-sm leading-6 text-ember"
        >
          {error || view.error}
        </p>
      )}
      <p
        role="status"
        className="mt-2 shrink-0 text-[11px] leading-5 text-muted"
      >
        {status === "preparing"
          ? "正在预载所有角色，完成后同时开战…"
          : status === "reconnecting"
            ? "对战已暂停，正在恢复连接…"
            : status === "connecting"
              ? model.pendingLabel || "正在连接房间…"
              : model.busy
                ? model.pendingLabel
                : room
                  ? "所有玩家准备后自动开战。操作：WASD 移动 · J/K/L、U/I/O、H、P 技能。"
                  : "房间码由 6 位数字或 A–F 字母组成。"}
      </p>
    </Dialog>
  );
}
