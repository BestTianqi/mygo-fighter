import { MOVES, ROSTER } from "../../../../../game/engine";
import type { Wave } from "../../../../../game/objects/Wave";
import { drawBurger } from "../drawBurger";
import { drawNyamuProjectile } from "../drawNyamuSkills";
import { drawUikaProjectile } from "../drawUikaSkills";
import { drawUmiriProjectile } from "../drawUmiriSkills";
import type { ProjectileContext } from "./ProjectileContext";
export function drawMujicaWave(scene: ProjectileContext, w: Wave) {
  const move = MOVES[w.attack],
    profile = ROSTER[move.ownerCharacter!];
  scene.ctx.save();
  scene.ctx.translate(w.x, 438 - w.y);
  scene.ctx.scale(w.vx >= 0 ? 1 : -1, 1);
  scene.ctx.globalAlpha = Math.min(1, w.life / 120);
  scene.ctx.strokeStyle = profile.color;
  scene.ctx.fillStyle = profile.color;
  scene.ctx.shadowColor = profile.color;
  scene.ctx.shadowBlur = scene.reducedMotion ? 0 : 10;
  scene.ctx.lineWidth = 3;
  if (move.uika) {
    drawUikaProjectile(scene.ctx, w.age, scene.reducedMotion);
  } else if (move.umiri) {
    drawUmiriProjectile(scene.ctx, move, w.age, scene.reducedMotion);
  } else if (move.nyamu) {
    drawNyamuProjectile(scene.ctx, move, w.age, scene.reducedMotion);
  } else if (move.mortis === "burger") {
    scene.ctx.rotate(Math.sin(w.age * 0.009) * 0.12);
    drawBurger(scene.ctx, 0, 0);
  } else if (
    move.ownerCharacter! === 8 &&
    move.form === "normal" &&
    move.slot === "u"
  ) {
    scene.ctx.rotate(w.age * 0.008);
    scene.ctx.fillStyle = "#76a347";
    scene.ctx.strokeStyle = "#d7e89d";
    scene.ctx.beginPath();
    scene.ctx.ellipse(0, 0, 29, 10, 0, 0, Math.PI * 2);
    scene.ctx.fill();
    scene.ctx.stroke();
    scene.ctx.strokeStyle = "#aac773";
    scene.ctx.lineWidth = 1;
    for (const y of [-4, 0, 4]) {
      scene.ctx.beginPath();
      scene.ctx.moveTo(-22, y);
      scene.ctx.lineTo(22, y);
      scene.ctx.stroke();
    }
  } else if (move.ownerCharacter! === 6) {
    for (let i = 0; i < 4; i++) {
      scene.ctx.globalAlpha *= 0.88;
      scene.ctx.fillRect(-i * 12, -w.ry! / 2, 8, w.ry!);
    }
  } else {
    for (let i = 0; i < 4; i++) {
      scene.ctx.globalAlpha *= 0.8;
      scene.ctx.beginPath();
      scene.ctx.ellipse(
        -i * 10,
        0,
        Math.max(6, w.rx! - i * 3),
        Math.max(8, w.ry! - i * 5),
        0,
        -1.4,
        1.4,
      );
      scene.ctx.stroke();
    }
    if (move.groundShock) {
      scene.ctx.beginPath();
      scene.ctx.moveTo(-45, 20);
      scene.ctx.lineTo(22, 20);
      scene.ctx.stroke();
    }
  }
  scene.ctx.restore();
}
