import type { Sprite, SpriteSource } from "./CanvasRenderer";

const MAX_ENTRIES = 64;
const MAX_PIXELS = 8 * 1024 * 1024;
const SCALE_STEP = 1 / 16;

type CacheEntry = {
  image: CanvasImageSource;
  source: SpriteSource;
  pixels: number;
};

/**
 * Lazy LRU of frame crops rasterized near their final device-pixel size.
 * Destination frames and anchors stay in the original coordinate system.
 */
export class PreScaledSpriteCache {
  private readonly entries = new Map<string, CacheEntry>();
  private pixels = 0;

  get(atlas: string, sprite: Sprite, renderScale: number): Sprite {
    const frame = sprite.frame;
    // Quantizing camera motion avoids rebuilding the cache on every small zoom.
    // Never upscale a frame merely to populate its cached representation.
    const rasterScale = Math.min(
      1,
      Math.max(
        SCALE_STEP,
        Math.ceil((sprite.scale * renderScale) / SCALE_STEP) * SCALE_STEP,
      ),
    );
    // Full-resolution sprites already have the best source. Avoid copying and
    // resampling them a second time, especially at fullscreen/Retina sizes.
    if (rasterScale >= 1) return sprite;
    const width = Math.max(1, Math.round(frame.w * rasterScale));
    const height = Math.max(1, Math.round(frame.h * rasterScale));
    const pixels = width * height;
    if (pixels > MAX_PIXELS) return sprite;

    const key = [atlas, frame.x, frame.y, frame.w, frame.h, rasterScale].join(
      ":",
    );
    const cached = this.entries.get(key);
    if (cached) {
      this.entries.delete(key);
      this.entries.set(key, cached);
      return { ...sprite, image: cached.image, source: cached.source };
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return sprite;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      sprite.image,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      0,
      0,
      width,
      height,
    );
    const source: SpriteSource = { x: 0, y: 0, w: width, h: height };
    const scaled = { ...sprite, image: canvas, source };
    while (
      this.entries.size > 0 &&
      (this.entries.size >= MAX_ENTRIES || this.pixels + pixels > MAX_PIXELS)
    )
      this.evictOldest();
    this.entries.set(key, { image: canvas, source, pixels });
    this.pixels += pixels;
    return scaled;
  }

  private evictOldest() {
    const key = this.entries.keys().next().value;
    if (key === undefined) return;
    const entry = this.entries.get(key)!;
    this.entries.delete(key);
    this.pixels -= entry.pixels;
  }
}
