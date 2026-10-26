import { useEffect, useRef } from "react";
import type { Assets } from "../../game/objects/Assets";
import { enterImmersive, exitImmersive } from "./functions/immersive";
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
    if (mobile && (view.screen === "menu" || view.screen === "selection"))
      void exitImmersive();
  }, [mobile, view.screen]);
  return (
    <main className="min-h-dvh bg-[#080e1c] text-slate-100">
      {view.screen === "menu" && (
        <MainMenu
          assets={assets}
          runtime={runtime}
          view={view}
          onResume={() => {
            if (mobile) void enterImmersive();
            runtime?.resume();
          }}
        />
      )}
      {view.screen === "selection" && view.config && (
        <CharacterSelection
          assets={assets}
          config={view.config}
          onStart={(config) => {
            if (mobile) void enterImmersive();
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
        <div className="flex min-h-dvh items-center justify-center">
          <p role="status" className="animate-pulse text-sm text-pink-100">
            正在准备双方角色与舞台…
          </p>
        </div>
      )}
      {view.error && view.screen !== "battle" && (
        <p
          role="alert"
          className="fixed inset-x-4 bottom-4 rounded-xl border border-pink-200/30 bg-slate-950 p-4 text-center text-sm text-pink-200"
        >
          {view.error}
        </p>
      )}
      {runtime && view.lobbyOpen && (
        <LanLobby runtime={runtime} view={view} assets={assets} />
      )}
      {runtime && <GameDialogs runtime={runtime} view={view} />}
    </main>
  );
}
