import { useEffect, useRef, useState } from "react";
import { ROSTER } from "../../../game/engine";
import type { Assets } from "../../../game/objects/Assets";
import type { GameRuntime } from "../functions/GameRuntime";
import type { GameView } from "../objects/GameView";
import { ChooseRoomMessage } from "../../../apis/rooms/ChooseRoomMessage";
import { ReadyRoomMessage } from "../../../apis/rooms/ReadyRoomMessage";
import type { RoomView } from "../../../apis/rooms/objects";
import { Dialog } from "../../../components/ui/Dialog";
import { Button } from "../../../components/ui/Button";
import { bandPortrait } from "../functions/bandArt";
import { CharacterPortraitPreview } from "./CharacterPortraitPreview";
import { RosterGrid } from "./RosterGrid";
import { SelectionLineups } from "./SelectionLineups";
import { BattleRulesPanel } from "./BattleRulesPanel";
import {
  MATCH_FORMATS,
  normalizeBattleRules,
  teamSizeFor,
} from "../../../game/battleRules";
import type { BattleRules } from "../../../game/objects/BattleRules";
import type { Format } from "../../../game/objects/MatchOptions";
import { enterImmersive } from "../functions/immersive";

const selectClass =
  "min-h-11 touch-manipulation rounded-none bg-[#30251a]/6 px-3 py-2 text-sm text-[#211f1a]";
const orders = ["先锋", "中坚", "大将"];
const slotLabel = (size: number, slot: number) =>
  size === 1 ? "出战角色" : size === 3 ? orders[slot] : `第 ${slot + 1} 位角色`;
interface PendingCommand {
  baseline: RoomView | null;
  echo?: (room: RoomView) => boolean;
  httpComplete: boolean;
}

export function LanLobby({
  runtime,
  view,
  assets,
}: {
  runtime: GameRuntime;
  view: GameView;
  assets: Assets;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(0);
  const [candidate, setCandidate] = useState<number | null>(null);
  const [activeSlot, setActiveSlot] = useState(0);
  const pending = useRef<PendingCommand | null>(null);
  const { room, side, status, error } = view.network;
  const latestNetwork = useRef(view.network);
  latestNetwork.current = view.network;
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
  const bothConnected = !!room?.players.every((player) => player?.connected);
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
  const stage = assets.stages[room?.arena ?? 0];
  const selectionStatus = !bothConnected
    ? "等待对方连接"
    : draft
      ? draft.phase === "complete"
        ? "双方阵容已就绪，可以准备开战。"
        : `${draft.turn === side ? "轮到你" : `等待 ${(draft.turn ?? 0) + 1}P`} · ${draft.phase === "ban" ? `禁用第 ${Math.floor(draft.bans.length / 2) + 1} 名角色` : `选择${slotLabel(teamSize, room?.players[draft.turn ?? 0]?.team.length ?? 0)}`}`
      : ownReady
        ? "已准备。取消准备后可更换阵容。"
        : `为 ${side + 1}P 选择${slotLabel(teamSize, activeSlot)}，点击己方位置可更换。`;
  const allTeamsComplete = !!room?.players.every(
    (player) => player?.team.length === teamSize,
  );

  return (
    <Dialog
      title={room ? "联机选人" : "联机对战"}
      onClose={() => runtime.closeLobby()}
      wide={!!room}
      viewport={!!room}
    >
      {!room ? (
        <div className="space-y-4">
          <p className="mb-5 text-sm leading-6 text-[#80786d]">
            双方打开同一个游戏服务器地址。一人创建房间，另一人输入房间码。
          </p>
          <Button
            tone="light"
            primary
            disabled={working}
            onClick={() => void run(() => runtime.lan.connect())}
            className="w-full"
          >
            创建房间
          </Button>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (code.length === 6 && !working)
                void run(() => runtime.lan.connect(code));
            }}
            className="flex gap-2"
          >
            <label className="sr-only" htmlFor="room-code">
              房间码
            </label>
            <input
              id="room-code"
              value={code}
              disabled={working}
              onChange={(event) =>
                setCode(
                  event.target.value.toUpperCase().replace(/[^A-F0-9]/g, ""),
                )
              }
              maxLength={6}
              autoComplete="off"
              placeholder="六位房间码"
              className="min-h-11 min-w-0 flex-1 rounded-none bg-[#30251a]/6 px-4 font-mono uppercase tracking-widest"
            />
            <Button
              tone="light"
              type="submit"
              disabled={code.length !== 6 || working}
            >
              加入房间
            </Button>
          </form>
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
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
                      {format} {format === "1v1" ? "对战" : "车轮战"}
                    </option>
                  ))}
                </select>
              </label>
            </header>
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
                        ? [
                            draft.turn,
                            room.players[draft.turn]?.team.length ?? 0,
                          ]
                        : null
                      : [side, activeSlot]
                  }
                  labels={[
                    `1P${side === 0 ? " · 我" : ""}`,
                    `2P${side === 1 ? " · 我" : ""}`,
                  ]}
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
                {draft && (
                  <section
                    aria-label="禁选进度"
                    className="mb-2 flex flex-wrap items-center justify-between gap-3 rounded-none bg-[#30251a]/4 p-2"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[10px] tracking-widest text-[#80786d]">
                        BAN / 先禁后选
                      </span>
                      {Array.from(
                        { length: rules.banCount * 2 },
                        (_, banIndex) => {
                          const banSide = banIndex % 2;
                          const id = draft.bans[banIndex];
                          return (
                            <div
                              key={banIndex}
                              className="flex items-center gap-2 text-xs"
                            >
                              <span
                                className={
                                  banSide === 0
                                    ? "text-[#8f354e]"
                                    : "text-[#2a5f5a]"
                                }
                              >
                                {banSide + 1}P · {Math.floor(banIndex / 2) + 1}
                              </span>
                              {id === undefined ? (
                                <span className="grid size-9 place-items-center rounded-none bg-[#30251a]/5 text-[#80786d]">
                                  —
                                </span>
                              ) : (
                                <img
                                  src={
                                    bandPortrait(assets, id)?.face ??
                                    assets.characters[id].portrait
                                  }
                                  alt=""
                                  className="size-9 rounded-none object-cover object-center grayscale"
                                />
                              )}
                              <span className="text-[10px] text-[#80786d]">
                                {id === undefined ? "待禁用" : ROSTER[id].name}
                              </span>
                            </div>
                          );
                        },
                      )}
                    </div>
                    {side === 0 && (
                      <Button
                        tone="light"
                        disabled={locked}
                        onClick={() =>
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
                              current.players.every(
                                (player) => !player || player.team.length === 0,
                              ),
                          )
                        }
                        className="text-xs"
                      >
                        重新禁选
                      </Button>
                    )}
                  </section>
                )}
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p
                    role="status"
                    aria-live="polite"
                    className={`text-xs ${draft?.turn === 1 ? "text-[#2a5f5a]" : "text-[#8f354e]"}`}
                  >
                    {selectionStatus}
                  </p>
                  <span className="text-[10px] text-[#80786d]">
                    {draft?.phase === "ban"
                      ? `${draft.bans.length} / ${rules.banCount * 2} 已禁用`
                      : `${picked.length} / ${teamSize * 2} 已出战`}
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
                    locked ||
                    ownReady ||
                    (!!draft && (!myTurn || !bothConnected))
                  }
                  isDisabled={(id) =>
                    draft
                      ? picked.includes(id)
                      : team.some(
                          (pick, slot) => pick === id && slot !== activeSlot,
                        )
                  }
                  onChoose={(id) => {
                    setPreview(id);
                    if (draft) setCandidate(id);
                    else chooseTeam(id);
                  }}
                />
              </div>
            </div>
            <section className="mt-3 min-w-0 pt-2" aria-label="场地与规则">
              <BattleRulesPanel
                rules={rules}
                format={room.format}
                rosterSize={ROSTER.length}
                readOnly={side !== 0}
                disabled={locked}
                onChange={changeRules}
              />
              <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] text-[#80786d]">场地 · 房主选择</p>
                  <h3 className="mt-1 text-sm font-semibold">
                    {stage.name}
                    <small className="ml-2 text-[10px] font-normal text-[#80786d]">
                      {stage.layout}
                    </small>
                  </h3>
                </div>
                <div className="flex flex-wrap gap-4 text-xs">
                  <label className="flex min-h-8 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={room.terrain}
                      disabled={side !== 0 || locked || ownReady}
                      onChange={(event) => {
                        const terrain = event.target.checked;
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
                      }}
                    />
                    分层地形
                  </label>
                  <label className="flex min-h-8 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={view.sound}
                      onChange={(event) =>
                        runtime.setSound(event.target.checked)
                      }
                    />
                    音效与语音
                  </label>
                </div>
              </div>
              <div className="flex min-w-0 gap-2 overflow-x-auto pb-2">
                {assets.stages.map((scene, arena) => (
                  <button
                    key={scene.id}
                    type="button"
                    disabled={side !== 0 || locked || ownReady}
                    onClick={() =>
                      void run(
                        () =>
                          new ChooseRoomMessage(
                            runtime.lan.token,
                            undefined,
                            arena,
                          ).send(),
                        (current) => current.arena === arena,
                      )
                    }
                    aria-pressed={room.arena === arena}
                    className={`w-24 shrink-0 touch-manipulation overflow-hidden rounded-none text-left disabled:cursor-default focus-visible:outline-2 focus-visible:outline-cyan-200 lg:pointer-fine:w-56 xl:pointer-fine:w-64 ${room.arena === arena ? "bg-white/70 shadow-lg shadow-[#946b2a]/10" : "bg-[#30251a]/4 opacity-65 hover:opacity-100"}`}
                  >
                    <img
                      src={scene.thumbnail}
                      alt=""
                      loading="lazy"
                      className="h-9 w-full object-cover lg:pointer-fine:aspect-video lg:pointer-fine:h-auto"
                    />
                    <span className="block truncate px-2 py-1 text-[9px] lg:pointer-fine:py-2 lg:pointer-fine:text-xs">
                      {scene.name}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>
          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 pt-3 pb-[env(safe-area-inset-bottom)]">
            {draft && draft.phase !== "complete" && (
              <Button
                tone="light"
                primary
                onClick={submitDraft}
                disabled={
                  candidate === null || !myTurn || locked || !bothConnected
                }
              >
                {draft.phase === "ban" ? "确认禁用" : "确认出战"}
              </Button>
            )}
            <Button
              tone="light"
              disabled={busy}
              onClick={() => void run(() => runtime.lan.leave())}
            >
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
              onClick={() => {
                if (!ownReady)
                  void enterImmersive(
                    window.matchMedia("(pointer: coarse)").matches,
                  );
                void run(
                  () =>
                    new ReadyRoomMessage(runtime.lan.token, !ownReady).send(),
                  (current) => current.players[side]?.ready === !ownReady,
                );
              }}
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
        </>
      )}
      {(error || view.error) && (
        <p role="alert" className="mt-4 text-sm text-[#8f354e]">
          {error || view.error}
        </p>
      )}
      <p role="status" className="mt-2 shrink-0 text-[10px] text-[#80786d]">
        {status === "preparing"
          ? "正在预载双方角色，完成后同时开战…"
          : status === "reconnecting"
            ? "对战已暂停，正在恢复连接…"
            : status === "connecting"
              ? "正在连接房间…"
              : "双方使用 WASD、J/K/L、U/I/O、H、P 操作自己的角色。"}
      </p>
    </Dialog>
  );
}
