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

const selectClass =
  "min-h-11 touch-manipulation rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-slate-100";
const orders = ["先锋", "中坚", "大将"];
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
  const teamSize = room?.format === "3v3" ? 3 : 1;
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
        : `${draft.turn === side ? "轮到你" : `等待 ${(draft.turn ?? 0) + 1}P`} · ${draft.phase === "ban" ? "禁用一名角色" : `选择${orders[room?.players[draft.turn ?? 0]?.team.length ?? 0] ?? "出战角色"}`}`
      : ownReady
        ? "已准备。取消准备后可更换阵容。"
        : `为 ${side + 1}P 选择${teamSize === 3 ? orders[activeSlot] : "出战角色"}，点击己方位置可更换。`;
  const allTeamsComplete = !!room?.players.every(
    (player) => player?.team.length === teamSize,
  );

  return (
    <Dialog
      title={room ? "联机选人" : "联机对战"}
      onClose={() => runtime.closeLobby()}
      wide={!!room}
    >
      {!room ? (
        <div className="space-y-4">
          <p className="mb-5 text-sm leading-6 text-slate-400">
            双方打开同一个游戏服务器地址。一人创建房间，另一人输入房间码。
          </p>
          <Button
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
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/20 bg-slate-900 px-4 font-mono uppercase tracking-widest"
            />
            <Button type="submit" disabled={code.length !== 6 || working}>
              加入房间
            </Button>
          </form>
        </div>
      ) : (
        <>
          <header className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <p className="text-[10px] tracking-[.25em] text-cyan-200">
                ONLINE CHARACTER SELECT
              </p>
              <p className="mt-2 text-xs text-slate-400">
                房间{" "}
                <strong className="ml-1 font-mono text-lg tracking-[.18em] text-slate-100">
                  {room.code}
                </strong>
                <span className="ml-3">
                  你是 {side + 1}P{side === 0 ? " · 房主" : ""}
                </span>
              </p>
            </div>
            <label className="grid gap-1 text-xs text-slate-400">
              对战模式 · 房主选择
              <select
                aria-label="联机对战模式"
                className={selectClass}
                disabled={side !== 0 || locked || ownReady}
                value={draft ? "draft" : room.format}
                onChange={(event) => {
                  const draftMode = event.target.value === "draft";
                  const format = draftMode
                    ? "3v3"
                    : (event.target.value as "1v1" | "3v3");
                  void run(
                    () =>
                      new ChooseRoomMessage(
                        runtime.lan.token,
                        undefined,
                        undefined,
                        undefined,
                        format,
                        undefined,
                        draftMode,
                      ).send(),
                    (current) =>
                      current.format === format &&
                      !!current.draft === draftMode,
                  );
                }}
              >
                <option value="1v1">1v1 对战</option>
                <option value="3v3">3v3 车轮战</option>
                <option value="draft">禁选 3v3 车轮战</option>
              </select>
            </label>
          </header>
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
              className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/3 p-3 sm:p-4"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[10px] tracking-widest text-slate-400">
                  BAN / 先禁后选
                </span>
                {[0, 1].map((banSide) => {
                  const id = draft.bans[banSide];
                  return (
                    <div
                      key={banSide}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span
                        className={
                          banSide === 0 ? "text-pink-200" : "text-cyan-200"
                        }
                      >
                        {banSide + 1}P
                      </span>
                      {id === undefined ? (
                        <span className="grid size-9 place-items-center rounded-lg border border-dashed border-white/15 text-slate-500">
                          —
                        </span>
                      ) : (
                        <img
                          src={
                            bandPortrait(assets, id)?.face ??
                            assets.characters[id].portrait
                          }
                          alt=""
                          className="size-9 rounded-lg object-cover object-center grayscale"
                        />
                      )}
                      <span className="text-[10px] text-slate-400">
                        {id === undefined ? "待禁用" : ROSTER[id].name}
                      </span>
                    </div>
                  );
                })}
              </div>
              {side === 0 && (
                <Button
                  disabled={locked}
                  onClick={() =>
                    void run(
                      () =>
                        new ChooseRoomMessage(
                          runtime.lan.token,
                          undefined,
                          undefined,
                          undefined,
                          "3v3",
                          undefined,
                          true,
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p
              role="status"
              aria-live="polite"
              className={`text-xs ${draft?.turn === 1 ? "text-cyan-200" : "text-pink-200"}`}
            >
              {selectionStatus}
            </p>
            <span className="text-[10px] text-slate-500">
              {draft?.phase === "ban"
                ? `${draft.bans.length} / 2 已禁用`
                : `${picked.length} / ${teamSize * 2} 已出战`}
            </span>
          </div>
          <div className="grid min-w-0 gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
            <CharacterPortraitPreview
              key={preview}
              assets={assets}
              character={preview}
            >
              {draft && (
                <>
                  <p className="mb-2 text-[10px] text-slate-400">
                    {candidate === null
                      ? "点击角色头像后确认"
                      : `已选中 ${ROSTER[candidate].name}`}
                  </p>
                  <Button
                    primary
                    className="w-full px-2 text-xs"
                    disabled={
                      candidate === null ||
                      !myTurn ||
                      locked ||
                      !bothConnected ||
                      draft.bans.includes(candidate) ||
                      picked.includes(candidate)
                    }
                    onClick={submitDraft}
                  >
                    {draft.phase === "complete"
                      ? "阵容已就绪"
                      : draft.phase === "ban"
                        ? "确认禁用"
                        : "确认出战"}
                  </Button>
                </>
              )}
            </CharacterPortraitPreview>
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
          <section
            className="mt-6 min-w-0 rounded-2xl border border-white/10 bg-white/3 p-4"
            aria-label="场地与规则"
          >
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] text-slate-400">场地 · 房主选择</p>
                <h3 className="mt-1 text-sm font-semibold">
                  {stage.name}
                  <small className="ml-2 text-[10px] font-normal text-slate-400">
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
                    onChange={(event) => runtime.setSound(event.target.checked)}
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
                  className={`w-32 shrink-0 touch-manipulation overflow-hidden rounded-xl border text-left disabled:cursor-default focus-visible:outline-2 focus-visible:outline-cyan-200 ${room.arena === arena ? "border-pink-200" : "border-white/10"}`}
                >
                  <img
                    src={scene.thumbnail}
                    alt=""
                    loading="lazy"
                    className="aspect-video w-full object-cover"
                  />
                  <span className="block truncate p-2 text-[10px]">
                    {scene.name}
                  </span>
                </button>
              ))}
            </div>
          </section>
          <footer className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <Button
              disabled={busy}
              onClick={() => void run(() => runtime.lan.leave())}
            >
              离开房间
            </Button>
            <Button
              primary
              disabled={
                locked ||
                (!ownReady &&
                  (!bothConnected ||
                    !allTeamsComplete ||
                    (!!draft && draft.phase !== "complete")))
              }
              onClick={() =>
                void run(
                  () =>
                    new ReadyRoomMessage(runtime.lan.token, !ownReady).send(),
                  (current) => current.players[side]?.ready === !ownReady,
                )
              }
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
        <p role="alert" className="mt-4 text-sm text-pink-200">
          {error || view.error}
        </p>
      )}
      <p role="status" className="mt-5 text-xs text-slate-500">
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
