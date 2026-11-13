import { type ReactNode, type RefObject } from "react";
import type { GameView } from "../../objects/GameView";
import { backgroundVideoEnabled } from "../../runtime/display/backgroundVideoEnabled";

import { UltimateBackgroundVideo } from "./UltimateBackgroundVideo";
import { superStageTransition } from "../../functions/superStageTransition";

export function BattleStage({
  canvas,
  view,
  immersive,
  onClearCutin,
  hud,
  children,
}: {
  canvas: RefObject<HTMLCanvasElement | null>;
  view: GameView;
  immersive: boolean;
  onClearCutin: (side: number) => void;
  hud: ReactNode;
  children: ReactNode;
}) {
  const cutins = backgroundVideoEnabled() ? view.cutins : [];
  const transition = superStageTransition(view.superCasts, cutins, view.phase);
  const videos = cutins.flatMap((media, side) =>
    media?.video ? [{ media, side, cast: view.superCasts[side] }] : [],
  );
  return (
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
            ? "relative aspect-video w-[min(100cqw,calc(100cqh*16/9))] overflow-hidden bg-void"
            : "relative overflow-hidden rounded-none bg-void shadow-2xl"
        }
      >
        {videos.length > 0 && (
          <div
            aria-hidden="true"
            style={{ visibility: transition.showVideo ? "visible" : "hidden" }}
            className={`pointer-events-none absolute inset-0 grid divide-x divide-white/25 ${videos.length === 3 ? "grid-cols-3" : videos.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
          >
            {videos.map(({ media, side, cast }) => (
              <UltimateBackgroundVideo
                key={`${view.round}:${side}:${cast?.id}:${media.video}`}
                media={media}
                prepared={
                  // Simultaneous mirror casts need independent media elements.
                  videos.find((entry) => entry.media.video === media.video)
                    ?.side === side
                    ? view.preparedSuperVideos.get(media.video!)
                    : undefined
                }
                timeMs={cast?.elapsedMs ?? 0}
                paused={
                  view.paused || !!cast?.held || (cast?.elapsedMs ?? 0) < 0
                }
                onEnd={() => onClearCutin(side)}
              />
            ))}
            <div
              className="absolute inset-0 bg-black"
              style={{ opacity: 0.32 * transition.stageOpacity }}
            />
          </div>
        )}
        <canvas
          ref={canvas}
          tabIndex={-1}
          aria-label="MyGO 格斗对战画面"
          className="relative block aspect-video w-full outline-none"
          style={{ opacity: transition.stageOpacity }}
          width={960}
          height={540}
        />
        <div
          style={{ opacity: transition.stageOpacity }}
          aria-hidden={transition.stageOpacity === 0}
        >
          {hud}
        </div>
        {transition.blackOpacity > 0 && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 bg-black"
            style={{ opacity: transition.blackOpacity }}
          />
        )}
        {children}
      </div>
    </div>
  );
}
