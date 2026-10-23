import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import type { Assets } from "../../../game/objects/Assets";
import { GameRuntime } from "../functions/GameRuntime";
import { initialView } from "../objects/GameView";
export function useGame(
  assets: Assets,
  canvas: RefObject<HTMLCanvasElement | null>,
) {
  const [runtime, setRuntime] = useState<GameRuntime | null>(null);
  useEffect(() => {
    if (!canvas.current) return;
    const game = new GameRuntime(assets, canvas.current);
    setRuntime(game);
    return () => game.dispose();
  }, [assets, canvas]);
  const subscribe = useCallback(
    (listener: () => void) => runtime?.subscribe(listener) ?? (() => {}),
    [runtime],
  );
  const getSnapshot = useCallback(
    () => runtime?.getSnapshot() ?? initialView,
    [runtime],
  );
  const view = useSyncExternalStore(subscribe, getSnapshot);
  return { runtime, view };
}
