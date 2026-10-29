import { useEffect, useRef } from "react";
import { backgroundVideoEnabled } from "../functions/backgroundVideoEnabled";

/** Silent video follows the voice channel rather than a second audio track. */
export function FinishBackground({
  src,
  timeMs,
  paused,
}: {
  src: string;
  timeMs: number | null;
  paused: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    const sync = () => {
      if (!Number.isFinite(element.duration)) return;
      const target = Math.min(
        Math.max(0, element.duration - 0.04),
        (timeMs ?? 0) / 1000,
      );
      if (Math.abs(element.currentTime - target) > 0.18)
        element.currentTime = target;
      if (paused || timeMs === null || target >= element.duration - 0.05)
        element.pause();
      else void element.play().catch(() => undefined);
    };
    sync();
    element.addEventListener("loadedmetadata", sync);
    return () => element.removeEventListener("loadedmetadata", sync);
  }, [src, timeMs, paused]);
  if (!backgroundVideoEnabled()) return null;
  return (
    <video
      ref={video}
      src={src}
      muted
      playsInline
      preload="metadata"
      aria-hidden="true"
      data-finish-background="true"
      className={`absolute inset-0 h-full w-full object-contain ${timeMs === null ? "opacity-0" : "opacity-100"}`}
    />
  );
}
