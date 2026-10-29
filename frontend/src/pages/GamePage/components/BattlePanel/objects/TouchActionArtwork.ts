import type { SpriteFrame } from "../../../../../assets/objects/Assets";

export type TouchActionArtwork = {
  src: string;
  fallback: string;
} & ({ kind: "sprite"; frame: SpriteFrame } | { kind: "image" });
