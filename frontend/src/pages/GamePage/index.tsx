import { useEffect, useRef } from "react";
import type { Assets } from "../../assets/objects/Assets";
import { enterImmersive, exitImmersive } from "./runtime/display/immersive";
import { useGame } from "./hooks/useGame";
import { useMobilePlay } from "./hooks/useMobilePlay";
import { MainMenu } from "./components/MainMenu";
import { CharacterSelection } from "./components/CharacterSelection";
import { VersusLoading } from "./components/VersusLoading";
import "./arcade.css";
import { BattlePanel } from "./components/BattlePanel";
import { LanLobby } from "./components/LanLobby";
import { GameDialogs } from "./components/GameDialogs";
import { invitedRoom, launchOptions } from "./functions/onlineLinks";
export function GamePage({ assets }: { assets: Assets }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const mobile = useMobilePlay();
  const { runtime, view } = useGame(assets, canvas);
  useEffect(() => {
    if (
      import.meta.env.MODE !== "pages" &&
      (launchOptions.get("online") === "1" || invitedRoom)
    )
      runtime?.openLobby();
  }, [runtime]);
  useEffect(() => {
    if (view.screen === "menu" || view.screen === "selection")
      void exitImmersive();
  }, [mobile, view.screen]);
  return (
    <main className="min-h-dvh bg-void text-ivory">
      {view.screen === "menu" && (
        <MainMenu
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
      {view.screen === "loadingBattle" && view.config && (
        <VersusLoading
          assets={assets}
          config={view.config}
          progress={view.loadingProgress}
          onBack={() => runtime?.returnToMenu()}
        />
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
