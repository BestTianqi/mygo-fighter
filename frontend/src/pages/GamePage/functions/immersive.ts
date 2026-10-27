/** Browser fullscreen requires a player gesture; unsupported browsers keep the viewport layout. */
interface OrientationLock {
  lock?: (orientation: "landscape") => Promise<void>;
  unlock?: () => void;
}
interface WebkitDocument extends Document {
  webkitFullscreenElement?: Element;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
}
interface WebkitElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}
function orientationLock() {
  return screen.orientation as unknown as OrientationLock | undefined;
}
export function isImmersive() {
  return !!(
    document.fullscreenElement ||
    (document as WebkitDocument).webkitFullscreenElement
  );
}
export function canEnterImmersive() {
  return !!(
    (document.fullscreenEnabled &&
      document.documentElement.requestFullscreen) ||
    ((document as WebkitDocument).webkitFullscreenEnabled !== false &&
      (document.documentElement as WebkitElement).webkitRequestFullscreen)
  );
}
export async function enterImmersive(
  landscape = window.matchMedia("(pointer: coarse)").matches,
) {
  try {
    if (!isImmersive()) {
      const element = document.documentElement as WebkitElement;
      if (element.requestFullscreen)
        await element.requestFullscreen({ navigationUI: "hide" });
      else if (element.webkitRequestFullscreen)
        await element.webkitRequestFullscreen();
      else return;
    }
    if (landscape) await orientationLock()?.lock?.("landscape");
  } catch {
    // Fullscreen or orientation can be denied; the arena still fills the browser viewport.
  }
}
export async function exitImmersive() {
  try {
    orientationLock()?.unlock?.();
  } catch {
    /* Unsupported orientation API. */
  }
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await (document as WebkitDocument).webkitExitFullscreen?.();
  } catch {
    /* The browser may have already exited. */
  }
}
