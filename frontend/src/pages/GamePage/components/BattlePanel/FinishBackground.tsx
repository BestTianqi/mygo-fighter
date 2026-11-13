import { useEffect, useRef } from "react";
import { backgroundVideoEnabled } from "../../runtime/display/backgroundVideoEnabled";

/** Silent video follows the voice channel rather than a second audio track. */
export function FinishBackground({
  src,
  prepared,
  timeMs,
  paused,
}: {
  src: string;
  prepared?: HTMLVideoElement;
  timeMs: number | null;
  paused: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const enabled = backgroundVideoEnabled();
  const className = "absolute inset-0 h-full w-full object-contain";
  useEffect(() => {
    const container = host.current;
    if (!enabled || !prepared || !container) return;
    prepared.className = className;
    prepared.setAttribute("data-finish-background", "true");
    prepared.setAttribute("aria-hidden", "true");
    container.append(prepared);
    return () => {
      prepared.pause();
      prepared.removeAttribute("data-finish-background");
      if (prepared.parentNode === container) container.removeChild(prepared);
    };
  }, [enabled, prepared]);
  useEffect(() => {
    const element = prepared ?? video.current;
    if (!enabled || !element) return;
    const sync = () => {
      if (!Number.isFinite(element.duration)) return;
      const target = Math.min(
        Math.max(0, element.duration - 0.04),
        (timeMs ?? 0) / 1000,
      );
      if (Math.abs(element.currentTime - target) > 0.08)
        element.currentTime = target;
      if (paused || timeMs === null || target >= element.duration - 0.05)
        element.pause();
      else if (element.paused) void element.play().catch(() => undefined);
    };
    sync();
    element.addEventListener("loadedmetadata", sync);
    return () => element.removeEventListener("loadedmetadata", sync);
  }, [enabled, prepared, src, timeMs, paused]);
  if (!enabled) return null;
  const visibility = timeMs === null ? "opacity-0" : "opacity-100";
  if (prepared)
    return <div ref={host} className={`absolute inset-0 ${visibility}`} />;
  return (
    <video
      ref={video}
      src={src}
      muted
      playsInline
      preload="metadata"
      aria-hidden="true"
      data-finish-background="true"
      className={`${className} ${visibility}`}
    />
  );
}
