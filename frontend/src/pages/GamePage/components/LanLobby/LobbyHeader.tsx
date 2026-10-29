import { MATCH_FORMATS } from "../../../../game/battleRules";
import type { Format } from "../../../../game/objects/MatchOptions";

import type { LanLobbyModel } from "./hooks/useLanLobby";

const selectClass =
  "min-h-11 touch-manipulation rounded-none bg-[#30251a]/6 px-3 py-2 text-sm text-[#211f1a]";
export function LobbyHeader({ model }: { model: LanLobbyModel }) {
  const { room, side, locked, changeRules } = model;
  if (!room) return null;
  return (
    <header className="mb-2 flex flex-wrap items-end justify-between gap-2  pb-2 pr-14">
      <div>
        <p className="text-[10px] tracking-[.25em] text-[#2a5f5a] [@media(max-height:500px)]:hidden">
          ONLINE CHARACTER SELECT
        </p>
        <p className="mt-2 text-xs text-[#80786d]">
          房间{" "}
          <strong className="ml-1 font-mono text-lg tracking-[.18em] text-[#211f1a]">
            {room.code}
          </strong>
          <span className="ml-3">
            你是 {side + 1}P{side === 0 ? " · 房主" : ""}
          </span>
        </p>
      </div>
      <label className="grid gap-1 text-xs text-[#80786d]">
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
