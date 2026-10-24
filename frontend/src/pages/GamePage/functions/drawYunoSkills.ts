import type { Move } from "../../../game/objects/Move";
import type { Area } from "../../../game/objects/Area";

const bandColors = ["#f18fb8", "#6b9de8", "#b894db", "#ee79c8", "#a7d7c3"];

function record(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#201e34dd";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  for (const ratio of [0.35, 0.7, 0.85]) {
    ctx.beginPath();
    ctx.arc(0, 0, r * ratio, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** Foreground gestures leave the retained complete character sprite intact. */
export function drawYunoSkill(
  ctx: CanvasRenderingContext2D,
  move: Move,
  age: number,
  reduced: boolean,
) {
  ctx.save();
  ctx.strokeStyle = "#ffb9e3";
  ctx.lineWidth = 2;
  ctx.globalAlpha = age > move.end ? 0.35 : 0.85;
  ctx.shadowColor = "#ee79c8";
  ctx.shadowBlur = reduced ? 0 : 8;
  if (move.yuno === "release") {
    const p = Math.min(1, age / move.end);
    for (const direction of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(
        0,
        -125,
        50 + 160 * p,
        85,
        0,
        direction < 0 ? 1.8 : -1.3,
        direction < 0 ? 4.5 : 1.3,
      );
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const x = direction * (75 + p * 130);
        ctx.beginPath();
        ctx.moveTo(x - direction * 20, -145 + i * 20);
        ctx.lineTo(x, -155 + i * 20);
        ctx.stroke();
      }
    }
  } else if (move.yuno === "seaside") {
    record(ctx, 65, -130, 26);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(65, -130, 35 + i * 12, -0.8, 0.8);
      ctx.stroke();
    }
  } else if (move.yuno === "world") {
    for (const [i, pulse] of move.pulses!.entries()) {
      const elapsed = age - pulse.at;
      if (elapsed < 0 || elapsed > 280) continue;
      const p = elapsed / 280;
      ctx.globalAlpha = (1 - p) * (reduced ? 0.4 : 0.75);
      for (const [j, color] of bandColors.entries()) {
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.ellipse(
          0,
          -100,
          pulse.reach! * (0.25 + p * 0.75),
          45 + j * 12 + p * 35,
          0,
          j * 1.26 + i,
          (j + 0.8) * 1.26 + i,
        );
        ctx.stroke();
      }
    }
  } else if (move.yuno === "band") {
    for (const [i, color] of bandColors.entries()) {
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(45 + i * 8, -135);
      ctx.lineTo(45 + i * 8, -170 - (i % 3) * 12);
      ctx.stroke();
    }
  } else {
    record(ctx, 70, -132, 25);
    for (let i = 0; i < 5; i++) {
      const height = 10 + (reduced ? 12 : 12 * (1 + Math.sin(age / 55 + i)));
      ctx.fillStyle = bandColors[i];
      ctx.fillRect(45 + i * 10, -90 - height, 5, height);
    }
  }
  ctx.restore();
}

/** The visible ring is the actual area radius, not a screen-wide target lock. */
export function drawYunoArea(ctx: CanvasRenderingContext2D, area: Area) {
  ctx.save();
  ctx.translate(area.x, 438 - area.y);
  const charge = area.fired ? 1 : 1 - area.warning / 500;
  ctx.strokeStyle = "#ffc4e9";
  ctx.fillStyle = "#ee79c822";
  ctx.beginPath();
  ctx.ellipse(0, -8, area.radius, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  for (const [i, color] of bandColors.entries()) {
    ctx.strokeStyle = color;
    const x = (i - 2) * area.radius * 0.36;
    const height = area.fired ? 150 + (i % 2) * 40 : 18 + charge * 45;
    ctx.lineWidth = area.fired ? 7 : 3;
    ctx.beginPath();
    ctx.moveTo(x, -8);
    ctx.lineTo(x, -height);
    ctx.stroke();
  }
  ctx.restore();
}
