import { MOVES } from "../../../../../game/engine";
import type { Wave } from "../../../../../game/objects/Wave";
import type { ProjectileContext } from "./ProjectileContext";
import { drawMewtypeWave } from "./mewtype";
import { drawMujicaWave } from "./mujica";
import { drawPenguinWave, drawSonicWave, drawVoiceWave } from "./vocals";
export function drawWave(scene: ProjectileContext, w: Wave) {
  const move = MOVES[w.attack];
  if (move.visualBase) {
    scene.ctx.save();
    if (move.backSkill === "lob") {
      const y = 438 - w.y;
      scene.ctx.translate(w.x, y);
      scene.ctx.rotate((w.vx >= 0 ? 1 : -1) * w.age * 0.005);
      scene.ctx.translate(-w.x, -y);
    }
    drawWave(scene, { ...w, attack: move.visualBase });
    scene.ctx.restore();
    return;
  }
  if (MOVES[w.attack]?.customerService) {
    scene.ctx.save();
    scene.ctx.translate(w.x, 438 - w.y);
    scene.ctx.scale(w.vx > 0 ? 1 : -1, 1);
    scene.ctx.globalAlpha = Math.min(1, w.life / 150);
    scene.ctx.strokeStyle = "#b5cffc";
    scene.ctx.fillStyle = "#ecf2ff";
    scene.ctx.lineWidth = 3;
    scene.ctx.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      scene.ctx.beginPath();
      scene.ctx.ellipse(
        i * 12 - 17,
        0,
        10 + i * 7,
        22 + i * 12,
        0,
        -1.25,
        1.25,
      );
      scene.ctx.stroke();
    }
    // A phone receiver identifies this as the customer-service call, separate from keyboard waves.
    scene.ctx.save();
    scene.ctx.rotate(-0.35);
    scene.ctx.lineWidth = 6;
    scene.ctx.beginPath();
    scene.ctx.arc(-17, 0, 15, -0.95, 0.95);
    scene.ctx.stroke();
    scene.ctx.fillRect(-12, -17, 10, 8);
    scene.ctx.fillRect(-12, 9, 10, 8);
    scene.ctx.restore();
    scene.ctx.restore();
    return;
  }
  if (w.radial) {
    scene.ctx.save();
    scene.ctx.translate(w.x, 438 - w.y);
    scene.ctx.globalAlpha = Math.min(1, w.life / 220);
    if (MOVES[w.attack].mortis === "scream") {
      scene.ctx.strokeStyle = "#c4edb4";
      scene.ctx.shadowColor = "#83ad80";
      scene.ctx.shadowBlur = scene.reducedMotion ? 0 : 14;
      scene.ctx.lineWidth = 3.5;
      scene.ctx.beginPath();
      scene.ctx.arc(0, 0, w.radius!, 0, Math.PI * 2);
      scene.ctx.stroke();
      scene.ctx.strokeStyle = "#bba3ef";
      scene.ctx.lineWidth = 2;
      scene.ctx.beginPath();
      for (let i = 0; i <= 96; i++) {
        const angle = (i * Math.PI * 2) / 96,
          vibration = scene.reducedMotion ? 0 : Math.sin(w.age * 0.04 + i) * 2,
          radius = Math.max(
            0,
            w.radius! - 12 + (i % 3 === 0 ? 9 : -3) + vibration,
          ),
          x = Math.cos(angle) * radius,
          y = Math.sin(angle) * radius;
        if (i === 0) scene.ctx.moveTo(x, y);
        else scene.ctx.lineTo(x, y);
      }
      scene.ctx.closePath();
      scene.ctx.stroke();
      // Broken mask fragments travel with the wave instead of musical notes.
      scene.ctx.fillStyle = "#e4e8d8";
      for (let i = 0; i < 8; i++) {
        const angle =
            (i * Math.PI) / 4 + (scene.reducedMotion ? 0 : w.age * 0.0003),
          x = Math.cos(angle) * w.radius!,
          y = Math.sin(angle) * w.radius!;
        scene.ctx.save();
        scene.ctx.translate(x, y);
        scene.ctx.rotate(angle);
        scene.ctx.beginPath();
        scene.ctx.moveTo(-7, -3);
        scene.ctx.lineTo(4, -7);
        scene.ctx.lineTo(8, 2);
        scene.ctx.lineTo(-3, 5);
        scene.ctx.closePath();
        scene.ctx.fill();
        scene.ctx.restore();
      }
      scene.ctx.restore();
      return;
    }
    scene.ctx.strokeStyle = "#c4ebff";
    scene.ctx.lineWidth = 4;
    scene.ctx.shadowColor = "#a7dfff";
    scene.ctx.shadowBlur = scene.reducedMotion ? 0 : 12;
    scene.ctx.beginPath();
    scene.ctx.arc(0, 0, w.radius!, 0, Math.PI * 2);
    scene.ctx.stroke();
    scene.ctx.strokeStyle = "#fff0bc";
    scene.ctx.lineWidth = 1.5;
    scene.ctx.beginPath();
    scene.ctx.arc(0, 0, Math.max(0, w.radius! - 10), 0, Math.PI * 2);
    scene.ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const angle =
          (i * Math.PI) / 3 + (scene.reducedMotion ? 0 : w.age * 0.00035),
        x = Math.cos(angle) * w.radius!,
        y = Math.sin(angle) * w.radius!;
      scene.ctx.beginPath();
      scene.ctx.ellipse(x, y, 5, 3, -0.4, 0, Math.PI * 2);
      scene.ctx.stroke();
      scene.ctx.beginPath();
      scene.ctx.moveTo(x + 4, y);
      scene.ctx.lineTo(x + 4, y - 16);
      scene.ctx.lineTo(x + 12, y - 12);
      scene.ctx.stroke();
    }
    scene.ctx.restore();
    return;
  }
  if (w.attack === "anonCry") {
    scene.ctx.save();
    scene.ctx.translate(w.x, 438 - w.y);
    scene.ctx.scale(w.vx > 0 ? 1 : -1, 1);
    scene.ctx.globalAlpha = Math.min(1, w.life / 150);
    scene.ctx.strokeStyle = "#b7e7ff";
    scene.ctx.fillStyle = "#dbf3ff";
    scene.ctx.shadowColor = "#80c4ef";
    scene.ctx.shadowBlur = scene.reducedMotion ? 0 : 12;
    scene.ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      scene.ctx.beginPath();
      scene.ctx.ellipse(
        -i * 14,
        0,
        Math.max(7, w.rx! - i * 5),
        Math.max(10, w.ry! - i * 8),
        0,
        -1.35,
        1.35,
      );
      scene.ctx.stroke();
    }
    for (const [x, y] of [
      [-12, -18],
      [-31, 20],
    ]) {
      scene.ctx.beginPath();
      scene.ctx.moveTo(x, y - 10);
      scene.ctx.quadraticCurveTo(x - 10, y + 4, x, y + 7);
      scene.ctx.quadraticCurveTo(x + 9, y + 3, x, y - 10);
      scene.ctx.fill();
    }
    scene.ctx.restore();
    return;
  }
  if ((MOVES[w.attack]?.ownerCharacter ?? -1) >= 10) {
    drawMewtypeWave(scene, w);
    return;
  }
  if ((MOVES[w.attack]?.ownerCharacter ?? -1) >= 5) {
    drawMujicaWave(scene, w);
    return;
  }
  if (MOVES[w.attack]?.rikiOnly) {
    scene.ctx.save();
    scene.ctx.translate(w.x, 438 - w.y);
    scene.ctx.scale(w.vx > 0 ? 1 : -1, 1);
    scene.ctx.strokeStyle = MOVES[w.attack].boosted ? "#ffe0a1" : "#dfccff";
    scene.ctx.fillStyle = "#baa0e333";
    scene.ctx.lineWidth = 4;
    scene.ctx.beginPath();
    scene.ctx.ellipse(0, 10, w.rx!, w.ry!, -0.25, -1.8, 1.3);
    scene.ctx.fill();
    scene.ctx.stroke();
    scene.ctx.lineWidth = 2;
    for (let i = 1; i <= 3; i++) {
      scene.ctx.globalAlpha = 0.4 / i;
      scene.ctx.beginPath();
      scene.ctx.ellipse(-i * 18, 10, w.rx!, w.ry!, -0.25, -1.8, 1.3);
      scene.ctx.stroke();
    }
    scene.ctx.globalAlpha = 0.9;
    scene.ctx.beginPath();
    scene.ctx.ellipse(0, 7, 17, 24, -0.25, 0, Math.PI * 2);
    scene.ctx.moveTo(-13, 24);
    scene.ctx.lineTo(13, -10);
    scene.ctx.stroke();
    scene.ctx.beginPath();
    scene.ctx.moveTo(-48, 38);
    scene.ctx.lineTo(15, 38);
    scene.ctx.stroke();
    scene.ctx.restore();
    return;
  }
  if (w.attack === "ranaParfait") {
    const parfaitImage = scene.getImage(scene.assets.ranaParfait.src);
    if (!parfaitImage) return;
    const h = scene.assets.ranaParfait.height,
      width = (parfaitImage.width / parfaitImage.height) * h;
    scene.ctx.save();
    scene.ctx.translate(w.x, 438 - w.y);
    scene.ctx.scale(w.vx > 0 ? 1 : -1, 1);
    scene.ctx.rotate(
      Math.atan2(-w.vy!, Math.abs(w.vx)) * 0.35 +
        Math.sin(w.age * 0.009) * 0.16,
    );
    scene.ctx.globalAlpha = Math.min(1, w.life / 120);
    scene.ctx.shadowColor = "#82953e";
    scene.ctx.shadowBlur = scene.reducedMotion ? 0 : 5;
    scene.ctx.drawImage(parfaitImage, -width / 2, -h / 2, width, h);
    scene.ctx.restore();
    return;
  }
  if (MOVES[w.attack]?.penguinOnly) {
    drawPenguinWave(scene, w);
    return;
  }
  if (MOVES[w.attack]?.ranaOnly) {
    scene.ctx.save();
    scene.ctx.translate(w.x, 438 - w.y);
    scene.ctx.scale(w.vx > 0 ? 1 : -1, 1);
    scene.ctx.strokeStyle = w.attack === "ranaChord" ? "#fff0b9" : "#d2f4c9";
    scene.ctx.lineWidth = 2;
    scene.ctx.globalAlpha = Math.min(1, w.life / 150);
    scene.ctx.shadowColor = "#a4d6ad";
    scene.ctx.shadowBlur = scene.reducedMotion ? 0 : 12;
    for (let i = 0; i < 6; i++) {
      scene.ctx.beginPath();
      scene.ctx.ellipse(
        -i * 6,
        0,
        Math.max(6, w.rx! - i * 2),
        Math.max(10, w.ry! - i * 3),
        0,
        -1.35,
        1.35,
      );
      scene.ctx.stroke();
    }
    scene.ctx.fillStyle = "#e9ffdb";
    scene.ctx.beginPath();
    scene.ctx.ellipse(0, 8, 6, 4, -0.35, 0, Math.PI * 2);
    scene.ctx.fill();
    scene.ctx.beginPath();
    scene.ctx.moveTo(5, 8);
    scene.ctx.lineTo(5, -16);
    scene.ctx.lineTo(15, -10);
    scene.ctx.stroke();
    scene.ctx.restore();
    return;
  }
  if (MOVES[w.attack]?.tomoriOnly) {
    drawVoiceWave(scene, w);
    return;
  }
  if (w.attack === "sonic") {
    drawSonicWave(scene, w);
    return;
  }
  const x = w.x,
    y = 438 - w.y,
    color = scene.colors[w.owner];
  scene.ctx.save();
  scene.ctx.translate(x, y);
  scene.ctx.scale(w.vx > 0 ? 1 : -1, 1);
  scene.ctx.shadowColor = color;
  scene.ctx.shadowBlur = 20;
  scene.ctx.strokeStyle = color;
  scene.ctx.fillStyle = color;
  scene.ctx.lineWidth = 3;
  scene.ctx.beginPath();
  scene.ctx.ellipse(0, 0, 16, 22, 0, -0.5 * Math.PI, 0.5 * Math.PI);
  scene.ctx.stroke();
  scene.ctx.font = "bold 38px Georgia";
  scene.ctx.textAlign = "center";
  scene.ctx.fillText("♪", 0, 12);
  scene.ctx.globalAlpha = 0.45;
  scene.ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    scene.ctx.beginPath();
    scene.ctx.moveTo(-24 - i * 10, -10 + i * 10);
    scene.ctx.lineTo(-42 - i * 9, -10 + i * 10);
    scene.ctx.stroke();
  }
  scene.ctx.restore();
}
