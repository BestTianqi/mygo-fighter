import { MOVES, ROUND_END_TIMING } from "../../../../../game/engine";
import { drawEntranceEffects, drawEntranceTitles } from "../drawEntrances";
import {
  drawOpeningBackdrop,
  drawOpeningCue,
  openingView,
} from "../drawOpening";
import { drawSakikoSuper } from "../drawSakikoSuper";
import { drawShield, drawSummons } from "./defense";
import { drawMujicaEffects } from "./mujica";
import type { BattleSceneContext } from "./objects";
import { drawHeldProps, drawOffenseEffect, drawSuperAura } from "./offense";
import { drawBlinkTrails, drawFx } from "./particles";
import { drawSoyoEffect } from "./soyo";
import { drawFighter } from "./sprites";
import { drawMaskAura } from "./transformation";
import { drawVocalAuras } from "./vocals";
/** Draw back-to-front world layers, then screen-space lifecycle text and flash. */
export function drawBattle(
  scene: BattleSceneContext,
  dt: number,
  videoBackground: boolean,
) {
  if (scene.state.cameraFighter !== scene.match.fighters[0]) {
    scene.state.cameraFighter = scene.match.fighters[0];
    scene.camera.reset(scene.match);
  } else scene.camera.update(scene.match, dt);
  scene.ctx.save();
  if (scene.state.impactMotion) {
    if (!scene.match.paused) scene.state.impactMotion.age += dt;
    const p = Math.min(
        1,
        scene.state.impactMotion.age / scene.state.impactMotion.duration,
      ),
      phase = [1, -0.6, 0.3, -0.15][Math.min(3, Math.floor(p * 4))];
    const offset = phase * scene.state.impactMotion.power * (1 - p);
    scene.ctx.translate(
      offset * scene.state.impactMotion.direction,
      offset * (scene.state.impactMotion.direction ? 0.35 : 1),
    );
    if (p === 1) scene.state.impactMotion = null;
  }
  if (!videoBackground)
    scene.stageRenderer.background(
      scene.state.battleArena,
      scene.state.visualTime,
    );
  drawOpeningBackdrop(scene);
  if (scene.state.inkMs > 0) {
    scene.ctx.fillStyle =
      "rgba(7,8,18," +
      Math.min(
        scene.reducedMotion ? 0.12 : 0.64,
        (0.64 * scene.state.inkMs) / scene.state.inkMax,
      ) +
      ")";
    scene.ctx.fillRect(0, 0, 960, 540);
    if (!scene.match.paused)
      scene.state.inkMs = Math.max(0, scene.state.inkMs - dt);
  }
  scene.ctx.save();
  const view = openingView(scene);
  scene.ctx.translate(480, 270);
  scene.ctx.scale(view.zoom, view.zoom);
  scene.ctx.translate(-view.x, -view.y);
  scene.stageRenderer.terrain(scene.match, scene.state.battleArena);
  drawSuperAura(scene);
  scene.match.fighters.forEach((value) => drawMaskAura(scene, value));
  drawMujicaEffects(scene);
  for (const side of [0, 1]) drawOffenseEffect(scene, side);
  for (const side of [0, 1]) drawSoyoEffect(scene, side);
  drawVocalAuras(scene);
  drawBlinkTrails(scene, dt);
  drawEntranceEffects(scene);
  for (const side of [0, 1]) drawFighter(scene, side);
  if (scene.match.phase === "fighting")
    for (const f of scene.match.fighters) {
      const move = MOVES[f.attack ?? ""];
      if (move?.sakiko === "ascension")
        drawSakikoSuper(scene.ctx, f, move, scene.reducedMotion, true);
    }
  drawHeldProps(scene);
  drawSummons(scene);
  for (const side of [0, 1]) drawShield(scene, side);
  scene.match.waves.forEach(scene.drawWave);
  drawFx(scene, dt);
  scene.ctx.restore();
  drawEntranceTitles(scene);
  drawOpeningCue(scene);
  if (
    scene.match.roundEnd &&
    scene.match.phaseMs > ROUND_END_TIMING.total - 700
  ) {
    scene.ctx.fillStyle = "#fff4e4";
    scene.ctx.textAlign = "center";
    scene.ctx.font = "italic bold 90px sans-serif";
    scene.ctx.fillText(scene.match.reason, 480, 285);
  }
  if (scene.state.flash > 0) {
    scene.ctx.fillStyle = "#f6cee92a";
    scene.ctx.fillRect(0, 0, 960, 540);
    if (!scene.match.paused) scene.state.flash -= dt;
  }
  scene.ctx.restore();
}
