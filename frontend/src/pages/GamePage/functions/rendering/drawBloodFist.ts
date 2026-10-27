import type { Fighter } from "../../../../game/objects/Fighter";
import type { Move } from "../../../../game/objects/Move";

function fist(ctx: CanvasRenderingContext2D, x: number, y: number, alpha = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = "#f3c5ba";
  ctx.strokeStyle = "#bb334e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-23, -13);
  ctx.lineTo(-9, -22);
  ctx.lineTo(17, -18);
  ctx.lineTo(26, -8);
  ctx.lineTo(22, 13);
  ctx.lineTo(7, 22);
  ctx.lineTo(-20, 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  for (const x of [-6, 3, 12]) {
    ctx.beginPath();
    ctx.moveTo(x, -17);
    ctx.lineTo(x - 2, -3);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-19, -2);
  ctx.lineTo(3, 2);
  ctx.lineTo(10, 10);
  ctx.stroke();
  ctx.restore();
}

/** Charged straight punch: pull back, extend once, then recover. */
export function drawBloodFist(
  ctx: CanvasRenderingContext2D,
  f: Fighter,
  move: Move,
  reduced: boolean,
) {
  const age = f.attackMs;
  const active = age >= move.start && age <= move.end;
  const extension =
    age < move.start
      ? 0
      : age <= move.end
        ? Math.min(1, (age - move.start + 30) / 70)
        : 1 - Math.min(1, (age - move.end) / 200);
  const x = 54 + extension * (move.reach! - 75);
  ctx.save();
  ctx.translate(f.x, 438 - f.y);
  ctx.scale(f.facing, 1);
  ctx.shadowColor = "#fb466d";
  ctx.shadowBlur = reduced ? 0 : active ? 22 : 10;
  ctx.globalAlpha = age > move.end + 200 ? 0.25 : 0.95;
  ctx.strokeStyle = "#ff5876";
  ctx.fillStyle = "#ed37552a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, -137, active ? 40 : 26, 32, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (active) {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(25 - i * 14, -153 + i * 16);
      ctx.quadraticCurveTo(x * 0.6, -168 + i * 20, x - 20, -147 + i * 10);
      ctx.stroke();
    }
    if (!reduced) fist(ctx, x - 34, -137, 0.2);
  }
  fist(ctx, x, -137);
  ctx.restore();
}

export function drawLifestealAura(
  ctx: CanvasRenderingContext2D,
  f: Fighter,
  now: number,
  reduced: boolean,
) {
  ctx.save();
  ctx.translate(f.x, 438 - f.y);
  ctx.scale(f.facing, 1);
  const pulse = reduced ? 0 : Math.sin(now / 140) * 0.12;
  ctx.globalAlpha = 0.5 + pulse;
  ctx.strokeStyle = "#fa6b89";
  ctx.fillStyle = "#d92d4b18";
  ctx.shadowColor = "#ff315f";
  ctx.shadowBlur = reduced ? 0 : 10;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, -3, 54, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  for (const [x, y] of [
    [-24, -118],
    [54, -133],
  ]) {
    ctx.beginPath();
    ctx.ellipse(x, y, 14 + pulse * 10, 21, -0.3, -1.2, 1.8);
    ctx.stroke();
  }
  ctx.restore();
}
