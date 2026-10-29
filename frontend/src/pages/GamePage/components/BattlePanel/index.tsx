import { type RefObject } from "react";
import type { Assets } from "../../../../assets/objects/Assets";
import { schemeFor } from "../../../../game/controls";
import type { GameView } from "../../objects/GameView";
import { BattleConnection } from "./BattleConnection";
import { FinishOverlay } from "./FinishOverlay";
import { MobileDisplayHint } from "./MobileDisplayHint";
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
  const localIdentity = {
    character: localFighter?.character ?? 0,
    penguin: !!localFighter?.transformed,
    stageForm: !!localFighter?.transformed,
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
