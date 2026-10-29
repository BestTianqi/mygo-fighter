import type { Fighter } from "../../../../game/objects/Fighter";
import type { Move } from "../../../../game/objects/Move";

/** Existing full-body poses carry the strike; arcs show its beat and reach. */
export function drawRikiSkill(
  ctx: CanvasRenderingContext2D,
  f: Fighter,
  move: Move,
  reduced: boolean,
) {
  ctx.save();
  ctx.strokeStyle = move.boosted ? "#ffe0a1" : "#dcc7ff";
  ctx.fillStyle = "#efe2ff";
  ctx.shadowColor = "#b5a1d7";
  ctx.shadowBlur = reduced ? 0 : 8;
  ctx.lineWidth = move.boosted ? 3.5 : 2.5;
  const active = f.attackMs >= move.start && f.attackMs <= move.end;
  ctx.globalAlpha = active ? 0.8 : 0.35;
  if (move.riki === "calibrate") {
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(-24 + i * 16, -245, 4, 0, Math.PI * 2);
      if (i < f.beats) ctx.fill();
      else ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(10, -8, 58, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (move.pulses) {
    for (const [i, pulse] of move.pulses.entries()) {
      const progress = (f.attackMs - pulse.at) / 160;
      if (progress < 0 || progress > 1) continue;
      const superBeat = move.riki === "super";
      ctx.globalAlpha = (1 - progress) * 0.8;
      ctx.beginPath();
      ctx.ellipse(
        25,
        -115 + (superBeat ? 0 : (i % 2 ? -1 : 1) * 18),
        (pulse.reach ?? move.reach!) * (0.55 + progress * 0.45),
        superBeat ? 110 + progress * 35 : 40 + progress * 25,
        superBeat ? 0 : (i % 2 ? -1 : 1) * 0.22,
        -1.3,
        1.3,
      );
      ctx.stroke();
    }
    if (move.riki === "eight" || move.riki === "super") {
      ctx.globalAlpha = 0.8;
      const total = move.pulses.length;
      for (const [i, pulse] of move.pulses.entries()) {
        ctx.beginPath();
        ctx.arc((i - (total - 1) / 2) * 13, -252, 3, 0, Math.PI * 2);
        if (f.attackMs >= pulse.at) ctx.fill();
        else ctx.stroke();
      }
    }
  } else if (active) {
    ctx.beginPath();
    if (move.riki === "overhead")
      ctx.ellipse(70, -130, 75, 95, -0.3, -2.2, 0.8);
    else if (move.riki === "rise")
      ctx.ellipse(55, -125, 55, 110, 0.2, -1.9, 1.1);
    else ctx.ellipse(55, -105, 65, 55, 0, -1.2, 1.2);
    ctx.stroke();
  }
  ctx.restore();
}
