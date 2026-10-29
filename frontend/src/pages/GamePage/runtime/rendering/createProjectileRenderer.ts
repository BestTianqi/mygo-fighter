import type { RenderImage } from "./RenderImage";
import type { Assets } from "../../../../assets/objects/Assets";
import type { Wave } from "../../../../game/objects/Wave";
import { drawWave } from "./projectiles/base";
import type { ProjectileContext } from "./projectiles/ProjectileContext";
/** Dispatch authored silhouettes while preserving their drawing order. */
export function createProjectileRenderer(
  ctx: CanvasRenderingContext2D,
  assets: Assets,
  getImage: (url: string) => RenderImage | undefined,
  reducedMotion: boolean,
) {
  const scene: ProjectileContext = {
    ctx,
    assets,
    getImage,
    reducedMotion,
    colors: ["#f6a4c7", "#65d1ee"],
  };
  return (wave: Wave) => drawWave(scene, wave);
}
