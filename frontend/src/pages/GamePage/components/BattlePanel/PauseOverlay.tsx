import { Button } from "../../../../components/ui/Button";
import { teamSizeFor } from "../../../../game/battleRules";
import type { GameView } from "../../objects/GameView";
import type { BattleActions } from "./objects/BattleActions";
import { isWaitingForPlayers } from "./functions/isWaitingForPlayers";

export function PauseOverlay({
  view,
  runtime,
  fullField,
  onToggleFull,
  className,
}: {
  view: GameView;
  runtime: BattleActions | null;
  fullField: boolean;
  onToggleFull?: () => void;
  className: string;
}) {
  const finished = view.phase === "finished" && view.phaseMs <= 0;
  if (!view.paused && !finished) return null;
  const waitingForPlayers = isWaitingForPlayers(view);
  const online = !!view.network.room;
  const host = !online || view.network.side === 0;
  const rules = view.config?.rules;
  return (
    <div
      data-battle-menu={finished ? "result" : "pause"}
      className={`${className} flex items-center justify-center overflow-y-auto bg-void/80 px-[max(1rem,env(safe-area-inset-left))] py-[max(1rem,env(safe-area-inset-top),env(safe-area-inset-bottom))] pr-[max(1rem,env(safe-area-inset-right))]`}
    >
      <section
        aria-label={finished ? "对战结果" : "暂停菜单"}
        className="my-auto w-full max-w-lg bg-void p-5 text-ivory shadow-2xl sm:p-7 [@media(max-height:500px)]:max-w-2xl [@media(max-height:500px)]:p-4"
      >
        <p className="mb-2 text-xs font-semibold tracking-[.16em] text-muted">
          {finished
            ? "本场对战结束"
            : online
              ? "联机对战 · 已暂停"
              : "对战已暂停"}
        </p>
        <h2 className="text-2xl font-black sm:text-3xl">
          {finished
            ? view.winner < 0
              ? "不分胜负"
              : `${view.winner + 1}P · ${view.fighters[view.winner]?.name} 获胜`
            : waitingForPlayers
              ? "等待玩家重新连接"
              : "休息一下，随时继续"}
        </h2>
        {finished && (
          <div className="mt-4 flex items-center justify-between gap-3 py-3">
            <span className="text-xs text-muted">
              {teamSizeFor(view.config?.format) > 1 ? "剩余角色" : "回合比分"}
            </span>
            <strong className="font-mono text-xl tabular-nums">
              {(teamSizeFor(view.config?.format) > 1
                ? view.teamRemaining
                : view.wins
              ).join(" : ")}
            </strong>
          </div>
        )}
        {online && (
          <p className="mt-3 text-sm leading-6 text-muted" role="status">
            {waitingForPlayers
              ? "所有玩家恢复连接并加载完成后，即可继续。"
              : !host
                ? finished
                  ? "等待房主再开一局，也可以返回房间更换角色。"
                  : "暂停会同步给所有玩家；任意玩家都可继续对战。"
                : finished
                  ? "再来一局沿用当前阵容；返回房间可重新选人。"
                  : "暂停已同步给所有玩家。"}
          </p>
        )}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button
            primary
            className="col-span-2"
            disabled={!runtime || waitingForPlayers || (finished && !host)}
            onClick={() =>
              finished ? void runtime?.restart() : void runtime?.pause(false)
            }
          >
            {finished
              ? host
                ? "再来一局"
                : "等待房主再开一局"
              : waitingForPlayers
                ? "等待连接恢复…"
                : "继续对战"}
          </Button>
          {!finished && host && (
            <Button
              disabled={!runtime || waitingForPlayers}
              onClick={() => void runtime?.restart()}
            >
              重新开始
            </Button>
          )}
          <Button
            className={finished || !host ? "col-span-2" : ""}
            disabled={!runtime}
            onClick={() =>
              online
                ? runtime?.back()
                : runtime?.begin(
                    view.config?.mode ?? "cpu",
                    view.config?.format,
                  )
            }
          >
            {online ? "返回房间选人" : "重新选人"}
          </Button>
          <Button
            className="col-span-2"
            disabled={!runtime}
            onClick={() => runtime?.returnToMenu()}
          >
            {online ? "离开房间 · 返回主菜单" : "返回主菜单"}
          </Button>
        </div>
        {!finished && (
          <div className="mt-4 flex flex-wrap gap-2 pt-4">
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
              {view.sound ? "音效：开" : "音效：关"}
            </Button>
            {onToggleFull && (
              <Button onClick={onToggleFull}>
                {fullField ? "退出全屏" : "进入全屏"}
              </Button>
            )}
          </div>
        )}
        {rules && !finished && (
          <details className="mt-3 text-xs leading-6 text-muted">
            <summary className="w-fit cursor-pointer focus-visible:outline-2 focus-visible:outline-ember">
              本局规则
            </summary>
            <p className="mt-1">
              {[
                `${rules.maxHealth} 生命`,
                rules.infiniteTime ? "无限时间" : `${rules.roundSeconds} 秒`,
                `伤害 ×${rules.damageMultiplier}`,
                `移速 ×${rules.speedMultiplier}`,
                rules.oneHitKO && "一击决胜",
                rules.vampire && "吸血对战",
                rules.lowGravity && "低重力",
                rules.infiniteJumps && "无限空中跳跃",
                rules.disableGuard && "禁用防御",
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </details>
        )}
        {(view.error || view.network.error) && (
          <p role="alert" className="mt-3 text-sm text-ember">
            {view.error || view.network.error}
          </p>
        )}
      </section>
    </div>
  );
}
