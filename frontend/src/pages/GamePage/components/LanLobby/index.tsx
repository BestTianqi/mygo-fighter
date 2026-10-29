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
        <p role="alert" className="mt-4 text-sm text-[#8f354e]">
          {error || view.error}
        </p>
      )}
      <p role="status" className="mt-2 shrink-0 text-[10px] text-[#80786d]">
        {status === "preparing"
          ? "正在预载所有角色，完成后同时开战…"
          : status === "reconnecting"
            ? "对战已暂停，正在恢复连接…"
            : status === "connecting"
              ? "正在连接房间…"
              : "每位玩家使用 WASD、J/K/L、U/I/O、H、P 操作自己的角色。"}
      </p>
    </Dialog>
  );
}
