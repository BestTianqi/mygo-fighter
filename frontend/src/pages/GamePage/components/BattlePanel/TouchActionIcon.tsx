import { useEffect, useRef } from "react";
import type { TouchActionArtwork } from "./objects/TouchActionArtwork";

interface IconImage {
  image: HTMLImageElement;
  ready: Promise<HTMLImageElement>;
  users: number;
}
const images = new Map<string, IconImage>();

/** Buttons share one decoded source sheet and release it when the form leaves the UI. */
function retainImage(src: string) {
  let entry = images.get(src);
  if (!entry) {
    const image = new Image();
    image.decoding = "async";
    const ready = new Promise<HTMLImageElement>((resolve, reject) => {
      image.onload = () => image.decode().then(() => resolve(image), reject);
      image.onerror = () => reject(new Error("Touch artwork could not load"));
    });
    entry = { image, ready, users: 0 };
    images.set(src, entry);
    image.src = src;
  }
  const retained = entry;
  retained.users++;
  return {
    ready: retained.ready,
    release() {
      if (--retained.users !== 0) return;
      if (images.get(src) === retained) images.delete(src);
      retained.image.onload = retained.image.onerror = null;
      retained.image.src = "";
    },
  };
}

export function TouchActionIcon({ artwork }: { artwork: TouchActionArtwork }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let disposed = false;
    let image: HTMLImageElement | null = null;
    let sprite = artwork.kind === "sprite" ? artwork.frame : null;
    let source = retainImage(artwork.src);
    function draw() {
      if (!canvas || disposed) return;
      const size = Math.max(
        1,
        Math.round(
          canvas.getBoundingClientRect().width *
            Math.min(3, window.devicePixelRatio || 1),
        ),
      );
      canvas.width = canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context || !image) return;
      const rect = sprite ?? {
        x: 0,
        y: 0,
        w: image.naturalWidth,
        h: image.naturalHeight,
      };
      // Upper-body crops keep faces, hands and weapons legible on small skill buttons.
      const crop = Math.min(rect.w, rect.h);
      const x = rect.x + (rect.w - crop) / 2;
      const y = rect.y + (rect.h - crop) * (sprite ? 0.08 : 0.3);
      context.drawImage(image, x, y, crop, crop, 0, 0, size, size);
    }
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    void source.ready
      .then((loaded) => {
        if (disposed) return;
        image = loaded;
        draw();
      })
      .catch(async () => {
        if (disposed || artwork.src === artwork.fallback) return;
        source.release();
        sprite = null;
        source = retainImage(artwork.fallback);
        try {
          const loaded = await source.ready;
          if (disposed) return;
          image = loaded;
          draw();
        } catch {
          /* The button retains its accessible action name if media fails. */
        }
      });
    return () => {
      disposed = true;
      observer.disconnect();
      source.release();
    };
  }, [artwork]);
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none block size-full"
    />
  );
}
