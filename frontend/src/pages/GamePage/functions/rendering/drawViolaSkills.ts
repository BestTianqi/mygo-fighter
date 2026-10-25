import type { Area } from "../../../../game/objects/Area";
import type { Fighter } from "../../../../game/objects/Fighter";
import type { Move } from "../../../../game/objects/Move";

function viewfinder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const corner = Math.min(width, height) * 0.2;
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) {
      const left = x + (sx * width) / 2,
        top = y + (sy * height) / 2;
      ctx.beginPath();
      ctx.moveTo(left - sx * corner, top);
      ctx.lineTo(left, top);
      ctx.lineTo(left, top - sy * corner);
      ctx.stroke();
    }
}

/** Editing motifs are game effects, not additional canonical powers. */
export function drawViolaSkill(
  ctx: CanvasRenderingContext2D,
  f: Fighter,
  move: Move,
  reduced: boolean,
) {
  ctx.save();
  const active = f.attackMs >= move.start && f.attackMs <= move.end;
  ctx.strokeStyle = "#bfffe4";
  ctx.fillStyle = "#c3ffdf";
  ctx.lineWidth = active ? 3 : 1.5;
  ctx.globalAlpha = active ? 0.8 : 0.4;
  ctx.shadowColor = "#86cfb0";
  ctx.shadowBlur = reduced ? 0 : 8;
  if (move.viola === "broadcast" && f.attackTarget) {
    const x = (f.attackTarget.x - f.x) * f.facing,
      y = f.y - f.attackTarget.y - 120;
    viewfinder(ctx, x, y, move.areaRadius! * 2, 320);
    for (const pulse of move.pulses!) {
      const t = (f.attackMs - pulse.at) / 240;
      if (t < 0 || t > 1) continue;
      ctx.globalAlpha = (1 - t) * 0.75;
      ctx.fillStyle = "#b6e7d2";
      const width = move.areaRadius! * 2 * Math.min(1, 0.25 + t * 2);
      ctx.fillRect(x - width / 2, y - 150, width, 300);
      ctx.strokeStyle = "#ffadb6";
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(x - move.areaRadius!, y + i * 50 - 18);
        ctx.lineTo(x + move.areaRadius!, y + i * 50 + 18);
        ctx.stroke();
      }
    }
  } else if (move.viola === "flash") {
    const p = Math.min(1, f.attackMs / move.start);
    viewfinder(ctx, 0, -120, move.reach! * 2 * p, 220 * p);
    if (active) {
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.ellipse(0, -120, move.reach!, 120, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (move.viola === "dismiss") {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(35, -90 - i * 25);
      ctx.lineTo(move.reach!, -105 - i * 25);
      ctx.lineTo(move.reach! - 25, -120 - i * 25);
      ctx.stroke();
    }
  } else {
    viewfinder(ctx, 65, -150, 50, 38);
    ctx.beginPath();
    ctx.arc(80, -160, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#ff8d9c";
    ctx.fill();
  }
  ctx.restore();
}

export function drawViolaArea(ctx: CanvasRenderingContext2D, area: Area) {
  ctx.save();
  ctx.translate(area.x, 438 - area.y);
  ctx.strokeStyle = area.fired ? "#ffafb9" : "#a4e5c6";
  ctx.lineWidth = area.fired ? 4 : 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, area.radius, 18, 0, 0, Math.PI * 2);
  ctx.stroke();
  viewfinder(ctx, 0, -140, area.radius * 2, 280);
  const progress = Math.max(0, Math.min(1, 1 - area.warning / 700));
  ctx.fillStyle = "#c7ffe2";
  ctx.fillRect(-area.radius, -3, area.radius * 2 * progress, 6);
  if (area.fired) {
    ctx.globalAlpha *= 0.35;
    ctx.fillRect(-area.radius, -280, area.radius * 2, 280);
  }
  ctx.restore();
}

export function drawViolaProjectile(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#1a3430";
  ctx.fillRect(-25, -38, 50, 76);
  ctx.strokeStyle = "#c8ffe0";
  ctx.strokeRect(-25, -38, 50, 76);
  for (const x of [-20, 15])
    for (let y = -32; y < 33; y += 16) {
      ctx.fillStyle = "#d4ffe8";
      ctx.fillRect(x, y, 5, 8);
    }
  ctx.strokeStyle = "#ffafc2";
  ctx.strokeRect(-10, -26, 20, 20);
  ctx.strokeRect(-10, 6, 20, 20);
  ctx.beginPath();
  ctx.moveTo(-32, 17);
  ctx.lineTo(32, -17);
  ctx.stroke();
}
