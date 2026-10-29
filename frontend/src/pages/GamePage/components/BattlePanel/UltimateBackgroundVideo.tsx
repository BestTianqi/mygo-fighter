import { useEffect, useRef } from "react";
import type { Presentation } from "../../../../assets/objects/Assets";
import { backgroundVideoEnabled } from "../../runtime/display/backgroundVideoEnabled";

export function UltimateBackgroundVideo({
  media,
  paused,
  onEnd,
}: {
  media: Presentation;
  paused: boolean;
  onEnd: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.currentTime = 0;
    video.playbackRate = media.videoRate ?? 1;
  }, [media]);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (paused) video.pause();
    else void video.play().catch(() => {});
    return () => video.pause();
  }, [paused, media]);
  if (!backgroundVideoEnabled()) return null;
  return (
    <video
      ref={ref}
      src={media.video}
      muted
      playsInline
      onEnded={onEnd}
      onError={onEnd}
      className="h-full min-w-0 w-full object-cover"
    />
  );
}
