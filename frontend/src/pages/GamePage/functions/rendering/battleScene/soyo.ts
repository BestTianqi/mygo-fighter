import { MOVES } from "../../../../../game/engine";
import type { BattleSceneContext } from "./objects";
export function drawSoyoEffect(scene: BattleSceneContext, side: number) {
  const f = scene.match.fighters[side],
    move = MOVES[f.attack ?? ""],
    t = f.attackMs;
  if (f.character !== 1 || scene.match.phase !== "fighting" || f.stun || !move)
    return;
  scene.ctx.save();
  scene.ctx.translate(f.x, 438 - f.y);
  if (f.attack === "soyoCutline") {
    scene.ctx.scale(f.facing, 1);
    scene.ctx.lineCap = "round";
    scene.ctx.shadowColor = "#f6d6a4";
    scene.ctx.shadowBlur = scene.reducedMotion ? 0 : 12;
    if (t < move.start) {
      const ready = t / move.start;
      scene.ctx.strokeStyle = "#f4dbb8";
      scene.ctx.lineWidth = 1.4;
      scene.ctx.globalAlpha = 0.25 + ready * 0.45;
      for (const slope of [-1, 1]) {
        scene.ctx.beginPath();
        scene.ctx.moveTo(28, -112 + slope * 13);
        scene.ctx.lineTo(65 + ready * 36, -112 - slope * 30);
        scene.ctx.stroke();
      }
    }
    for (let i = 0; i < move.pulses!.length; i++) {
      const age = t - move.pulses![i].at;
      if (age < 0 || age > 290) continue;
      const growth = Math.min(1, age / 75),
        fade = 1 - age / 290;
      const end = 42 + (move.reach! - 42) * growth,
        slope = i ? -1 : 1;
      const startY = -112 + slope * 49,
        endY = -112 - slope * 49;
      scene.ctx.globalAlpha = fade * 0.95;
      for (const [width, color] of [
        [10, "#e4b77b44"],
        [4, "#e8bf84"],
        [1.4, "#fff6df"],
      ] as const) {
        scene.ctx.lineWidth = width;
        scene.ctx.strokeStyle = color;
        scene.ctx.beginPath();
        scene.ctx.moveTo(42, startY);
        scene.ctx.lineTo(end, startY + (endY - startY) * growth);
        scene.ctx.stroke();
      }
      scene.ctx.strokeStyle = "#fff4d7";
      scene.ctx.lineWidth = 1.5;
      const cutX = end - 18,
        cutY = startY + (endY - startY) * growth;
      scene.ctx.beginPath();
      scene.ctx.moveTo(cutX - 7, cutY - 9);
      scene.ctx.lineTo(cutX + 7, cutY + 9);
      scene.ctx.moveTo(cutX - 7, cutY + 9);
      scene.ctx.lineTo(cutX + 7, cutY - 9);
      scene.ctx.stroke();
      if (!scene.reducedMotion)
        for (let n = 0; n < 5; n++) {
          scene.ctx.globalAlpha = fade * 0.65;
          scene.ctx.fillStyle = "#ffebbf";
          const x = 65 + ((end - 65) * n) / 5,
            y = startY + ((endY - startY) * n) / 5;
          scene.ctx.fillRect(
            x + age * 0.035,
            y + Math.sin(n * 2) * age * 0.06,
            3,
            2,
          );
        }
    }
  } else if (f.attack === "heal") {
    const progress = Math.min(1, t / move.start),
      fade = t > 950 ? (move.duration - t) / 250 : 1;
    scene.ctx.strokeStyle = "#a4e8c7";
    scene.ctx.fillStyle = "#d5ffe7";
    scene.ctx.lineWidth = 1.8;
    scene.ctx.shadowColor = "#87dcb7";
    scene.ctx.shadowBlur = scene.reducedMotion ? 0 : 10;
    scene.ctx.globalAlpha = 0.65 * fade;
    scene.ctx.beginPath();
    scene.ctx.ellipse(0, -4, 36 + progress * 12, 9, 0, 0, Math.PI * 2);
    scene.ctx.stroke();
    scene.ctx.beginPath();
    scene.ctx.arc(
      0,
      -145,
      25 + progress * 13,
      -Math.PI / 2,
      -Math.PI / 2 + progress * Math.PI * 2,
    );
    scene.ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const phase = (t / 1000 + i / 6) % 1,
        x = Math.sin(i * 2.4 + t / 500) * 40,
        y = -30 - phase * 170;
      scene.ctx.globalAlpha = Math.sin(phase * Math.PI) * 0.75 * fade;
      scene.ctx.fillRect(x - 1, y - 4, 2, 8);
      scene.ctx.fillRect(x - 4, y - 1, 8, 2);
    }
  } else if (
    ["light", "special", "summon"].includes(f.attack ?? "") &&
    t >= move.start &&
    t < move.end + 110
  ) {
    const phase = (t - move.start) / (move.end + 110 - move.start);
    scene.ctx.scale(f.facing, 1);
    scene.ctx.strokeStyle = f.attack === "summon" ? "#f2d398" : "#b2dce4";
    scene.ctx.globalAlpha = (1 - phase) * 0.7;
    scene.ctx.lineWidth = 1.5;
    scene.ctx.beginPath();
    scene.ctx.ellipse(
      65 + phase * 45,
      -125,
      12 + phase * 15,
      28 + phase * 25,
      -0.15,
      -0.9,
      1.5,
    );
    scene.ctx.stroke();
  }
  scene.ctx.restore();
}
