import type { Assets } from "../../../../assets/objects/Assets";
import { CharacterPortraitPreview } from "../CharacterPortraitPreview";
import { RosterGrid } from "../RosterGrid";
import { SelectionLineups } from "../SelectionLineups";

import { DraftProgress } from "./DraftProgress";
import type { LanLobbyModel } from "./hooks/useLanLobby";

export function LobbyRoster({
  model,
  assets,
}: {
  model: Pick<
    LanLobbyModel,
    | "room"
    | "preview"
    | "teamSize"
    | "draft"
    | "side"
    | "activeSlot"
    | "locked"
    | "ownReady"
    | "team"
    | "rules"
    | "selectionStatus"
    | "picked"
    | "playerCount"
    | "myTurn"
    | "bothConnected"
    | "candidate"
    | "setPreview"
    | "setActiveSlot"
    | "setCandidate"
    | "chooseTeam"
    | "restartDraft"
  >;
  assets: Assets;
}) {
  const {
    room,
    preview,
    teamSize,
    draft,
    side,
    activeSlot,
    locked,
    ownReady,
    team,
    rules,
    selectionStatus,
    picked,
    playerCount,
    myTurn,
    bothConnected,
    candidate,
    setPreview,
    setActiveSlot,
    setCandidate,
    chooseTeam,
  } = model;
  if (!room) return null;
  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(140px,20%)_minmax(0,1fr)] [@media(max-height:500px)]:grid-cols-1">
      <div className="hidden sm:block [@media(max-height:500px)]:hidden">
        <CharacterPortraitPreview
          key={preview}
          assets={assets}
          character={preview}
          compact
        />
      </div>
      <div className="min-w-0">
        <SelectionLineups
          assets={assets}
          teams={room.players.map((player) =>
            Array.from(
              { length: teamSize },
              (_, slot) => player?.team[slot] ?? null,
            ),
          )}
          active={
            draft
              ? draft.phase === "pick" && draft.turn !== null
                ? [draft.turn, room.players[draft.turn]?.team.length ?? 0]
                : null
              : [side, activeSlot]
          }
          labels={room.players.map(
            (_, playerSide) =>
              `${playerSide + 1}P${side === playerSide ? " · 我" : ""}`,
          )}
          statuses={room.players.map((player) =>
            !player
              ? "等待加入"
              : !player.connected
                ? "连接已断开"
                : (room.playing || room.preparing) && !player.loaded
                  ? "正在加载角色"
                  : player.ready
                    ? "已准备"
                    : "已连接",
          )}
          onSlot={(teamSide, slot) => {
            if (room.players[teamSide]?.team[slot] !== undefined)
              setPreview(room.players[teamSide]!.team[slot]);
            if (teamSide === side && !draft) setActiveSlot(slot);
          }}
          isDisabled={(teamSide, slot) =>
            locked ||
            ownReady ||
            !!draft ||
            teamSide !== side ||
            slot > team.length
          }
        />
        <DraftProgress model={model} assets={assets} />
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p
            role="status"
            aria-live="polite"
            className={`text-xs font-medium leading-5 ${draft && !myTurn ? "text-[#61718b]" : "text-[#bb3266]"}`}
          >
            {selectionStatus}
          </p>
          <span className="text-[11px] leading-5 text-[#61718b]">
            {draft?.phase === "ban"
              ? `${draft.bans.length} / ${rules.banCount * 2} 已禁用`
              : `${picked.length} / ${teamSize * playerCount} 已出战 · ${room.players.filter((player) => player?.ready).length} / ${playerCount} 已准备`}
          </span>
        </div>
        <RosterGrid
          assets={assets}
          preview={preview}
          onPreview={(id) => {
            if (candidate === null) setPreview(id);
          }}
          teams={room.players.map((player) => player?.team ?? [])}
          bans={draft?.bans}
          disabled={
            locked || ownReady || (!!draft && (!myTurn || !bothConnected))
          }
          isDisabled={(id) =>
            draft
              ? picked.includes(id)
              : team.some((pick, slot) => pick === id && slot !== activeSlot)
          }
          onChoose={(id) => {
            setPreview(id);
            if (draft) setCandidate(id);
            else chooseTeam(id);
          }}
        />
      </div>
    </div>
  );
}
