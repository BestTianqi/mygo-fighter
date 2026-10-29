import type { Fighter } from "../../../../game/objects/Fighter";
import type { Move } from "../../../../game/objects/Move";

/** Cat steps and guitar strings follow the existing poses and impact times. */
export function drawRanaSkill(
  ctx: CanvasRenderingContext2D,
  f: Fighter,
  move: Move,
  reduced: boolean,
) {
  const t = f.attackMs;
  ctx.save();
  ctx.strokeStyle = "#d7f7c5";
  ctx.fillStyle = "#c6e4b0";
  ctx.shadowColor = "#86bc8c";
  ctx.shadowBlur = reduced ? 0 : 8;
  ctx.lineWidth = 2.5;
  if (f.attack === "ranaTune") {
    const progress = Math.min(1, t / move.start);
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.ellipse(
      0,
      -10,
      58,
      12,
      0,
      -Math.PI / 2,
      -Math.PI / 2 + progress * Math.PI * 2,
    );
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(8, -100 + i * 4);
      ctx.lineTo(70, -130 + i * 4);
      ctx.stroke();
    }
  } else if (move.pulses) {
    for (const [i, pulse] of move.pulses.entries()) {
      const p = (t - pulse.at) / 180;
      if (p < 0 || p > 1) continue;
      ctx.globalAlpha = (1 - p) * 0.8;
      const big = move.category === "super";
      for (let string = 0; string < (big ? 6 : 3); string++) {
        ctx.beginPath();
        ctx.ellipse(
          0,
          -110,
          (pulse.reach ?? move.reach!) * (0.85 + p * 0.15) - string * 9,
          (big ? 120 : 50) + string * 5,
          i % 2 ? -0.15 : 0.15,
          -1.3,
          1.3,
        );
        ctx.stroke();
      }
    }
  }
  if (
    ["ranaRush", "ranaSlide", "ranaDive"].includes(f.attack!) &&
    t <= move.end
  ) {
    // Only footstep marks trail the fighter; no duplicate full-body silhouettes.
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = (0.45 - i * 0.12) * Math.min(1, t / 80);
      const x = -35 - i * 34,
        y = -8 - (i % 2) * 10;
      ctx.beginPath();
      ctx.ellipse(x, y, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let toe = 0; toe < 3; toe++) {
        ctx.beginPath();
        ctx.arc(x + 7, y - 8 + toe * 6, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  if (move.shots) {
    const shot = move.shots.reduce((last, at, i) => (t >= at ? i : last), -1);
    for (let i = 0; i < move.shots.length; i++) {
      ctx.globalAlpha = i <= shot ? 0.8 : 0.25;
      ctx.beginPath();
      ctx.ellipse((i - 1.5) * 18, -245, 5, 3, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo((i - 1.5) * 18 + 4, -246);
      ctx.lineTo((i - 1.5) * 18 + 4, -261);
      ctx.stroke();
    }
  }
  ctx.restore();
}
