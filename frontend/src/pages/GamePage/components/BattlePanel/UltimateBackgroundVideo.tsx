import { useEffect, useRef } from "react";
import type { Presentation } from "../../../../assets/objects/Assets";
import { backgroundVideoEnabled } from "../../runtime/display/backgroundVideoEnabled";

export function UltimateBackgroundVideo({
  media,
  prepared,
  paused,
  timeMs,
  onEnd,
}: {
  media: Presentation;
  prepared?: HTMLVideoElement;
  paused: boolean;
  timeMs: number;
  onEnd: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const enabled = backgroundVideoEnabled();
  const latest = useRef({ timeMs, paused, onEnd });
  latest.current = { timeMs, paused, onEnd };
  const synchronize = () => {
    const video = prepared ?? ref.current;
    if (!video || video.readyState < 1) return;
    const state = latest.current;
    const target = Math.max(0, state.timeMs / 1000);
    video.playbackRate = 1;
    if (Number.isFinite(video.duration) && target >= video.duration) {
      video.pause();
      state.onEnd();
      return;
    }
    if (Math.abs(video.currentTime - target) > 0.08) video.currentTime = target;
    if (state.paused) video.pause();
    else if (video.paused) void video.play().catch(() => {});
  };
  useEffect(() => {
    const host = container.current;
    const video = prepared ?? ref.current;
    if (!enabled || !video) return;
    if (prepared && host) {
      video.className = "h-full min-w-0 w-full object-cover";
      host.append(video);
      video.addEventListener("canplay", synchronize);
      const end = () => latest.current.onEnd();
      video.addEventListener("ended", end);
      video.addEventListener("error", end);
      return () => {
        video.pause();
        video.removeEventListener("canplay", synchronize);
        video.removeEventListener("ended", end);
        video.removeEventListener("error", end);
        if (video.parentNode === host) host.removeChild(video);
      };
    }
    return () => video.pause();
  }, [enabled, prepared]);
  useEffect(() => {
    if (enabled) synchronize();
  }, [enabled, paused, timeMs, media, prepared]);
  if (!enabled) return null;
  if (prepared) return <div ref={container} className="h-full min-w-0" />;
  return (
    <video
      ref={ref}
      src={media.video}
      muted
      playsInline
      onLoadedMetadata={synchronize}
      onCanPlay={synchronize}
      onEnded={onEnd}
      onError={onEnd}
      className="h-full min-w-0 w-full object-cover"
    />
  );
}
