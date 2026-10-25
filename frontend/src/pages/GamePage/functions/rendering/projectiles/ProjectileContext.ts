import type { Assets } from "../../../../../game/objects/Assets";
export interface ProjectileContext {
  ctx: CanvasRenderingContext2D;
  assets: Assets;
  getImage: (url: string) => HTMLImageElement | undefined;
  reducedMotion: boolean;
  colors: string[];
}
