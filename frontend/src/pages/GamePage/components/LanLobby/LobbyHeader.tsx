import { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { MATCH_FORMATS } from "../../../../game/battleRules";
import type { Format } from "../../../../game/objects/MatchOptions";

import type { LanLobbyModel } from "./hooks/useLanLobby";

const selectClass =
  "min-h-11 w-full touch-manipulation rounded-none bg-panel px-3 py-2 text-sm text-ivory disabled:opacity-65 focus-visible:outline-2 focus-visible:outline-ember";
export function LobbyHeader({ model }: { model: LanLobbyModel }) {
  const { room, side, locked, changeRules } = model;
  const [copyStatus, setCopyStatus] = useState<{
    code: string;
    message: string;
  } | null>(null);
  if (!room) return null;
  const connectedCount = room.players.filter(
    (player) => player?.connected,
  ).length;
  return (
    <header className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pb-4">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold tracking-[.18em] text-muted [@media(max-height:500px)]:hidden">
          ONLINE LOBBY / 联机大厅
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted">房间码</span>
          <strong className="select-all font-mono text-2xl tracking-[.18em] text-ivory">
            {room.code}
          </strong>
          <Button
            className="min-h-9 px-3 text-xs"
            aria-label="复制房间码"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(room.code);
                setCopyStatus({ code: room.code, message: "房间码已复制" });
              } catch {
                setCopyStatus({
                  code: room.code,
                  message: "请长按或选中房间码复制",
                });
              }
            }}
          >
            复制房间码
          </Button>
        </div>
        <p role="status" className="mt-2 text-xs leading-5 text-muted">
          你是{" "}
          <strong className="text-ivory">
            {side + 1}P{side === 0 ? " · 房主" : ""}
          </strong>
          <span className="mx-2 text-muted">/</span>
          {connectedCount} / {model.playerCount} 人已连接
          {copyStatus?.code === room.code && (
            <span className="ml-3 text-silver">{copyStatus.message}</span>
          )}
        </p>
      </div>
      <label className="grid w-full gap-1 text-xs text-muted sm:w-auto">
        <span className="[@media(max-height:500px)]:hidden">
          对战模式 · 房主选择
        </span>
        <select
          aria-label="联机对战模式"
          className={selectClass}
          disabled={side !== 0 || locked}
          value={room.format}
          onChange={(event) => {
            changeRules({}, event.target.value as Format);
          }}
        >
          {MATCH_FORMATS.map((format) => (
            <option key={format} value={format}>
              {format === "3ffa"
                ? "三人混战 · 每人 3 角色"
                : `${format} ${format === "1v1" ? "对战" : "车轮战"}`}
            </option>
          ))}
        </select>
      </label>
    </header>
  );
}
