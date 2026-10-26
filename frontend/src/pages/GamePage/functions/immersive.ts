/** Fullscreen and landscape locking are best-effort browser features. */

interface OrientationLock {
  lock?: (orientation: "landscape") => Promise<void>;
  unlock?: () => void;
}

function orientationLock(): OrientationLock | null {
  return typeof screen === "undefined"
    ? null
    : ((screen.orientation as unknown as OrientationLock | undefined) ?? null);
}

export function fullscreenSupported() {
  return !!document.fullscreenEnabled;
}

/**
 * Enter fullscreen and request landscape for the whole page. Unsupported
 * browsers (notably iPhone Safari) keep operating in the browser viewport.
 */
export async function enterImmersive() {
  try {
    if (!document.fullscreenElement)
      await document.documentElement.requestFullscreen({
        navigationUI: "hide",
      });
  } catch {
    return;
  }
  try {
    await orientationLock()?.lock?.("landscape");
  } catch {
    // Desktop browsers and Safari cannot lock orientation.
  }
}

/** Leave fullscreen and release a landscape lock requested by this page. */
export async function exitImmersive() {
  try {
    orientationLock()?.unlock?.();
  } catch {
    // Orientation locking is unavailable on most browsers.
  }
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
  } catch {
    // The page may already have left fullscreen.
  }
}
