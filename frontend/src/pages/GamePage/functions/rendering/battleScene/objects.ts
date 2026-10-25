import { createMujicaMotion } from "../../../../../game/animation";
import { Camera } from "../../../../../game/camera";
import { type Match } from "../../../../../game/engine";
import type { Assets } from "../../../../../game/objects/Assets";
import type { Fighter } from "../../../../../game/objects/Fighter";
import type { Sprite } from "../CanvasRenderer";
import { createProjectileRenderer } from "../createProjectileRenderer";
import { createStageRenderer } from "../createStageRenderer";
type SceneSprite = Sprite & { atlas: HTMLImageElement; facing: number };
type ParticleKind =
  | "burst"
  | "dash"
  | "landing"
  | "guard"
  | "shock"
  | "incantation"
  | "parfaitSplash"
  | "impact"
  | "steelBreak";
interface ParticleEffect {
  type: ParticleKind;
  x: number;
  y: number;
  life: number;
  max: number;
  color: string;
  text: string;
  weight: number;
  direction: number;
  heavy: boolean;
  radius: number;
}
interface BlinkEffect {
  type: "blink";
  side: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  life: number;
  max: number;
  travelMs: number;
  color: string;
  sprite: SceneSprite;
}
type Effect = ParticleEffect | BlinkEffect;

export interface BattleSceneState {
  battleArena: number;
  visualTime: number;
  cameraFighter: Fighter | null;
  fx: Effect[];
  flash: number;
  inkMs: number;
  inkMax: number;
  impactMotion: {
    age: number;
    duration: number;
    power: number;
    direction: number;
  } | null;
}
export interface BattleSceneContext {
  ctx: CanvasRenderingContext2D;
  assets: Assets;
  getImage: (url: string) => HTMLImageElement | undefined;
  spriteFor: (match: Match, side: number, direction: number) => Sprite | null;
  camera: Camera;
  mujicaMotion: ReturnType<typeof createMujicaMotion>;
  colors: string[];
  reducedMotion: boolean;
  stageRenderer: ReturnType<typeof createStageRenderer>;
  drawWave: ReturnType<typeof createProjectileRenderer>;
  match: Match;
  state: BattleSceneState;
}
export type { BlinkEffect, Effect, ParticleEffect, SceneSprite };
