import { createMujicaMotion } from "../../../../game/animation";
import { Camera } from "../../../../game/camera";
import type { Match } from "../../../../game/engine";
import type { Assets } from "../../../../game/objects/Assets";
import type { CombatEvent } from "../../../../game/objects/CombatEvent";
import { consumeEvent } from "./battleScene/events";
import { drawBattle } from "./battleScene/frame";
import type {
  BattleSceneContext,
  BattleSceneState,
} from "./battleScene/objects";
import type { Sprite } from "./CanvasRenderer";
import { createProjectileRenderer } from "./createProjectileRenderer";
import { createStageRenderer } from "./createStageRenderer";

/** Own visual state once per renderer; each frame receives an explicit match.
 * The frame module defines draw order. Effects never mutate combat state.
 */
export function createBattleScene(
  ctx: CanvasRenderingContext2D,
  assets: Assets,
  getImage: (url: string) => HTMLImageElement | undefined,
  spriteFor: (
    match: Match,
    side: number,
    direction: number,
    viewZoom: number,
  ) => Sprite | null,
) {
  const camera = new Camera(),
    mujicaMotion = createMujicaMotion();
  const colors = ["#f6a4c7", "#65d1ee", "#f6c665"];
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stageRenderer = createStageRenderer(
    ctx,
    assets,
    camera,
    getImage,
    reducedMotion,
  );
  const drawWave = createProjectileRenderer(
    ctx,
    assets,
    getImage,
    reducedMotion,
  );
  const state: BattleSceneState = {
    battleArena: 0,
    visualTime: 0,
    cameraFighter: null,
    fx: [],
    flash: 0,
    inkMs: 0,
    inkMax: 200,
    impactMotion: null,
  };
  const context = (match: Match): BattleSceneContext => ({
    ctx,
    assets,
    getImage,
    spriteFor,
    camera,
    mujicaMotion,
    colors,
    reducedMotion,
    stageRenderer,
    drawWave,
    state,
    match,
  });
  return {
    reset(arena: number) {
      state.battleArena = arena;
      state.visualTime = state.flash = state.inkMs = 0;
      state.fx = [];
      state.impactMotion = null;
      state.cameraFighter = null;
    },
    consume(match: Match, events: CombatEvent[]) {
      const scene = context(match);
      events.forEach((event) => consumeEvent(scene, event));
    },
    draw(match: Match, dt: number, videoBackground = false) {
      if (!match.paused) state.visualTime += dt;
      drawBattle(context(match), dt, videoBackground);
    },
  };
}
