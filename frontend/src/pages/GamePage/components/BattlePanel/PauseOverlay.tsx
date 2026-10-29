import { Button } from "../../../../components/ui/Button";
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
              : `${view.config?.format === "3ffa" ? `${view.winner + 1}P · ` : ""}${view.fighters[view.winner]?.name} 获胜`}
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
            等待所有玩家重新连接并加载角色…
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
