import type { Fighter } from "../../../../game/objects/Fighter";
import type { Move } from "../../../../game/objects/Move";

/** World-space field remains at release height while Sakiko ascends above it. */
export function drawSakikoSuper(
  ctx: CanvasRenderingContext2D,
  fighter: Fighter,
  move: Move,
  reducedMotion: boolean,
  foreground = false,
) {
  const origin = fighter.attackTarget;
  if (!origin) return;
  const age = fighter.attackMs,
    radius = move.areaRadius!,
    fade = Math.min(1, (move.duration - age) / 250),
    target = fighter.binding ?? origin,
    floor = 438 - target.y,
    center = 438 - origin.y - 100;
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#c4ceff";
  ctx.shadowColor = "#8a98ff";
  ctx.shadowBlur = reducedMotion ? 0 : 10;
  if (!foreground) {
    ctx.globalAlpha = 0.1 * fade;
    ctx.fillStyle = "#8b92ff";
    ctx.beginPath();
    ctx.arc(origin.x, center, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.55 * fade;
    ctx.beginPath();
    ctx.arc(origin.x, center, radius, 0, Math.PI * 2);
    ctx.stroke();
    if (age < 280) {
      ctx.globalAlpha = (1 - age / 280) * 0.85;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(
        origin.x,
        center,
        radius * Math.min(1, age / 130),
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
    ctx.globalAlpha = 0.65 * fade;
    ctx.strokeStyle = "#f4ddb0";
    ctx.beginPath();
    ctx.ellipse(fighter.x, 438 - fighter.y - 245, 45, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
    // A suspended keyboard opens above the captured point; each chord rains down.
    for (let key = -3; key <= 3; key++) {
      ctx.fillStyle = key % 2 ? "#cbd4ff" : "#fff0cf";
      ctx.globalAlpha = 0.65 * fade;
      ctx.fillRect(target.x + key * 24 - 8, floor - 440, 16, key % 2 ? 34 : 48);
    }
    for (const [index, pulse] of move.pulses!.entries()) {
      const lead = age - pulse.at + 180;
      if (lead < 0 || lead > 420) continue;
      const fall = Math.min(1, lead / 180),
        tail = Math.max(0, 1 - Math.max(0, lead - 180) / 240);
      ctx.globalAlpha = (fighter.binding ? 0.9 : 0.35) * tail * fade;
      ctx.strokeStyle = index === 2 ? "#ffe7a9" : "#d8e2ff";
      ctx.lineWidth = index === 2 ? 6 : 3;
      for (let ray = -2; ray <= 2; ray++) {
        const x = target.x + ray * 35;
        ctx.beginPath();
        ctx.moveTo(x, floor - 420);
        ctx.lineTo(x, floor - 420 + 390 * fall);
        ctx.stroke();
        for (let ring = 0; ring < 3; ring++) {
          const y = floor - 420 + 390 * fall - ring * 45;
          ctx.beginPath();
          ctx.ellipse(x, y, 18 + index * 4, 6, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
  } else if (fighter.binding) {
    // The binding's front arcs and ankle seal remain readable over the victim.
    ctx.strokeStyle = "#e1d4ff";
    ctx.globalAlpha = 0.75 * fade;
    ctx.lineWidth = 2;
    for (const y of [floor - 45, floor - 115, floor - 185]) {
      ctx.beginPath();
      ctx.ellipse(target.x, y, 46, 13, 0, 0, Math.PI);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(target.x, floor - 3, 68, 15, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (const [index, pulse] of move.pulses!.entries()) {
      const t = (age - pulse.at) / 260;
      if (t < 0 || t > 1) continue;
      ctx.globalAlpha = (1 - t) * 0.8 * fade;
      ctx.lineWidth = 4 - t * 3;
      ctx.strokeStyle = index === 2 ? "#ffe7a9" : "#d8e2ff";
      ctx.beginPath();
      ctx.ellipse(
        target.x,
        floor - 5,
        20 + t * 135,
        7 + t * 32,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
  }
  ctx.restore();
}
