import { useEffect, useState } from "react";
import type { Assets } from "./assets/objects/Assets";
import { loadAssets } from "./assets/loadAssets";
import { GamePage } from "./pages/GamePage";
import { Button } from "./components/ui/Button";
type AppState =
  | { status: "loading" }
  | { status: "ready"; assets: Assets }
  | { status: "error"; message: string };
export function App() {
  const [state, setState] = useState<AppState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    void loadAssets(controller.signal)
      .then((assets) => setState({ status: "ready", assets }))
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "加载失败",
          });
      });
    return () => controller.abort();
  }, [attempt]);
  if (state.status === "ready") return <GamePage assets={state.assets} />;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f5f0e5] p-6 text-[#211f1a]">
      <div className="space-y-5 text-center">
        <h1 className="text-3xl font-medium">MyGO!!!!! 格斗</h1>
        <p role="status" className="text-sm text-[#80786d]">
          {state.status === "loading" ? "正在准备角色与舞台…" : state.message}
        </p>
        {state.status === "error" && (
          <Button onClick={() => setAttempt((n) => n + 1)}>重新加载</Button>
        )}
      </div>
    </main>
  );
}
