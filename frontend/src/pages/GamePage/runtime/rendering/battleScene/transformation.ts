import { bandFor } from "../../../../../game/bands";
import { MOVES, ROSTER } from "../../../../../game/engine";
import type { Fighter } from "../../../../../game/objects/Fighter";
import type { BattleSceneContext } from "./objects";
export function drawMaskAura(scene: BattleSceneContext, f: Fighter) {
  const transform = bandFor(f.character).transform;
  if (scene.match.phase !== "fighting" || !transform || !f.stageForm) return;
  const age = transform.duration - f.stageForm.ms;
  if (age < 0 || f.hp <= 0) return;
  const fade = Math.min(1, f.stageForm.ms / 700),
    pulse = scene.reducedMotion
      ? 0
      : Math.sin(scene.state.visualTime * 0.003 + f.character),
    burst = Math.min(1, age / 650);
  const color = ROSTER[f.character].color,
    strength = (1 - burst) * (scene.reducedMotion ? 0.35 : 1);
  scene.ctx.save();
  scene.ctx.translate(f.x, 438 - f.y);
  scene.ctx.strokeStyle = color;
  scene.ctx.lineWidth = 3;
  // A restrained aura stays behind the art for the full transformed state.
  const glow = scene.ctx.createRadialGradient(0, -110, 20, 0, -110, 175);
  glow.addColorStop(0, color + "00");
  glow.addColorStop(0.5, color + "28");
  glow.addColorStop(1, color + "00");
  scene.ctx.globalAlpha = fade * (0.8 + pulse * 0.15);
  scene.ctx.fillStyle = glow;
  scene.ctx.fillRect(-180, -290, 360, 300);
  scene.ctx.shadowColor = color;
  scene.ctx.shadowBlur = scene.reducedMotion ? 0 : 12;
  scene.ctx.lineWidth = 1.5;
  scene.ctx.globalAlpha = fade * 0.55;
  for (const radius of [52, 65]) {
    scene.ctx.beginPath();
    scene.ctx.ellipse(0, -2, radius, radius * 0.22, 0, 0, Math.PI * 2);
    scene.ctx.stroke();
  }
  scene.ctx.beginPath();
  for (let i = 0; i <= 5; i++) {
    const angle =
      -Math.PI / 2 +
      (i * 4 * Math.PI) / 5 +
      (scene.reducedMotion ? 0 : scene.state.visualTime * 0.00015);
    const x = Math.cos(angle) * 50,
      y = Math.sin(angle) * 11 - 2;
    if (i === 0) scene.ctx.moveTo(x, y);
    else scene.ctx.lineTo(x, y);
  }
  scene.ctx.stroke();
  // Rising ribbons frame the silhouette and fade out with the form timer.
  if (!scene.reducedMotion) {
    for (let i = 0; i < 6; i++) {
      const rise = (age * 0.09 + i * 41) % 240,
        x = (i % 2 ? 1 : -1) * (48 + Math.sin(rise * 0.018 + i) * 12);
      scene.ctx.globalAlpha = fade * Math.sin((rise / 240) * Math.PI) * 0.5;
      scene.ctx.lineWidth = 2;
      scene.ctx.beginPath();
      scene.ctx.moveTo(x, -rise);
      scene.ctx.quadraticCurveTo(
        x + (i % 2 ? 18 : -18),
        -rise - 25,
        x,
        -rise - 52,
      );
      scene.ctx.stroke();
    }
  }
  // The opening shockwave matches the immediate, single damaging H burst.
  if (age < 650) {
    scene.ctx.globalAlpha = strength;
    scene.ctx.lineWidth = 5 * (1 - burst) + 1;
    const radius = 35 + burst * (MOVES.mujicaTransform.reach! - 35);
    scene.ctx.beginPath();
    scene.ctx.ellipse(0, -100, radius, radius * 0.82, 0, 0, Math.PI * 2);
    scene.ctx.stroke();
    scene.ctx.globalAlpha = strength * 0.65;
    scene.ctx.beginPath();
    scene.ctx.ellipse(0, -2, radius * 1.2, radius * 0.22, 0, 0, Math.PI * 2);
    scene.ctx.stroke();
    if (!scene.reducedMotion)
      for (let i = 0; i < 16; i++) {
        const angle = i * 2.39996,
          near = 40 + burst * 110,
          far = near + 30 + (i % 4) * 12;
        scene.ctx.strokeStyle = i % 3 ? color : "#fff0dd";
        scene.ctx.lineWidth = i % 2 ? 2 : 3;
        scene.ctx.beginPath();
        scene.ctx.moveTo(
          Math.cos(angle) * near,
          -100 + Math.sin(angle) * near * 0.82,
        );
        scene.ctx.lineTo(
          Math.cos(angle) * far,
          -100 + Math.sin(angle) * far * 0.82,
        );
        scene.ctx.stroke();
      }
  }
  scene.ctx.restore();
}
