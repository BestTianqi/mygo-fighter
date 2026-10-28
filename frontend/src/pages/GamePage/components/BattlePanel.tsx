import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type { Assets, Presentation } from "../../../game/objects/Assets";
import type { GameRuntime } from "../functions/GameRuntime";
import type { GameView } from "../objects/GameView";
import { bandPortrait } from "../functions/bandArt";
import { Button } from "../../../components/ui/Button";
import { schemeFor } from "../../../game/controls";
import { teamSizeFor } from "../../../game/battleRules";
import {
  enterImmersive,
  exitImmersive,
  isImmersive,
} from "../functions/immersive";
import { TouchControls } from "./TouchControls";
import { FinishOverlay } from "./FinishOverlay";
import { BattleConnection } from "./BattleConnection";
import { MobileDisplayHint } from "./MobileDisplayHint";

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

function isWaitingForPlayers(view: GameView) {
  return (
    !!view.network.room &&
    (view.network.status !== "playing" ||
      !view.network.room.players.every(
        (player) => player?.connected && player.loaded,
      ))
  );
}

function PauseOverlay({
  view,
  runtime,
  fullField,
  onToggleFull,
  className,
}: {
  view: GameView;
  runtime: GameRuntime | null;
  fullField: boolean;
  onToggleFull?: () => void;
  className: string;
}) {
  if (!view.paused && !(view.phase === "finished" && view.phaseMs <= 0))
    return null;
  const waitingForPlayers = isWaitingForPlayers(view);
  return (
    <div
      className={`${className} flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm`}
    >
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
        {view.config?.rules && (
          <p className="mx-auto mb-5 max-w-lg text-xs leading-6 text-slate-300">
            {[
              `${view.config.rules.maxHealth} 生命`,
              view.config.rules.infiniteTime
                ? "无限时间"
                : `${view.config.rules.roundSeconds} 秒`,
              `伤害 ×${view.config.rules.damageMultiplier}`,
              `移速 ×${view.config.rules.speedMultiplier}`,
              view.config.rules.oneHitKO && "一击决胜",
              view.config.rules.vampire && "吸血对战",
              view.config.rules.lowGravity && "低重力",
              view.config.rules.infiniteJumps && "无限空中跳跃",
              view.config.rules.disableGuard && "禁用防御",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        {view.paused && waitingForPlayers && (
          <p className="mb-5 text-sm text-cyan-100" role="status">
            等待双方重新连接并加载角色…
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            primary
            onClick={() =>
              view.paused ? void runtime?.pause(false) : void runtime?.restart()
            }
            disabled={
              view.network.room !== null &&
              ((!view.paused && view.network.side !== 0) || waitingForPlayers)
            }
          >
            {view.paused ? "继续对战" : "原阵容再战"}
          </Button>
          {view.paused && (
            <Button
              disabled={
                !!view.network.room &&
                (view.network.side !== 0 || waitingForPlayers)
              }
              onClick={() => void runtime?.restart()}
            >
              重新开始
            </Button>
          )}
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
          {view.paused && (
            <>
              <Button
                disabled={!runtime}
                onClick={() => runtime?.showDialog("moves")}
              >
                招式表
              </Button>
              <Button
                disabled={!runtime}
                onClick={() => runtime?.showDialog("help")}
              >
                操作说明
              </Button>
              <Button
                disabled={!runtime}
                aria-pressed={view.sound}
                onClick={() => runtime?.setSound(!view.sound)}
              >
                {view.sound ? "音效开" : "音效关"}
              </Button>
            </>
          )}
          {onToggleFull && (
            <Button onClick={onToggleFull}>
              {fullField ? "退出全屏" : "全屏"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function BarButton({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-11 shrink-0 touch-none items-center justify-center rounded-none bg-white/8 backdrop-blur-sm text-sm font-semibold text-slate-100 select-none active:bg-white/20 disabled:opacity-35"
    >
      {children}
    </button>
  );
}

/** Floating buttons stay reachable while the full-field stage hides the toolbar. */
function FieldButton({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="pointer-events-auto flex size-11 touch-none items-center justify-center rounded-none bg-slate-950/55 backdrop-blur-md text-sm font-semibold text-slate-100 shadow-lg select-none active:bg-white/20 disabled:opacity-35"
    >
      {children}
    </button>
  );
}

/** Compact battle controls replace the wide page buttons on touch devices. */
function MobileBattleBar({
  assets,
  runtime,
  view,
  onEnterFull,
}: {
  assets: Assets;
  runtime: GameRuntime | null;
  view: GameView;
  onEnterFull: () => void;
}) {
  const room = view.network.room;
  const status = room
    ? view.network.status === "reconnecting"
      ? "正在重连"
      : room.players.some((player) => !player?.connected)
        ? "等待对方重连"
        : `${view.network.side + 1}P · ${view.network.rtt === null ? "连接中" : view.network.rtt + " ms RTT"}`
    : assets.stages[view.config?.settings.arena ?? 0].name;
  return (
    <header className="relative z-40 flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-slate-950/80 px-[max(0.5rem,env(safe-area-inset-left))] py-1.5 pr-[max(0.5rem,env(safe-area-inset-right))] pt-[calc(0.375rem+env(safe-area-inset-top))]">
      <div className="flex min-w-0 items-center gap-2">
        <BarButton label="返回主菜单" onClick={() => runtime?.back()}>
          ←
        </BarButton>
        <span className="truncate text-[10px] tracking-widest text-slate-400 landscape:inline">
          {status}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <BarButton
          label={view.paused ? "继续对战" : "暂停对战"}
          onClick={() => void runtime?.pause()}
          disabled={!runtime || (view.paused && isWaitingForPlayers(view))}
        >
          {view.paused ? "▶" : "Ⅱ"}
        </BarButton>
        <BarButton
          label="招式表"
          onClick={() => runtime?.showDialog("moves")}
          disabled={!runtime}
        >
          招
        </BarButton>
        <BarButton
          label="操作说明"
          onClick={() => runtime?.showDialog("help")}
          disabled={!runtime}
        >
          ?
        </BarButton>
        <BarButton
          label={view.sound ? "关闭音效" : "开启音效"}
          onClick={() => runtime?.setSound(!view.sound)}
          disabled={!runtime}
        >
          {view.sound ? "音" : "静"}
        </BarButton>
        <BarButton label="进入全屏" onClick={onEnterFull}>
          全屏
        </BarButton>
      </div>
    </header>
  );
}

export function BattlePanel({
  canvas,
  assets,
  runtime,
  view,
  mobile,
}: {
  canvas: RefObject<HTMLCanvasElement | null>;
  assets: Assets;
  runtime: GameRuntime | null;
  view: GameView;
  mobile: boolean;
}) {
  const localFighter = view.fighters[view.network.room ? view.network.side : 0];
  const localIdentity = {
    character: localFighter?.character ?? 0,
    penguin: !!localFighter?.transformed,
    stageForm: !!localFighter?.transformed,
  };
  const canTransform =
    !!schemeFor(localIdentity).transform &&
    !view.config?.rules?.disableTransform;
  const videos = view.cutins.flatMap((media, side) =>
    media?.video ? [{ media, side }] : [],
  );
  const waitingForPlayers = isWaitingForPlayers(view);
  /** Full-field mode removes the in-app toolbar so the arena uses the whole viewport. */
  const [fullField, setFullField] = useState(true);
  const lastScreen = useRef(view.screen);
  useEffect(() => {
    if (view.screen === "battle" && lastScreen.current !== "battle")
      setFullField(true);
    lastScreen.current = view.screen;
  }, [mobile, view.screen]);
  useEffect(() => {
    const sync = () => {
      if (!isImmersive()) setFullField(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && view.screen === "battle") {
        setFullField(false);
        void exitImmersive();
      }
    };
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    window.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
      window.removeEventListener("keydown", escape);
    };
  }, [view.screen]);
  const immersive = mobile || fullField;
  const toggleFullField = () => {
    const enabled = !fullField;
    setFullField(enabled);
    if (enabled) void enterImmersive();
    else void exitImmersive();
  };
  return (
    <section
      hidden={view.screen !== "battle"}
      className={
        immersive
          ? "fixed inset-0 z-30 flex h-dvh touch-none flex-col overflow-hidden bg-[#080e1c] text-slate-100 select-none"
          : "mx-auto flex min-h-dvh max-w-[1440px] flex-col bg-[#080e1c] text-slate-100 px-2 py-3 sm:px-6 sm:py-6"
      }
      aria-label="对战舞台"
    >
      {immersive ? (
        fullField ? null : (
          <MobileBattleBar
            assets={assets}
            runtime={runtime}
            view={view}
            onEnterFull={toggleFullField}
          />
        )
      ) : (
        <>
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
                  : view.network.room.players.some(
                        (player) => !player?.connected,
                      )
                    ? "等待对方重连"
                    : `${view.network.side + 1}P · ${view.network.rtt === null ? "连接中" : view.network.rtt + " ms RTT"}`}
              </span>
            )}
          </header>
        </>
      )}
      {mobile && (
        <>
          {view.network.status === "error" && view.network.error && (
            <p
              role="alert"
              className="pointer-events-none absolute inset-x-2 top-[calc(env(safe-area-inset-top)+3.75rem)] z-50 rounded-none bg-slate-950/90 px-3 py-2 text-center text-xs text-pink-200"
            >
              {view.network.error}
            </p>
          )}
          {view.connectionStalled && (
            <p
              role="status"
              className="pointer-events-none absolute inset-x-2 top-[calc(env(safe-area-inset-top)+3.75rem)] z-50 rounded-none bg-slate-950/90 px-3 py-2 text-center text-xs text-amber-200"
            >
              网络更新延迟，正在等待同步…
            </p>
          )}
          {view.error && (
            <p
              role="alert"
              className="pointer-events-none absolute inset-x-2 top-[calc(env(safe-area-inset-top)+3.75rem)] z-50 rounded-none bg-slate-950/90 px-3 py-2 text-center text-xs text-pink-200"
            >
              {view.error}
            </p>
          )}
        </>
      )}
      <div
        className={
          immersive
            ? "relative flex min-h-0 flex-1 items-center justify-center [container-type:size]"
            : undefined
        }
      >
        <div
          className={
            immersive
              ? "relative aspect-video w-[min(100cqw,calc(100cqh*16/9))] overflow-hidden bg-slate-950"
              : "relative overflow-hidden rounded-none bg-slate-950 shadow-2xl"
          }
        >
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
          <div
            aria-label="对战状态"
            className={`pointer-events-none absolute inset-x-0 top-0 z-10 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3 bg-linear-to-b from-slate-950/95 to-transparent ${
              fullField
                ? "px-[max(0.75rem,env(safe-area-inset-left),env(safe-area-inset-right))] pt-[calc(max(0.5rem,env(safe-area-inset-top))+3.25rem)] pb-8 sm:gap-6"
                : mobile
                  ? "px-[max(0.75rem,env(safe-area-inset-left),env(safe-area-inset-right))] pt-6 pb-8"
                  : "p-3 pt-8 pb-12 sm:gap-6 sm:p-6 sm:pt-9 sm:pb-16"
            }`}
          >
            {view.fighters[0] && (
              <FighterHUD
                side={0}
                view={view}
                assets={assets}
                mobile={mobile}
              />
            )}
            <div className="text-center">
              <p
                aria-label={
                  view.config?.rules?.infiniteTime ? "无限时间" : "剩余时间"
                }
                className={`font-mono text-2xl font-bold text-white ${mobile ? "" : "sm:text-4xl"}`}
              >
                {view.config?.rules?.infiniteTime
                  ? "∞"
                  : Math.ceil(view.remaining / 1000)
                      .toString()
                      .padStart(2, "0")}
              </p>
              <small className="text-[8px] text-slate-400 sm:text-[10px]">
                ROUND {view.round}
              </small>
              {view.config?.rules?.oneHitKO && (
                <p className="mt-1 text-[9px] font-semibold text-amber-200">
                  一击决胜
                </p>
              )}
            </div>
            {view.fighters[1] && (
              <FighterHUD
                side={1}
                view={view}
                assets={assets}
                mobile={mobile}
              />
            )}
          </div>
          {!immersive && (
            <>
              <FinishOverlay
                view={view}
                assets={assets}
                className="absolute inset-0 z-20"
              />
              <PauseOverlay
                view={view}
                runtime={runtime}
                fullField={false}
                className="absolute inset-0 z-30"
              />
            </>
          )}
        </div>
      </div>
      {fullField && (
        <div
          role="group"
          aria-label="全屏快捷操作"
          className="absolute right-[max(0.5rem,env(safe-area-inset-right))] top-[max(0.5rem,env(safe-area-inset-top))] z-40 flex items-center gap-1.5"
        >
          <FieldButton
            label={view.paused ? "继续对战" : "暂停对战"}
            onClick={() => void runtime?.pause()}
            disabled={!runtime || (view.paused && waitingForPlayers)}
          >
            {view.paused ? "▶" : "Ⅱ"}
          </FieldButton>
          <FieldButton label="退出全屏" onClick={toggleFullField}>
            退出
          </FieldButton>
        </div>
      )}
      {!immersive && (
        <>
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
            <Button onClick={() => runtime?.showDialog("help")}>
              操作说明
            </Button>
            <Button
              aria-pressed={view.sound}
              onClick={() => runtime?.setSound(!view.sound)}
            >
              {view.sound ? "音效开" : "音效关"}
            </Button>
            <Button onClick={toggleFullField}>全屏</Button>
          </nav>
          <p className="mt-3 text-center text-[10px] text-slate-500">
            {view.lastMove ||
              `AD 移动 · W 跳跃${view.config?.rules?.disableNormals ? "" : " · J/K 攻击"} · L 瞬移 · U/I/O 技能${canTransform ? " · H 变身" : ""}${view.config?.rules?.disableSupers ? "" : " · P 大招"}`}
          </p>
          {(view.error || view.network.error) && (
            <p role="alert" className="mt-3 text-center text-xs text-pink-200">
              {view.error || view.network.error}
            </p>
          )}
        </>
      )}
      {immersive && <BattleConnection view={view} />}
      {fullField && !mobile && (
        <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[10px] tracking-widest text-slate-400">
          ESC 退出全屏 · 右上角暂停设置
        </p>
      )}
      {mobile && view.screen === "battle" && <MobileDisplayHint />}
      {mobile && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-linear-to-t from-slate-950/85 via-slate-950/35 to-transparent pt-14">
          <div className="pointer-events-auto pl-[max(0.25rem,env(safe-area-inset-left))] pr-[max(0.25rem,env(safe-area-inset-right))] pb-[max(0.375rem,env(safe-area-inset-bottom))]">
            {runtime && (
              <TouchControls
                input={runtime.input}
                fighter={localIdentity}
                rules={view.config?.rules}
              />
            )}
          </div>
        </div>
      )}
      {immersive && (
        <>
          <FinishOverlay
            view={view}
            assets={assets}
            className="fixed inset-0 z-40"
          />
          <PauseOverlay
            view={view}
            runtime={runtime}
            fullField={fullField}
            onToggleFull={toggleFullField}
            className="fixed inset-0 z-50"
          />
        </>
      )}
    </section>
  );
}

function FighterHUD({
  side,
  view,
  assets,
  mobile,
}: {
  side: number;
  view: GameView;
  assets: Assets;
  mobile: boolean;
}) {
  const fighter = view.fighters[side];
  return (
    <div className={`min-w-0 ${side ? "text-right" : ""}`}>
      <div
        className={`mb-1 flex items-center gap-2 ${side ? "flex-row-reverse" : ""}`}
      >
        {!mobile && (
          <img
            src={
              bandPortrait(assets, fighter.character)?.face ??
              assets.characters[fighter.character].portrait
            }
            alt=""
            className="hidden size-9 rounded-none object-cover object-top sm:block"
          />
        )}
        <div className="min-w-0">
          <p
            className={`truncate text-[10px] font-semibold ${mobile ? "sm:text-xs" : "sm:text-base"}`}
          >
            {fighter.name}
            {fighter.transformed && (
              <span className="ml-1 text-pink-200">✦</span>
            )}
            {fighter.lifesteal && (
              <span
                aria-label="吸血效果"
                className="ml-2 text-[9px] font-normal text-rose-200 sm:text-xs"
              >
                吸血 {Math.round(fighter.lifesteal.ratio * 100)}% ·{" "}
                {Math.ceil(fighter.lifesteal.ms / 1000)}秒
              </span>
            )}
            {view.config?.rules?.vampire && !fighter.lifesteal && (
              <span className="ml-2 text-[9px] font-normal text-rose-200 sm:text-xs">
                吸血 25%
              </span>
            )}
          </p>
          <p
            className={`text-[8px] text-slate-400 ${mobile ? "" : "sm:text-[10px]"}`}
          >
            {side === 0
              ? "1P"
              : view.network.room || view.config?.mode === "duel"
                ? "2P"
                : "CPU"}{" "}
            · {fighter.hp} / {view.config?.rules?.maxHealth ?? 200} HP{" "}
            {fighter.beats > 0 && `· ${fighter.beats} 拍`}
          </p>
        </div>
      </div>
      <div
        role="meter"
        aria-label={`${side + 1}P 生命`}
        aria-valuemin={0}
        aria-valuemax={view.config?.rules?.maxHealth ?? 200}
        aria-valuenow={fighter.hp}
        className={`h-2.5 overflow-hidden rounded-none bg-slate-700 ${mobile ? "sm:h-3" : "sm:h-4"}`}
      >
        <div
          className={`h-full transition-[width] duration-75 ${side ? "ml-auto bg-cyan-200" : "bg-pink-200"}`}
          style={{
            width: `${Math.max(0, Math.min(100, (fighter.hp / (view.config?.rules?.maxHealth ?? 200)) * 100))}%`,
          }}
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
        <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-none bg-slate-700">
          <div
            className={`h-full ${side ? "ml-auto bg-cyan-100" : "bg-pink-100"}`}
            style={{ width: `${fighter.energy}%` }}
          />
        </div>
        <span
          aria-hidden="true"
          className={`w-[9ch] shrink-0 whitespace-nowrap text-center font-mono text-[8px] tabular-nums text-slate-200 ${mobile ? "" : "sm:text-[10px]"}`}
        >
          {view.config?.rules?.infiniteEnergy
            ? "∞ 共鸣"
            : `${fighter.energy} / 100`}
        </span>
      </div>
      <p
        className={`mt-1 text-[8px] text-slate-400 ${mobile ? "" : "sm:text-[10px]"}`}
      >
        {teamSizeFor(view.config?.format) > 1
          ? `剩余 ${view.teamRemaining[side]} 人`
          : "●".repeat(view.wins[side])}{" "}
        {fighter.combo > 1 && (
          <span className="ml-2 text-white">{fighter.combo} HITS</span>
        )}
      </p>
    </div>
  );
}
