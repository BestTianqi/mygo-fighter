import { useEffect, useRef } from "react";
import type { Assets } from "../../assets/objects/Assets";
import { enterImmersive, exitImmersive } from "./runtime/display/immersive";
import { useGame } from "./hooks/useGame";
import { useMobilePlay } from "./hooks/useMobilePlay";
import { MainMenu } from "./components/MainMenu";
import { CharacterSelection } from "./components/CharacterSelection";
import { BattlePanel } from "./components/BattlePanel";
import { LanLobby } from "./components/LanLobby";
import { GameDialogs } from "./components/GameDialogs";
export function GamePage({ assets }: { assets: Assets }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const mobile = useMobilePlay();
  const { runtime, view } = useGame(assets, canvas);
  useEffect(() => {
    if (view.screen === "menu" || view.screen === "selection")
      void exitImmersive();
  }, [mobile, view.screen]);
  return (
    <main className="min-h-dvh bg-void text-ivory">
      {view.screen === "menu" && (
        <MainMenu
          assets={assets}
          runtime={runtime}
          view={view}
          onResume={() => {
            void enterImmersive(mobile);
            runtime?.resume();
          }}
        />
      )}
      {view.screen === "selection" && view.config && (
        <CharacterSelection
          assets={assets}
          config={view.config}
          onStart={(config) => {
            void enterImmersive(mobile);
            void runtime?.start(config);
          }}
          onBack={() => runtime?.back()}
        />
      )}
      <BattlePanel
        canvas={canvas}
        assets={assets}
        runtime={runtime}
        view={view}
        mobile={mobile}
      />
      {view.screen === "loadingBattle" && (
        <div className="flex min-h-dvh items-center justify-center px-5 text-center">
          <div className="w-full max-w-sm">
            <h2 role="status" className="text-xl font-bold text-ivory">
              准备登台
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              正在加载角色、舞台和大招视频…
            </p>
            <progress
              aria-label="对战加载进度"
              className="mt-5 h-2 w-full appearance-none overflow-hidden bg-white/15 [&::-webkit-progress-bar]:bg-white/15 [&::-webkit-progress-value]:bg-silver [&::-moz-progress-bar]:bg-silver"
              max={100}
              value={view.loadingProgress}
            />
            <p className="mt-2 font-mono text-sm text-ivory">
              {view.loadingProgress}%
            </p>
            <button
              onClick={() => runtime?.returnToMenu()}
              className="mt-6 min-h-11 px-4 text-sm font-semibold text-ember"
            >
              返回主菜单
            </button>
          </div>
        </div>
      )}
      {view.error && view.screen !== "battle" && (
        <p
          role="alert"
          className="fixed inset-x-4 bottom-4 rounded-none bg-void p-4 text-center text-sm text-ember"
        >
          {view.error}
        </p>
      )}
      {runtime && view.lobbyOpen && view.screen !== "loadingBattle" && (
        <LanLobby runtime={runtime} view={view} assets={assets} />
      )}
      {runtime && <GameDialogs runtime={runtime} view={view} />}
    </main>
  );
}
