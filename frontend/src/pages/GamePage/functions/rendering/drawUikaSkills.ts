import type { Area } from "../../../../game/objects/Area";
import type { Move } from "../../../../game/objects/Move";

function star(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2,
      r = i % 2 ? radius * 0.42 : radius;
    const px = x + Math.cos(a) * r,
      py = y + Math.sin(a) * r;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
}

/** Foot-local motifs accompany the original Doloris whole-body artwork. */
export function drawUikaSkill(
  ctx: CanvasRenderingContext2D,
  move: Move,
  age: number,
  reduced: boolean,
) {
  ctx.save();
  ctx.strokeStyle = "#ffe0ad";
  ctx.fillStyle = "#ffedce";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  if (move.uika === "denial") {
    for (const [i, pulse] of move.pulses!.entries()) {
      const time = age - pulse.at;
      if (time < -40 || time > 220) continue;
      const p = Math.max(0, time / 220);
      ctx.globalAlpha = (1 - p) * (reduced ? 0.45 : 0.8);
      ctx.lineWidth = i === 2 ? 3 : 2;
      ctx.beginPath();
      ctx.ellipse(
        0,
        -125,
        40 + p * pulse.reach!,
        40 + p * 65,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      for (const direction of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(direction * (45 + p * 80), -205);
        ctx.lineTo(direction * (25 + p * 80), -180);
        ctx.stroke();
      }
    }
  } else if (move.uika === "pursuit") {
    const p = Math.min(1, age / move.end);
    ctx.globalAlpha =
      age <= move.end ? 0.75 : Math.max(0, 1 - (age - move.end) / 180) * 0.6;
    ctx.beginPath();
    ctx.moveTo(-120, -8);
    ctx.quadraticCurveTo(-30, -65, 100, -120);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      star(ctx, -100 + i * 52 + p * 18, -15 - i * 28, 5 + i);
    }
    if (age >= move.start && age <= move.end + 140) {
      ctx.beginPath();
      ctx.ellipse(60, -115, 75, 100, -0.45, -1.5, 1.1);
      ctx.stroke();
    }
  } else if (move.uika === "cage") {
    ctx.globalAlpha = age <= move.end ? 0.65 : 0.3;
    star(ctx, 62, -165, 25);
    ctx.beginPath();
    ctx.ellipse(62, -165, 43, 43, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(10, -145 + i * 8);
      ctx.lineTo(92, -145 + i * 8);
      ctx.stroke();
    }
  } else if (move.uika === "crescent" && age <= move.end + 160) {
    ctx.globalAlpha = age < move.start ? 0.45 : 0.75;
    ctx.beginPath();
    ctx.ellipse(65, -130, 25, 42, -0.2, -1.5, 1.5);
    ctx.stroke();
    star(ctx, 40, -176, 9);
  }
  ctx.restore();
}

export function drawUikaProjectile(
  ctx: CanvasRenderingContext2D,
  age: number,
  reduced: boolean,
) {
  ctx.save();
  ctx.strokeStyle = "#ffe0ad";
  ctx.fillStyle = "#e2bd9238";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 40, 64, 0, -1.6, 1.6);
  ctx.ellipse(-17, 0, 35, 64, 0, 1.4, -1.4, true);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const y = -32 + i * 32;
    ctx.beginPath();
    ctx.moveTo(-52, y);
    ctx.lineTo(-23, y);
    ctx.stroke();
    star(ctx, -42 + i * 8, y, 5 + (reduced ? 0 : Math.sin(age * 0.012 + i)));
  }
  ctx.restore();
}

/** World-local area stays at its telegraphed target rather than chasing a fighter. */
export function drawUikaArea(
  ctx: CanvasRenderingContext2D,
  area: Area,
  move: Move,
  reduced: boolean,
) {
  const p = Math.max(0, Math.min(1, 1 - area.warning / move.warning!));
  const height = area.fired ? 270 : 70 + p * 200;
  ctx.save();
  ctx.translate(area.x, 438 - area.y);
  ctx.strokeStyle = "#ffe0ad";
  ctx.fillStyle = "#e2bd9225";
  ctx.globalAlpha = area.fired
    ? Math.max(0, area.life / 100) * 0.9
    : reduced
      ? 0.6
      : 0.45 + p * 0.3;
  ctx.lineWidth = area.fired ? 3 : 2;
  ctx.beginPath();
  ctx.ellipse(0, -2, area.radius, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  for (let i = -2; i <= 2; i++) {
    const x = i * area.radius * 0.4;
    ctx.beginPath();
    ctx.moveTo(x, -5);
    ctx.quadraticCurveTo(x, -height * 0.75, 0, -height);
    ctx.stroke();
    star(ctx, x, -10, 7);
  }
  star(ctx, 0, -height, area.fired ? 23 : 15);
  if (area.fired) {
    ctx.beginPath();
    ctx.moveTo(0, -height);
    ctx.lineTo(0, -25);
    ctx.stroke();
    star(ctx, 0, -105, 40);
  }
  ctx.restore();
}
