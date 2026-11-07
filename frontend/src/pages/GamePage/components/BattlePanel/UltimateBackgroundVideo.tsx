import { useEffect, useRef } from "react";
import type { Presentation } from "../../../../assets/objects/Assets";
import { backgroundVideoEnabled } from "../../runtime/display/backgroundVideoEnabled";

export function UltimateBackgroundVideo({
  media,
  paused,
  timeMs,
  onEnd,
}: {
  media: Presentation;
  paused: boolean;
  timeMs: number;
  onEnd: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const latest = useRef({ timeMs, paused, onEnd });
  latest.current = { timeMs, paused, onEnd };
  const synchronize = () => {
    const video = ref.current;
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
    synchronize();
  }, [paused, timeMs, media]);
  useEffect(() => {
    const video = ref.current;
    return () => video?.pause();
  }, []);
  if (!backgroundVideoEnabled()) return null;
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
