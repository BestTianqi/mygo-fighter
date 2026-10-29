import type { Assets } from "../../../../assets/objects/Assets";
import { teamSizeFor } from "../../../../game/battleRules";
import { MOVES, ROSTER } from "../../../../game/engine";
import { finishArtFor } from "../../functions/finishArtFor";
import { ultimateFinishFor } from "../../functions/ultimateFinishFor";
import type { GameView } from "../../objects/GameView";
import { backgroundVideoEnabled } from "../../runtime/display/backgroundVideoEnabled";
import { FinishBackground } from "./FinishBackground";
import { FinishEffects } from "./FinishEffects";
import { finishMotion } from "./functions/finishMotion";

/** Result art follows the shared round-end clock rather than a mount-time animation. */
export function FinishOverlay({
  view,
  assets,
  className,
}: {
  view: GameView;
  assets: Assets;
  className: string;
}) {
  const finish = view.roundEnd;
  if (!finish || (view.phase !== "roundOver" && view.phase !== "finished"))
    return null;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const motion = finishMotion(view.phaseMs, finish.winner, reducedMotion);
  if (!motion) return null;
  const ultimate = finish.finisher;
  const presentation = ultimate
    ? ultimateFinishFor(assets, ultimate)
    : undefined;
  const showVideo = !!presentation?.video && backgroundVideoEnabled();
  // The shared clock includes the entrance and exit in the one-second cut-in.
  // Keep static art visible where native video is disabled (Baidu).
  const foreground = showVideo
    ? finishMotion(view.phaseMs, finish.winner, reducedMotion, 1000)
    : motion;
  const winner =
    ultimate ?? (finish.winner >= 0 ? finish.fighters[finish.winner] : null);
  const left = finish.winner === 0;
  const finishArt = winner ? finishArtFor(assets, winner, !!ultimate) : "";
  const transitionDuration = view.paused || reducedMotion ? "0ms" : "34ms";
  return (
    <div
      data-finish-cutin={motion.phase}
      data-winner-side={finish.winner}
      data-ultimate-finish={!!ultimate}
      data-finish-attack={ultimate?.attack}
      data-finish-scene={!!presentation}
      className={`${className} pointer-events-none flex items-center overflow-hidden bg-slate-950/85 transition-[opacity,clip-path] ease-linear motion-reduce:transition-none`}
      style={{
        opacity: motion.opacity,
        clipPath: motion.clipPath,
        transitionDuration,
      }}
    >
      {showVideo && presentation?.video && (
        <FinishBackground
          key={`${finish.tick}:${presentation.video}`}
          src={presentation.video}
          timeMs={view.finishVideoMs}
          paused={view.paused}
        />
      )}
      {foreground && (
        <div
          data-finish-foreground={foreground.phase}
          className="absolute inset-0 flex items-center"
          style={{ opacity: foreground.opacity, transitionDuration }}
        >
          {winner && (
            <img
              src={finishArt}
              alt={`${ROSTER[winner.character].name}奥义图`}
              draggable={false}
              className={`absolute transition-transform ease-linear motion-reduce:transition-none ${showVideo ? (left ? "[mask-image:linear-gradient(to_right,black_40%,transparent_95%)]" : "[mask-image:linear-gradient(to_left,black_40%,transparent_95%)]") : ""} ${
                presentation
                  ? "inset-0 h-full w-full object-cover opacity-80 portrait:object-contain"
                  : winner.character === 12
                    ? "inset-0 h-full w-full object-cover opacity-85"
                    : `inset-y-0 h-full w-2/3 object-contain opacity-95 ${left ? "left-0" : "right-0"}`
              }`}
              style={{
                transform: `translate3d(${foreground.artX}%,0,0) scale(${foreground.artScale})${presentation && !left ? " scaleX(-1)" : ""}`,
                transitionDuration,
              }}
            />
          )}
          <div
            aria-hidden="true"
            className={`absolute inset-0 ${left ? "bg-linear-to-l" : "bg-linear-to-r"} ${showVideo ? "from-slate-950/75" : "from-slate-950/95"} via-slate-950/25 to-transparent`}
          />
          {ultimate && (
            <div className={`absolute inset-0 ${left ? "" : "-scale-x-100"}`}>
              <FinishEffects
                age={motion.age}
                color={ROSTER[ultimate.character].color}
                reducedMotion={reducedMotion}
              />
            </div>
          )}
          <div
            className={`relative w-[52%] px-4 transition-[transform,opacity] ease-linear motion-reduce:transition-none sm:px-12 ${left ? "ml-auto text-right" : "mr-auto text-left"}`}
            style={{
              transform: `translate3d(${foreground.textX}%,0,0)`,
              opacity: foreground.textOpacity,
              transitionDuration,
            }}
          >
            <p className="mb-1 text-[8px] tracking-[.2em] text-pink-200 sm:mb-2 sm:text-xs sm:tracking-[.3em]">
              {ultimate ? "ULTIMATE FINISH" : view.reason}
            </p>
            <p
              className={`text-2xl font-black italic sm:text-6xl ${ultimate ? "text-amber-100 drop-shadow-[0_3px_0_#9b4a21]" : ""}`}
            >
              {ultimate ? "奥义终结" : winner ? "胜 利" : "平 局"}
            </p>
            {ultimate && (
              <p className="mt-1 text-[10px] font-bold tracking-[.12em] text-amber-200 sm:mt-3 sm:text-sm sm:tracking-[.22em]">
                {MOVES[ultimate.attack]?.name}
              </p>
            )}
            {presentation?.line && (
              <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-white/90 sm:mt-3 sm:line-clamp-3 sm:text-base">
                「{presentation.line}」
              </p>
            )}
            <p className="mt-1 text-sm sm:mt-3 sm:text-xl">
              {winner ? ROSTER[winner.character].name : "不分胜负"}
            </p>
            <p className="mt-1 text-[10px] text-slate-400 sm:mt-3 sm:text-sm">
              {teamSizeFor(view.config?.format) > 1
                ? `剩余队员 ${view.teamRemaining.join(" : ")}`
                : `回合比分 ${view.wins.join(" : ")}`}
            </p>
            <p className="mt-1 text-[9px] text-slate-500 sm:mt-2 sm:text-xs">
              {view.phase === "finished" ? "本场对战结束" : "下一战即将开始"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
