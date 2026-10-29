import { useEffect, useRef, useState } from "react";
import type { GameView } from "../../../objects/GameView";
import {
  enterImmersive,
  exitImmersive,
  isImmersive,
} from "../../../runtime/display/immersive";

export function useBattleDisplay(screen: GameView["screen"], mobile: boolean) {
  const [fullField, setFullField] = useState(true);
  const lastScreen = useRef(screen);
  useEffect(() => {
    if (screen === "battle" && lastScreen.current !== "battle")
      setFullField(true);
    lastScreen.current = screen;
  }, [mobile, screen]);
  useEffect(() => {
    const sync = () => {
      if (!isImmersive()) setFullField(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && screen === "battle") {
        setFullField(false);
        void exitImmersive();
      }
    };
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    window.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
      window.removeEventListener("keydown", escape);
    };
  }, [screen]);
  const immersive = mobile || fullField;
  const toggleFullField = () => {
    const enabled = !fullField;
    setFullField(enabled);
    if (enabled) void enterImmersive();
    else void exitImmersive();
  };
  return { fullField, immersive, toggleFullField };
}
