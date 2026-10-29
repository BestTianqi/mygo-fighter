import { useEffect, useRef, useState } from "react";
import { ChooseRoomMessage } from "../../../../../apis/rooms/ChooseRoomMessage";
import type { RoomView } from "../../../../../apis/rooms/objects";
import { ReadyRoomMessage } from "../../../../../apis/rooms/ReadyRoomMessage";
import {
  normalizeBattleRules,
  teamSizeFor,
} from "../../../../../game/battleRules";
import { ROSTER } from "../../../../../game/engine";
import type { BattleRules } from "../../../../../game/objects/BattleRules";
import type { Format } from "../../../../../game/objects/MatchOptions";
import { enterImmersive } from "../../../runtime/display/immersive";
import type { GameRuntime } from "../../../runtime/GameRuntime";

import type { ConnectionView } from "../../../../../apis/rooms/objects";

const orders = ["先锋", "中坚", "大将"];
const slotLabel = (size: number, slot: number) =>
  size === 1 ? "出战角色" : size === 3 ? orders[slot] : `第 ${slot + 1} 位角色`;
interface PendingCommand {
  baseline: RoomView | null;
  echo?: (room: RoomView) => boolean;
  httpComplete: boolean;
}

export function useLanLobby(
  runtime: Pick<GameRuntime, "lan" | "runCommand" | "closeLobby" | "setSound">,
  network: ConnectionView,
) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(0);
  const [candidate, setCandidate] = useState<number | null>(null);
  const [activeSlot, setActiveSlot] = useState(0);
  const pending = useRef<PendingCommand | null>(null);
  const { room, side, status, error } = network;
  const latestNetwork = useRef(network);
  latestNetwork.current = network;
  const draft = room?.draft;
  const working =
    busy || ["connecting", "preparing", "reconnecting"].includes(status);
  const locked =
    working || !!room?.playing || !!room?.preparing || status !== "lobby";
  const teamSize = teamSizeFor(room?.format);
  const rules = normalizeBattleRules(
    room?.rules,
    room?.format ?? "1v1",
    ROSTER.length,
  );
  const team = room?.players[side]?.team ?? [];
  const ownReady = !!room?.players[side]?.ready;
  const playerCount = room?.format === "3ffa" ? 3 : 2;
  const bothConnected =
    room?.players.length === playerCount &&
    room.players.every((player) => player?.connected);
  const picked = room?.players.flatMap((player) => player?.team ?? []) ?? [];
  const myTurn = !!draft && draft.turn === side && draft.phase !== "complete";
  const draftSignature = draft
    ? `${draft.phase}:${draft.turn}:${draft.bans.join(",")}:${picked.join(",")}`
    : "";

  useEffect(() => {
    setCandidate(null);
  }, [room?.code, draftSignature]);
  useEffect(() => {
    setActiveSlot(Math.min(team.length, teamSize - 1));
  }, [room?.code, team.length, teamSize]);

  function release(command: PendingCommand) {
    if (pending.current !== command) return;
    pending.current = null;
    setBusy(false);
  }
  function hasEcho(command: PendingCommand) {
    const current = latestNetwork.current.room;
    return (
      !!current &&
      current !== command.baseline &&
      current.code === command.baseline?.code &&
      !!command.echo?.(current)
    );
  }
  useEffect(() => {
    const command = pending.current;
    if (!command?.echo) return;
    if (
      !room ||
      room.code !== command.baseline?.code ||
      status !== "lobby" ||
      (command.httpComplete && hasEcho(command))
    )
      release(command);
  }, [room, status]);
  useEffect(
    () => () => {
      pending.current = null;
    },
    [],
  );

  async function run(
    action: () => Promise<unknown>,
    echo?: (room: RoomView) => boolean,
  ) {
    if (pending.current) return;
    const command: PendingCommand = {
      baseline: room,
      echo,
      httpComplete: false,
    };
    pending.current = command;
    setBusy(true);
    const succeeded = await runtime.runCommand(Promise.resolve().then(action));
    command.httpComplete = true;
    // HTTP only acknowledges receipt; selections stay locked until their own
    // authoritative room fields arrive, even if an unrelated room update wins the race.
    if (!succeeded || !echo || hasEcho(command)) release(command);
  }
  function changeRules(
    changes: Partial<BattleRules>,
    format: Format = room!.format,
  ) {
    if (side !== 0 || locked || !room) return;
    const next = normalizeBattleRules(
      { ...rules, ...changes },
      format,
      ROSTER.length,
    );
    void run(
      () =>
        new ChooseRoomMessage(
          runtime.lan.token,
          undefined,
          undefined,
          undefined,
          format,
          undefined,
          undefined,
          undefined,
          undefined,
          next,
        ).send(),
      (current) =>
        current.format === format &&
        (Object.keys(next) as (keyof BattleRules)[]).every(
          (key) => current.rules[key] === next[key],
        ),
    );
  }
  function chooseTeam(id: number) {
    if (
      locked ||
      ownReady ||
      draft ||
      team.some((pick, slot) => pick === id && slot !== activeSlot)
    )
      return;
    const next = [...team];
    next[activeSlot] = id;
    void run(
      () =>
        new ChooseRoomMessage(
          runtime.lan.token,
          undefined,
          undefined,
          undefined,
          undefined,
          next,
        ).send(),
      (current) =>
        current.players[side]?.team.length === next.length &&
        current.players[side]?.team.every((pick, slot) => pick === next[slot]),
    );
  }
  function submitDraft() {
    if (
      candidate === null ||
      !draft ||
      !myTurn ||
      locked ||
      !bothConnected ||
      draft.bans.includes(candidate) ||
      picked.includes(candidate)
    )
      return;
    const phase = draft.phase;
    void run(
      () =>
        new ChooseRoomMessage(
          runtime.lan.token,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          phase === "ban" ? candidate : undefined,
          phase === "pick" ? candidate : undefined,
        ).send(),
      (current) =>
        phase === "ban"
          ? !!current.draft?.bans.includes(candidate)
          : !!current.players[side]?.team.includes(candidate),
    );
  }
  const selectionStatus = !bothConnected
    ? `等待 ${playerCount} 位玩家全部连接`
    : draft
      ? draft.phase === "complete"
        ? "所有阵容已就绪，可以准备开战。"
        : `${draft.turn === side ? "轮到你" : `等待 ${(draft.turn ?? 0) + 1}P`} · ${draft.phase === "ban" ? `禁用第 ${Math.floor(draft.bans.length / 2) + 1} 名角色` : `选择${slotLabel(teamSize, room?.players[draft.turn ?? 0]?.team.length ?? 0)}`}`
      : ownReady
        ? "已准备。取消准备后可更换阵容。"
        : `为 ${side + 1}P 选择${slotLabel(teamSize, activeSlot)}，点击己方位置可更换。`;
  const allTeamsComplete = !!room?.players.every(
    (player) => player?.team.length === teamSize,
  );

  function restartDraft() {
    if (!room) return;
    void run(
      () =>
        new ChooseRoomMessage(
          runtime.lan.token,
          undefined,
          undefined,
          undefined,
          room.format,
          undefined,
          true,
          undefined,
          undefined,
          rules,
        ).send(),
      (current) =>
        current.draft?.phase === "ban" &&
        current.draft.bans.length === 0 &&
        current.players.every((player) => !player || player.team.length === 0),
    );
  }
  function setTerrain(terrain: boolean) {
    void run(
      () =>
        new ChooseRoomMessage(
          runtime.lan.token,
          undefined,
          undefined,
          terrain,
        ).send(),
      (current) => current.terrain === terrain,
    );
  }
  function setArena(arena: number) {
    void run(
      () => new ChooseRoomMessage(runtime.lan.token, undefined, arena).send(),
      (current) => current.arena === arena,
    );
  }
  function toggleReady() {
    if (!ownReady)
      void enterImmersive(window.matchMedia("(pointer: coarse)").matches);
    void run(
      () => new ReadyRoomMessage(runtime.lan.token, !ownReady).send(),
      (current) => current.players[side]?.ready === !ownReady,
    );
  }
  return {
    room,
    side,
    status,
    error,
    code,
    setCode,
    busy,
    preview,
    setPreview,
    candidate,
    setCandidate,
    activeSlot,
    setActiveSlot,
    draft,
    working,
    locked,
    teamSize,
    rules,
    team,
    ownReady,
    playerCount,
    bothConnected,
    picked,
    myTurn,
    selectionStatus,
    allTeamsComplete,
    changeRules,
    chooseTeam,
    submitDraft,
    restartDraft,
    setTerrain,
    setArena,
    toggleReady,
    createRoom: () => void run(() => runtime.lan.connect()),
    joinRoom: () => void run(() => runtime.lan.connect(code)),
    leaveRoom: () => void run(() => runtime.lan.leave()),
    closeLobby: () => runtime.closeLobby(),
    setSound: (sound: boolean) => runtime.setSound(sound),
  };
}
export type LanLobbyModel = ReturnType<typeof useLanLobby>;
