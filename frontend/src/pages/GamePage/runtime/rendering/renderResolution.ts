const LOGICAL_WIDTH = 960;
const LOGICAL_HEIGHT = 540;
// Bound framebuffer cost on large Retina displays while matching ordinary
// desktop/fullscreen displays and mobile device pixels without CSS upscaling.
const MAX_PIXELS = 2560 * 1440;
export const RENDER_SCALES = [1, 1.25, 1.5, 2, 2.5, 3];

export function maximumRenderScale(
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
): number {
  const requested =
    Math.max(cssWidth / LOGICAL_WIDTH, cssHeight / LOGICAL_HEIGHT) *
    devicePixelRatio;
  return Math.min(
    Math.sqrt(MAX_PIXELS / (LOGICAL_WIDTH * LOGICAL_HEIGHT)),
    Math.max(1, Math.ceil(requested * 64) / 64),
  );
}
