import { useEffect, useRef, type RefObject } from "react";
import type { Assets, Presentation } from "../../../game/objects/Assets";
import type { GameRuntime } from "../functions/GameRuntime";
import type { GameView } from "../objects/GameView";
import { bandPortrait } from "../functions/bandArt";
import { Button } from "../../../components/ui/Button";
import { ROSTER } from "../../../game/engine";
import { schemeFor } from "../../../game/controls";
import { TouchControls } from "./TouchControls";

function UltimateBackgroundVideo({
  media,
  paused,
  onEnd,
}: {
  media: Presentation;
  paused: boolean;
  onEnd: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.currentTime = 0;
    video.playbackRate = media.videoRate ?? 1;
  }, [media]);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (paused) video.pause();
    else void video.play().catch(() => {});
    return () => video.pause();
  }, [paused, media]);
  return (
    <video
      ref={ref}
      src={media.video}
      muted
      playsInline
      onEnded={onEnd}
      onError={onEnd}
      className="h-full min-w-0 w-full object-cover"
    />
  );
}

export function BattlePanel({
  canvas,
  assets,
  runtime,
  view,
}: {
  canvas: RefObject<HTMLCanvasElement | null>;
  assets: Assets;
  runtime: GameRuntime | null;
  view: GameView;
}) {
  const localFighter = view.fighters[view.network.room ? view.network.side : 0];
  const localIdentity = {
    character: localFighter?.character ?? 0,
    penguin: !!localFighter?.transformed,
    stageForm: !!localFighter?.transformed,
  };
  const canTransform = !!schemeFor(localIdentity).transform;
  const videos = view.cutins.flatMap((media, side) =>
    media?.video ? [{ media, side }] : [],
  );
  const waitingForPlayers =
    !!view.network.room &&
    (view.network.status !== "playing" ||
      !view.network.room.players.every(
        (player) => player?.connected && player.loaded,
      ));
  const finish =
    view.roundEnd && view.phaseMs > 0 && view.phaseMs < 2500
      ? view.roundEnd
      : null;
  const winner =
    finish && finish.winner >= 0 ? finish.fighters[finish.winner] : null;
  const finishArt = winner
    ? (assets.finishArts?.[winner.character] ??
      (winner.character === 1
        ? assets.soyoFinishArt
        : winner.character === 7
          ? assets.uikaFinishArt
          : (bandPortrait(
              assets,
              winner.character,
              winner.stageForm ? "stage" : "normal",
            )?.portrait ?? assets.characters[winner.character].portrait)))
    : "";
  return (
    <section
      hidden={view.screen !== "battle"}
      className="mx-auto flex min-h-dvh max-w-[1440px] flex-col px-2 py-3 sm:px-6 sm:py-6"
      aria-label="对战舞台"
    >
      {view.network.status === "error" && view.network.error && (
        <p role="alert" className="text-center text-pink-200">
          {view.network.error}
        </p>
      )}
      {view.connectionStalled && (
        <p role="status" className="text-center text-amber-200">
          网络更新延迟，正在等待同步…
        </p>
      )}
      {view.diagnostics && (
        <output className="text-xs text-slate-400" aria-label="联机性能">
          {view.diagnostics}
        </output>
      )}
      <header className="mb-3 flex items-center justify-between px-2 text-[10px] tracking-widest text-slate-500">
        <span>MYGO!!!!! / {view.config?.format ?? "1v1"}</span>
        <span>{assets.stages[view.config?.settings.arena ?? 0].name}</span>
        {view.network.room && (
          <span className="text-cyan-200" role="status">
            {view.network.status === "reconnecting"
              ? "正在重连"
              : view.network.room.players.some((player) => !player?.connected)
                ? "等待对方重连"
                : `${view.network.side + 1}P · ${view.network.rtt === null ? "连接中" : view.network.rtt + " ms RTT"}`}
          </span>
        )}
      </header>
      <div className="relative overflow-hidden rounded-xl border border-white/15 bg-slate-950 sm:rounded-3xl">
        {videos.length > 0 && (
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 grid divide-x divide-white/25 ${videos.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
          >
            {videos.map(({ media, side }) => (
              <UltimateBackgroundVideo
                key={`${side}:${media.video}`}
                media={media}
                paused={view.paused}
                onEnd={() => runtime?.clearCutin(side)}
              />
            ))}
            <div className="absolute inset-0 bg-slate-950/25" />
          </div>
        )}
        <canvas
          ref={canvas}
          tabIndex={-1}
          aria-label="MyGO 格斗对战画面"
          className="relative block aspect-video w-full outline-none"
          width={960}
          height={540}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 grid grid-cols-[1fr_auto_1fr] items-start gap-3 bg-linear-to-b from-slate-950/95 to-transparent p-3 pb-12 sm:gap-6 sm:p-6 sm:pb-16">
          {view.fighters[0] && (
            <FighterHUD side={0} view={view} assets={assets} />
          )}
          <div className="text-center">
            <p className="font-mono text-2xl font-bold text-white sm:text-4xl">
              {Math.ceil(view.remaining / 1000)
                .toString()
                .padStart(2, "0")}
            </p>
            <small className="text-[8px] text-slate-400 sm:text-[10px]">
              ROUND {view.round}
            </small>
          </div>
          {view.fighters[1] && (
            <FighterHUD side={1} view={view} assets={assets} />
          )}
        </div>
        {finish && !view.paused && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden bg-slate-950/85">
            {winner && (
              <img
                src={finishArt}
                alt={`${ROSTER[winner.character].name}奥义图`}
                className={
                  winner.character === 12
                    ? "absolute inset-0 h-full w-full object-cover opacity-75"
                    : "absolute inset-y-0 right-0 h-full w-2/3 object-contain opacity-75"
                }
              />
            )}
            <div className="relative mr-auto px-8 sm:px-16">
              <p className="mb-2 text-xs tracking-[.3em] text-pink-200">
                {view.reason}
              </p>
              <p className="text-4xl font-black italic sm:text-6xl">
                {winner ? "胜 利" : "平 局"}
              </p>
              <p className="mt-3 text-xl">
                {winner ? ROSTER[winner.character].name : "不分胜负"}
              </p>
              <p className="mt-3 text-sm text-slate-400">
                {view.config?.format === "3v3"
                  ? `剩余队员 ${view.teamRemaining.join(" : ")}`
                  : `回合比分 ${view.wins.join(" : ")}`}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {view.phase === "finished" ? "本场对战结束" : "下一战即将开始"}
              </p>
            </div>
          </div>
        )}
        {(view.paused || (view.phase === "finished" && view.phaseMs <= 0)) && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
            <div className="text-center">
              <p className="mb-2 text-[10px] tracking-[.3em] text-cyan-200">
                {view.paused ? "TAKE A BREAK" : "MATCH RESULT"}
              </p>
              <h2 className="mb-6 text-3xl font-bold">
                {view.paused
                  ? "对战已暂停"
                  : view.winner < 0
                    ? "不分胜负"
                    : `${view.fighters[view.winner]?.name} 获胜`}
              </h2>
              {view.paused && waitingForPlayers && (
                <p className="mb-5 text-sm text-cyan-100" role="status">
                  等待双方重新连接并加载角色…
                </p>
              )}
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  primary
                  onClick={() =>
                    view.paused
                      ? void runtime?.pause(false)
                      : void runtime?.restart()
                  }
                  disabled={
                    view.network.room !== null &&
                    ((!view.paused && view.network.side !== 0) ||
                      waitingForPlayers)
                  }
                >
                  {view.paused ? "继续对战" : "原阵容再战"}
                </Button>
                <Button
                  onClick={() =>
                    view.network.room
                      ? runtime?.back()
                      : runtime?.begin(
                          view.config?.mode ?? "cpu",
                          view.config?.format,
                        )
                  }
                >
                  重新选人
                </Button>
                <Button onClick={() => runtime?.back()}>主菜单</Button>
              </div>
            </div>
          </div>
        )}
      </div>
      <nav
        className="mt-4 flex flex-wrap items-center justify-center gap-2"
        aria-label="游戏操作"
      >
        <Button onClick={() => runtime?.back()}>主菜单</Button>
        <Button
          disabled={view.paused && waitingForPlayers}
          onClick={() => void runtime?.pause()}
        >
          {view.paused ? "继续" : "暂停"}
        </Button>
        <Button
          disabled={
            !!view.network.room &&
            (view.network.side !== 0 || waitingForPlayers)
          }
          onClick={() => void runtime?.restart()}
        >
          重开
        </Button>
        <Button onClick={() => runtime?.showDialog("moves")}>招式表</Button>
        <Button onClick={() => runtime?.showDialog("help")}>操作说明</Button>
        <Button
          aria-pressed={view.sound}
          onClick={() => runtime?.setSound(!view.sound)}
        >
          {view.sound ? "音效开" : "音效关"}
        </Button>
        <Button
          onClick={() => {
            const element = canvas.current?.parentElement;
            if (document.fullscreenElement) void document.exitFullscreen();
            else void element?.requestFullscreen();
          }}
        >
          全屏
        </Button>
      </nav>
      <p className="mt-3 text-center text-[10px] text-slate-500">
        {view.lastMove ||
          `AD 移动 · W 跳跃 · J/K 攻击 · L 瞬移 · U/I/O 技能${canTransform ? " · H 变身" : ""} · P 大招`}
      </p>
      {(view.error || view.network.error) && (
        <p role="alert" className="mt-3 text-center text-xs text-pink-200">
          {view.error || view.network.error}
        </p>
      )}
      {runtime && (
        <TouchControls input={runtime.input} fighter={localIdentity} />
      )}
    </section>
  );
}
function FighterHUD({
  side,
  view,
  assets,
}: {
  side: number;
  view: GameView;
  assets: Assets;
}) {
  const fighter = view.fighters[side];
  return (
    <div className={side ? "text-right" : ""}>
      <div
        className={`mb-1 flex items-center gap-2 ${side ? "flex-row-reverse" : ""}`}
      >
        <img
          src={
            bandPortrait(assets, fighter.character)?.face ??
            assets.characters[fighter.character].portrait
          }
          alt=""
          className="hidden size-9 rounded-lg border border-white/20 object-cover object-top sm:block"
        />
        <div>
          <p className="text-[10px] font-semibold sm:text-base">
            {fighter.name}
            {fighter.transformed && (
              <span className="ml-1 text-pink-200">✦</span>
            )}
          </p>
          <p className="text-[8px] text-slate-400 sm:text-[10px]">
            {side === 0 ? "1P" : view.config?.mode === "duel" ? "2P" : "CPU"} ·{" "}
            {fighter.hp} HP {fighter.beats > 0 && `· ${fighter.beats} 拍`}
          </p>
        </div>
      </div>
      <div
        role="meter"
        aria-label={`${side + 1}P 生命`}
        aria-valuemin={0}
        aria-valuemax={200}
        aria-valuenow={fighter.hp}
        className="h-2.5 overflow-hidden rounded-sm bg-slate-700 sm:h-4"
      >
        <div
          className={`h-full transition-[width] duration-75 ${side ? "ml-auto bg-cyan-200" : "bg-pink-200"}`}
          style={{ width: `${Math.max(0, fighter.hp / 2)}%` }}
        />
      </div>
      <div
        role="meter"
        aria-label={`${side + 1}P 共鸣`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={fighter.energy}
        className={`mt-1 flex items-center gap-2 ${side ? "flex-row-reverse" : ""}`}
      >
        <div className="h-1 flex-1 overflow-hidden rounded-sm bg-slate-700">
          <div
            className={`h-full ${side ? "ml-auto bg-cyan-100" : "bg-pink-100"}`}
            style={{ width: `${fighter.energy}%` }}
          />
        </div>
        <span
          aria-hidden="true"
          className="shrink-0 whitespace-nowrap font-mono text-[8px] tabular-nums text-slate-200 sm:text-[10px]"
        >
          {fighter.energy} / 100
        </span>
      </div>
      <p className="mt-1 text-[8px] text-slate-400 sm:text-[10px]">
        {view.config?.format === "3v3"
          ? `剩余 ${view.teamRemaining[side]} 人`
          : "●".repeat(view.wins[side])}{" "}
        {fighter.combo > 1 && (
          <span className="ml-2 text-white">{fighter.combo} HITS</span>
        )}
      </p>
    </div>
  );
}
