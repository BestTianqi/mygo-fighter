import { useState } from "react";
import { ROSTER } from "../../../game/engine";
import type { Assets } from "../../../game/objects/Assets";
import type { GameRuntime } from "../functions/GameRuntime";
import type { GameView } from "../objects/GameView";
import { ChooseRoomMessage } from "../../../apis/rooms/ChooseRoomMessage";
import { ReadyRoomMessage } from "../../../apis/rooms/ReadyRoomMessage";
import { Dialog } from "../../../components/ui/Dialog";
import { Button } from "../../../components/ui/Button";
const selectClass =
  "mt-2 min-h-11 w-full touch-manipulation rounded-xl border border-white/15 bg-slate-900 p-3 text-slate-100";
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
  const { room, side, status, error } = view.network;
  const working =
    busy || ["connecting", "preparing", "reconnecting"].includes(status);
  async function run(action: Promise<unknown>) {
    setBusy(true);
    try {
      await runtime.runCommand(action);
    } finally {
      setBusy(false);
    }
  }
  const teamSize = room?.format === "3v3" ? 3 : 1;
  const team = room?.players[side]?.team ?? [];
  function chooseTeam(next: number[]) {
    void run(
      new ChooseRoomMessage(
        runtime.lan.token,
        undefined,
        undefined,
        undefined,
        undefined,
        next,
      ).send(),
    );
  }
  return (
    <Dialog title="联机对战" onClose={() => runtime.closeLobby()}>
      <p className="mb-5 text-sm leading-6 text-slate-400">
        双方打开同一个游戏服务器地址。一人创建房间，另一人输入房间码。
        使用公共服务器时可以跨网络对战；本地服务器需要双方能访问房主的地址。
      </p>
      {!room ? (
        <div className="space-y-4">
          <Button
            primary
            disabled={working}
            onClick={() => void runtime.lan.connect()}
            className="w-full"
          >
            创建房间
          </Button>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void runtime.lan.connect(code);
            }}
            className="flex gap-2"
          >
            <label className="sr-only" htmlFor="room-code">
              房间码
            </label>
            <input
              id="room-code"
              value={code}
              onChange={(event) =>
                setCode(
                  event.target.value.toUpperCase().replace(/[^A-F0-9]/g, ""),
                )
              }
              maxLength={6}
              autoComplete="off"
              placeholder="六位房间码"
              className="min-w-0 flex-1 rounded-xl border border-white/20 bg-slate-900 px-4 font-mono uppercase tracking-widest"
            />
            <Button type="submit" disabled={code.length !== 6 || working}>
              加入房间
            </Button>
          </form>
        </div>
      ) : (
        <>
          <div className="mb-5 rounded-2xl border border-cyan-200/20 bg-cyan-200/5 p-5">
            <p className="text-xs text-cyan-100">
              你是 {side === 0 ? "房主 · 1P" : "2P"} / 房间码
            </p>
            <strong className="mt-2 block font-mono text-4xl tracking-[.25em]">
              {room.code}
            </strong>
            <p className="mt-3 break-all text-xs text-slate-400">
              游戏地址：
              {location.origin.includes("localhost") ||
              location.hostname === "127.0.0.1"
                ? "请在另一台设备打开房主的局域网 IP 地址，端口与本页相同。"
                : location.origin}
            </p>
          </div>
          <div className="mb-5 grid grid-cols-2 gap-3">
            {room.players.map((player, i) => (
              <div key={i} className="rounded-xl border border-white/10 p-3">
                <p className="text-xs text-slate-500">{i + 1}P</p>
                <p className="mt-1 text-sm">
                  {player
                    ? player.team
                        .map((id, slot) => `${slot + 1}. ${ROSTER[id].name}`)
                        .join(" / ")
                    : "等待加入"}
                </p>
                <small
                  className={
                    player?.connected ? "text-cyan-200" : "text-slate-500"
                  }
                >
                  {player?.connected
                    ? (room.playing || room.preparing) && !player.loaded
                      ? "正在加载角色"
                      : player.ready
                        ? "已准备"
                        : "已连接"
                    : "等待连接"}
                </small>
              </div>
            ))}
          </div>
          <label className="block text-xs text-slate-400">
            对战模式 · 房主选择
            <select
              className={selectClass}
              disabled={side !== 0 || working || room.playing}
              value={room.format}
              onChange={(event) =>
                void run(
                  new ChooseRoomMessage(
                    runtime.lan.token,
                    undefined,
                    undefined,
                    undefined,
                    event.target.value as "1v1" | "3v3",
                  ).send(),
                )
              }
            >
              <option value="1v1">1v1 对战</option>
              <option value="3v3">3v3 车轮战</option>
            </select>
          </label>
          <p className="mt-4 text-xs text-slate-400">
            {teamSize === 3
              ? "依次选择三名不同角色。败者换人，胜者保留血量和共鸣。"
              : "选择出战角色。"}
          </p>
          {Array.from({ length: teamSize }, (_, slot) => (
            <label key={slot} className="mt-3 block text-xs text-slate-400">
              {teamSize === 3 ? `第 ${slot + 1} 位出战` : "我的角色"}
              <select
                className={selectClass}
                disabled={working || room.playing || slot > team.length}
                value={team[slot] ?? ""}
                onChange={(event) => {
                  const next = [...team];
                  next[slot] = Number(event.target.value);
                  chooseTeam(next);
                }}
              >
                <option value="" disabled>
                  请选择角色
                </option>
                {ROSTER.map((p, id) => (
                  <option
                    key={id}
                    value={id}
                    disabled={team.includes(id) && team[slot] !== id}
                  >
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label className="mt-4 block text-xs text-slate-400">
            对战地图 · 房主选择
            <select
              className={selectClass}
              disabled={side !== 0 || working || room.playing}
              value={room.arena}
              onChange={(event) =>
                void run(
                  new ChooseRoomMessage(
                    runtime.lan.token,
                    undefined,
                    Number(event.target.value),
                  ).send(),
                )
              }
            >
              {assets.stages.map((s, id) => (
                <option key={s.id} value={id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-4 flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={room.terrain}
              disabled={side !== 0 || working || room.playing}
              onChange={(event) =>
                void run(
                  new ChooseRoomMessage(
                    runtime.lan.token,
                    undefined,
                    undefined,
                    event.target.checked,
                  ).send(),
                )
              }
            />
            分层地形
          </label>
          <div className="mt-6 flex justify-between gap-3">
            <Button disabled={busy} onClick={() => void runtime.lan.leave()}>
              离开房间
            </Button>
            <Button
              primary
              disabled={
                working ||
                room.playing ||
                team.length !== teamSize ||
                !room.players.every((player) => player?.connected)
              }
              onClick={() =>
                void run(
                  new ReadyRoomMessage(
                    runtime.lan.token,
                    !room.players[side]?.ready,
                  ).send(),
                )
              }
            >
              {working
                ? "准备中…"
                : room.players[side]?.ready
                  ? "取消准备"
                  : "准备开战"}
            </Button>
          </div>
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
            : "双方均使用 WASD、J/K/L、U/I/O、H、P 操作自己的角色。"}
      </p>
    </Dialog>
  );
}
