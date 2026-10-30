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
    const theme = document.querySelector('meta[name="theme-color"]');
    theme?.setAttribute(
      "content",
      view.screen === "battle" || view.screen === "loadingBattle"
        ? "#080e1c"
        : "#f3f7fc",
    );
  }, [view.screen]);
  useEffect(() => {
    if (view.screen === "menu" || view.screen === "selection")
      void exitImmersive();
  }, [mobile, view.screen]);
  return (
    <main className="min-h-dvh bg-[#f3f7fc] text-[#101d33]">
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
          <div className="max-w-sm">
            <span
              aria-hidden="true"
              className="mx-auto mb-6 block h-1 w-14 animate-pulse bg-[#1aa8b8] motion-reduce:animate-none"
            />
            <h2 role="status" className="text-xl font-bold text-[#101d33]">
              正在准备角色与舞台
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#61718b]">
              首次进入需要加载角色素材，请稍候。
            </p>
            <button
              onClick={() => runtime?.returnToMenu()}
              className="mt-6 min-h-11 px-4 text-sm font-semibold text-[#982650]"
            >
              取消并返回主菜单
            </button>
          </div>
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
