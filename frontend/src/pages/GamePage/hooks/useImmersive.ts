import { useEffect, useState } from "react";
import {
  enterImmersive,
  exitImmersive,
  fullscreenSupported,
} from "../functions/immersive";

/** Tracks page fullscreen so the battle toolbar can describe its next action. */
export function useImmersive() {
  const [active, setActive] = useState(() => !!document.fullscreenElement);
  useEffect(() => {
    const sync = () => setActive(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  return {
    supported: fullscreenSupported(),
    active,
    toggle: () => void (active ? exitImmersive() : enterImmersive()),
  };
}
