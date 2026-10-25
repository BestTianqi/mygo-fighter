/** Mortis' authored burger projectile and windup prop. */
export function drawBurger(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.shadowBlur = 5;
  ctx.strokeStyle = "#7b4926";
  ctx.lineWidth = 1.5;
  ctx.fillStyle = "#e9ac53";
  ctx.beginPath();
  ctx.moveTo(-32, -4);
  ctx.bezierCurveTo(-34, -35, 34, -35, 32, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fff2bf";
  for (const [sx, sy] of [
    [-16, -17],
    [0, -23],
    [15, -15],
    [-4, -12],
  ]) {
    ctx.beginPath();
    ctx.ellipse(sx, sy, 3, 1.4, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#76b64c";
  ctx.fillRect(-35, -2, 70, 5);
  ctx.fillStyle = "#ce5147";
  ctx.fillRect(-31, 3, 62, 5);
  ctx.fillStyle = "#623927";
  ctx.fillRect(-33, 8, 66, 10);
  ctx.fillStyle = "#ffdc65";
  ctx.beginPath();
  ctx.moveTo(-32, 8);
  ctx.lineTo(28, 8);
  ctx.lineTo(12, 18);
  ctx.lineTo(-3, 12);
  ctx.lineTo(-20, 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#e9ac53";
  ctx.beginPath();
  ctx.roundRect(-32, 18, 64, 10, 5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
