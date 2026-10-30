import { type RefObject } from "react";
import type { Assets } from "../../../../assets/objects/Assets";
import { schemeFor } from "../../../../game/controls";
import { bandFor } from "../../../../game/bands";
import type { GameView } from "../../objects/GameView";
import { BattleConnection } from "./BattleConnection";
import { FinishOverlay } from "./FinishOverlay";
import type { BattleActions } from "./objects/BattleActions";
import { TouchControls } from "./TouchControls";

import {
  BattleToolbar,
  FullFieldControls,
  MobileBattleBar,
} from "./BattleControls";
import { BattleHUD } from "./BattleHUD";
import { MobileBattleNotices, WindowedBattleHeader } from "./BattleNotices";
import { BattleStage } from "./BattleStage";
import { isWaitingForPlayers } from "./functions/isWaitingForPlayers";
import { useBattleDisplay } from "./hooks/useBattleDisplay";
import { PauseOverlay } from "./PauseOverlay";

export function BattlePanel({
  canvas,
  assets,
  runtime,
  view,
  mobile,
}: {
  canvas: RefObject<HTMLCanvasElement | null>;
  assets: Assets;
  runtime: BattleActions | null;
  view: GameView;
  mobile: boolean;
}) {
  const localFighter = view.fighters[view.network.room ? view.network.side : 0];
  const localBand = bandFor(localFighter?.character ?? 0).id;
  const localIdentity = {
    character: localFighter?.character ?? 0,
    penguin: localBand === "mygo" && !!localFighter?.transformed,
    stageForm: localBand === "mujica" && !!localFighter?.transformed,
  };
  const canTransform =
    !!schemeFor(localIdentity).transform &&
    !view.config?.rules?.disableTransform;
  const waitingForPlayers = isWaitingForPlayers(view);
  const { fullField, immersive, toggleFullField } = useBattleDisplay(
    view.screen,
    mobile,
  );
  return (
    <section
      hidden={view.screen !== "battle"}
      className={
        immersive
          ? "fixed inset-0 z-30 flex h-dvh touch-manipulation flex-col overflow-hidden bg-void text-ivory select-none"
          : "mx-auto flex min-h-dvh max-w-[1440px] flex-col bg-void text-ivory px-2 py-3 sm:px-6 sm:py-6"
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
        <WindowedBattleHeader view={view} assets={assets} />
      )}
      {mobile && <MobileBattleNotices view={view} />}
      <BattleStage
        canvas={canvas}
        view={view}
        immersive={immersive}
        onClearCutin={(side) => runtime?.clearCutin(side)}
      >
        <BattleHUD
          view={view}
          assets={assets}
          mobile={mobile}
          fullField={fullField}
        />
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
      </BattleStage>
      {fullField && (
        <FullFieldControls
          view={view}
          runtime={runtime}
          waitingForPlayers={waitingForPlayers}
          toggleFullField={toggleFullField}
        />
      )}
      {!immersive && (
        <BattleToolbar
          view={view}
          runtime={runtime}
          waitingForPlayers={waitingForPlayers}
          toggleFullField={toggleFullField}
          canTransform={canTransform}
        />
      )}
      {fullField && <BattleConnection view={view} />}
      {fullField && !mobile && (
        <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[10px] tracking-widest text-muted">
          ESC 退出全屏 · 右上角暂停设置
        </p>
      )}
      {mobile &&
        view.screen === "battle" &&
        !view.paused &&
        view.phase !== "finished" &&
        !view.dialog && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-linear-to-t from-void/85 via-void/35 to-transparent pt-14">
            <div className="pointer-events-none pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pb-[max(0.375rem,env(safe-area-inset-bottom))]">
              {runtime && (
                <TouchControls
                  assets={assets}
                  interactionKey={`${view.round}:${view.phase}:${view.paused}`}
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
