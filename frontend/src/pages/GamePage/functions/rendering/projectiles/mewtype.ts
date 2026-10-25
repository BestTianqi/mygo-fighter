import { MOVES, ROSTER } from "../../../../../game/engine";
import type { Wave } from "../../../../../game/objects/Wave";
import { drawMiyakoProjectile } from "../drawMiyakoSkills";
import { drawNonokaProjectile } from "../drawNonokaSkills";
import { drawRitsuProjectile } from "../drawRitsuSkills";
import { drawAraleProjectile } from "../drawAraleSkills";
import type { ProjectileContext } from "./ProjectileContext";
export function drawMewtypeWave(scene: ProjectileContext, w: Wave) {
  const owner = MOVES[w.attack].ownerCharacter!,
    color = ROSTER[owner].color;
  scene.ctx.save();
  scene.ctx.translate(w.x, 438 - w.y);
  scene.ctx.scale(w.vx >= 0 ? 1 : -1, 1);
  scene.ctx.globalAlpha = Math.min(1, w.life / 120);
  scene.ctx.strokeStyle = color;
  scene.ctx.fillStyle = color;
  scene.ctx.shadowColor = color;
  scene.ctx.shadowBlur = scene.reducedMotion ? 0 : 12;
  scene.ctx.lineWidth = 3;
  if (MOVES[w.attack].arale) {
    drawAraleProjectile(
      scene.ctx,
      MOVES[w.attack].arale,
      w.age,
      scene.reducedMotion,
    );
  } else if (MOVES[w.attack].miyako) {
    drawMiyakoProjectile(
      scene.ctx,
      MOVES[w.attack].miyako === "ink",
      w.age,
      scene.reducedMotion,
    );
  } else if (MOVES[w.attack].ritsu) {
    drawRitsuProjectile(scene.ctx, w.age, scene.reducedMotion);
  } else if (MOVES[w.attack].nonoka === "bite") {
    drawNonokaProjectile(scene.ctx);
  } else if (w.attack.endsWith("_wave")) {
    const opacity = scene.ctx.globalAlpha;
    // Trailing crescents show direction while the core identifies the character.
    for (let i = 2; i >= 0; i--) {
      scene.ctx.globalAlpha = opacity * (0.18 + (2 - i) * 0.12);
      scene.ctx.beginPath();
      scene.ctx.ellipse(-18 - i * 15, 0, w.rx!, w.ry! * 0.85, 0, -1.25, 1.25);
      scene.ctx.stroke();
    }
    scene.ctx.globalAlpha = opacity;
    if (owner === 10) {
      scene.ctx.fillStyle = "#ffd7e8";
      scene.ctx.beginPath();
      scene.ctx.moveTo(0, 25);
      scene.ctx.bezierCurveTo(-50, -5, -28, -40, 0, -20);
      scene.ctx.bezierCurveTo(28, -40, 50, -5, 0, 25);
      scene.ctx.fill();
      scene.ctx.stroke();
      scene.ctx.beginPath();
      scene.ctx.moveTo(4, -5);
      scene.ctx.lineTo(4, -23);
      scene.ctx.lineTo(15, -18);
      scene.ctx.stroke();
      scene.ctx.beginPath();
      scene.ctx.ellipse(0, -3, 6, 4, -0.3, 0, Math.PI * 2);
      scene.ctx.fillStyle = color;
      scene.ctx.fill();
    } else if (owner === 11) {
      scene.ctx.fillStyle = "#d5eaff";
      scene.ctx.beginPath();
      scene.ctx.ellipse(2, 10, 22, 17, 0.1, 0, Math.PI * 2);
      scene.ctx.fill();
      scene.ctx.stroke();
      for (let i = 0; i < 4; i++) {
        scene.ctx.beginPath();
        scene.ctx.ellipse(
          -22 + i * 15,
          -17 - Math.sin((i * Math.PI) / 3) * 8,
          7,
          10,
          (i - 1.5) * 0.2,
          0,
          Math.PI * 2,
        );
        scene.ctx.fill();
        scene.ctx.stroke();
      }
      scene.ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        scene.ctx.moveTo(12, -4 + i * 9);
        scene.ctx.lineTo(35, -10 + i * 9);
      }
      scene.ctx.stroke();
    } else if (owner === 12) {
      for (let i = 2; i >= 0; i--) {
        scene.ctx.save();
        scene.ctx.translate(-i * 14, i * 5);
        scene.ctx.rotate(-0.18 + i * 0.1);
        scene.ctx.globalAlpha = opacity * (1 - i * 0.22);
        scene.ctx.fillStyle = "#fff8ef";
        scene.ctx.fillRect(-20, -29, 40, 58);
        scene.ctx.strokeRect(-20, -29, 40, 58);
        scene.ctx.strokeRect(-14, -23, 28, 18);
        scene.ctx.strokeRect(-14, 2, 12, 20);
        scene.ctx.strokeRect(4, 2, 10, 20);
        scene.ctx.restore();
      }
      scene.ctx.beginPath();
      scene.ctx.moveTo(-33, 14);
      scene.ctx.quadraticCurveTo(3, -25, 35, -4);
      scene.ctx.stroke();
    } else if (owner === 13) {
      scene.ctx.beginPath();
      scene.ctx.ellipse(10, 0, 22, w.ry!, 0, -1.4, 1.4);
      scene.ctx.stroke();
      for (let i = 0; i < 7; i++) {
        const h = 14 + (1 + Math.sin(w.age * 0.02 + i * 1.2)) * 18;
        scene.ctx.fillRect(-28 + i * 8, -h / 2, 4, h);
      }
      scene.ctx.strokeStyle = "#ffe5fa";
      scene.ctx.lineWidth = 2;
      scene.ctx.beginPath();
      for (let x = -30; x <= 30; x += 3) {
        const y = Math.sin(x * 0.16 - w.age * 0.02) * 15;
        if (x === -30) scene.ctx.moveTo(x, y);
        else scene.ctx.lineTo(x, y);
      }
      scene.ctx.stroke();
    } else if (owner === 14) {
      scene.ctx.fillStyle = "#edfff6";
      scene.ctx.beginPath();
      scene.ctx.moveTo(29, 1);
      scene.ctx.quadraticCurveTo(-23, 41, -22, 0);
      scene.ctx.quadraticCurveTo(-23, -35, 29, 1);
      scene.ctx.fill();
      scene.ctx.stroke();
      for (const x of [-10, 6]) {
        scene.ctx.beginPath();
        scene.ctx.ellipse(x, -24, 5, 15, x < 0 ? -0.25 : 0.25, 0, Math.PI * 2);
        scene.ctx.fill();
        scene.ctx.stroke();
      }
      scene.ctx.beginPath();
      scene.ctx.moveTo(0, -6);
      scene.ctx.lineTo(10, 2);
      scene.ctx.lineTo(0, 10);
      scene.ctx.stroke();
    }
  } else if (owner === 12) {
    scene.ctx.rotate(w.age * 0.006);
    scene.ctx.fillStyle = "#fff8ef";
    scene.ctx.fillRect(-21, -28, 42, 56);
    scene.ctx.strokeRect(-21, -28, 42, 56);
    scene.ctx.lineWidth = 2;
    scene.ctx.strokeRect(-15, -22, 30, 19);
    scene.ctx.strokeRect(-15, 3, 13, 18);
    scene.ctx.strokeRect(4, 3, 11, 18);
  } else if (owner === 13) {
    scene.ctx.fillStyle = "#222336";
    scene.ctx.beginPath();
    scene.ctx.ellipse(0, 0, 38, 16, -0.2, 0, Math.PI * 2);
    scene.ctx.fill();
    scene.ctx.stroke();
    for (let r = 9; r < 35; r += 8) {
      scene.ctx.beginPath();
      scene.ctx.ellipse(0, 0, r, r * 0.4, -0.2, 0, Math.PI * 2);
      scene.ctx.stroke();
    }
    scene.ctx.fillStyle = color;
    scene.ctx.beginPath();
    scene.ctx.arc(0, 0, 5, 0, Math.PI * 2);
    scene.ctx.fill();
  } else {
    for (let i = 0; i < 3; i++) {
      scene.ctx.globalAlpha *= 0.8;
      scene.ctx.beginPath();
      scene.ctx.ellipse(
        -i * 12,
        0,
        Math.max(8, w.rx! - i * 4),
        Math.max(12, w.ry! - i * 7),
        0,
        -1.35,
        1.35,
      );
      scene.ctx.stroke();
    }
    scene.ctx.globalAlpha = Math.min(1, w.life / 120);
    scene.ctx.beginPath();
    scene.ctx.ellipse(0, 8, 8, 5, -0.4, 0, Math.PI * 2);
    scene.ctx.fill();
    scene.ctx.beginPath();
    scene.ctx.moveTo(7, 8);
    scene.ctx.lineTo(7, -20);
    scene.ctx.lineTo(18, -13);
    scene.ctx.stroke();
  }
  scene.ctx.restore();
}
