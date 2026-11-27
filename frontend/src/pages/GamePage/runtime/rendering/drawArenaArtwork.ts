import type { Stage } from "../../../../assets/objects/Assets";
import type { Camera } from "./Camera";
import type { RenderImage } from "./RenderImage";

export type StageView = ReturnType<Camera["snapshot"]>;

/** The playable area keeps its world scale even when the camera sees past the set. */
export function drawArenaArtwork(
  ctx: CanvasRenderingContext2D,
  image: RenderImage,
  bounds: Stage["artBounds"],
  view: StageView,
) {
  const left = 480 + (bounds.left - view.x) * view.zoom;
  const top = 270 + (bounds.top - view.y) * view.zoom;
  const width = bounds.width * view.zoom;
  const height = bounds.height * view.zoom;
  const bottom = top + height;

  function column() {
    if (top <= 0 && bottom >= 540) {
      ctx.drawImage(image, left, top, width, height);
      return;
    }
    // Only the outer sky and nearest floor extend into vertical overscan.
    // All collision traces are inside these two fixed boundaries.
    const source = [0, 0.05, 0.95, 1];
    const target = [
      Math.min(0, top),
      top + height * 0.05,
      top + height * 0.95,
      Math.max(540, bottom),
    ];
    for (let i = 0; i < 3; i++) {
      if (target[i] >= 540 || target[i + 1] <= 0) continue;
      ctx.drawImage(
        image,
        0,
        source[i] * image.height,
        image.width,
        (source[i + 1] - source[i]) * image.height,
        left,
        target[i],
        width,
        target[i + 1] - target[i],
      );
    }
  }

  column();
  // Continue the scenery beyond the world limits without stretching a school
  // facade or shifting a single tread inside the arena.
  function extendSide(boundary: number) {
    ctx.save();
    ctx.translate(2 * boundary, 0);
    ctx.scale(-1, 1);
    column();
    ctx.restore();
  }
  if (left > 0) extendSide(left);
  if (left + width < 960) extendSide(left + width);
}
