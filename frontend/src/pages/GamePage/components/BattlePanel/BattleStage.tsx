import { type ReactNode, type RefObject } from "react";
import type { GameView } from "../../objects/GameView";
import { backgroundVideoEnabled } from "../../runtime/display/backgroundVideoEnabled";

import { UltimateBackgroundVideo } from "./UltimateBackgroundVideo";

export function BattleStage({
  canvas,
  view,
  immersive,
  onClearCutin,
  children,
}: {
  canvas: RefObject<HTMLCanvasElement | null>;
  view: GameView;
  immersive: boolean;
  onClearCutin: (side: number) => void;
  children: ReactNode;
}) {
  const videos = view.cutins.flatMap((media, side) =>
    media?.video ? [{ media, side }] : [],
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
            ? "relative aspect-video w-[min(100cqw,calc(100cqh*16/9))] overflow-hidden bg-slate-950"
            : "relative overflow-hidden rounded-none bg-slate-950 shadow-2xl"
        }
      >
        {videos.length > 0 && backgroundVideoEnabled() && (
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 grid divide-x divide-white/25 ${videos.length === 3 ? "grid-cols-3" : videos.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
          >
            {videos.map(({ media, side }) => (
              <UltimateBackgroundVideo
                key={`${side}:${media.video}`}
                media={media}
                paused={view.paused}
                onEnd={() => onClearCutin(side)}
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
        {children}
      </div>
    </div>
  );
}
