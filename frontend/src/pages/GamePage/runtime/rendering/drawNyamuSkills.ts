import type { Move } from "../../../../game/objects/Move";

function drumstick(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  length = 65,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.lineCap = "round";
  ctx.strokeStyle = "#f5d2a2";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-length * 0.25, 0);
  ctx.lineTo(length * 0.65, 0);
  ctx.stroke();
  ctx.fillStyle = "#fff0d3";
  ctx.beginPath();
  ctx.ellipse(length * 0.7, 0, 5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Foot-local overlays accompany the existing full-body Amoris drawings. */
export function drawNyamuSkill(
  ctx: CanvasRenderingContext2D,
  move: Move,
  age: number,
  reduced: boolean,
) {
  const active = age >= move.start && age <= move.end;
  ctx.save();
  ctx.strokeStyle = "#f7b8dc";
  ctx.fillStyle = "#ffe9f4";
  ctx.lineCap = "round";
  ctx.lineWidth = 2;
  if (move.nyamu === "reveal") {
    const exposure = Math.max(0, 1 - Math.abs(age - move.start) / 240);
    ctx.globalAlpha = 0.25 + exposure * (reduced ? 0.3 : 0.65);
    for (const x of [-85, 85])
      for (const y of [-225, -65]) {
        ctx.beginPath();
        ctx.moveTo(x - Math.sign(x) * 22, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y + (y === -225 ? 22 : -22));
        ctx.stroke();
      }
    if (age >= move.start) {
      const p = Math.min(1, (age - move.start) / 260);
      ctx.globalAlpha *= 1 - p;
      ctx.beginPath();
      ctx.ellipse(
        0,
        -115,
        30 + p * move.reach!,
        40 + p * 135,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        ctx.save();
        ctx.translate(
          Math.cos(angle) * p * 135,
          -155 + Math.sin(angle) * p * 90,
        );
        ctx.rotate(angle + (reduced ? 0 : p));
        ctx.beginPath();
        ctx.moveTo(-8, -7);
        ctx.lineTo(10, -4);
        ctx.lineTo(-2, 9);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  } else if (move.nyamu === "sticks") {
    ctx.globalAlpha = active ? 0.8 : 0.5;
    for (let i = 0; i < 2; i++) {
      const thrown = age >= move.shots![i];
      drumstick(
        ctx,
        28 + i * 14,
        -140 - i * 7,
        thrown ? 0.2 : -1.1 + Math.min(1, age / move.shots![i]) * 0.4,
      );
      if (thrown && age - move.shots![i] < 130) {
        ctx.beginPath();
        ctx.moveTo(48, -145 - i * 10);
        ctx.lineTo(100, -135 - i * 10);
        ctx.stroke();
      }
    }
  } else if (move.nyamu === "encore") {
    for (const [i, pulse] of move.pulses!.entries()) {
      const beat = age - pulse.at;
      if (beat < -65 || beat > 150) continue;
      const p = Math.max(0, Math.min(1, (beat + 65) / 110));
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, beat) / 150) * 0.85;
      drumstick(ctx, 35, -145, -1.4 + p * 2.2);
      drumstick(ctx, 48, -135, -2.1 + p * 2.7);
      if (beat >= 0) {
        ctx.lineWidth = i === 3 ? 4 : 2;
        ctx.beginPath();
        ctx.ellipse(60, -100, 45 + i * 10, 60, -0.2, -1.8, 0.9);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(30, -3, 35 + i * 13, 7 + i * 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  } else if (move.nyamu === "smile") {
    ctx.globalAlpha = active ? 0.8 : 0.35;
    ctx.fillStyle = "#321b3b85";
    ctx.beginPath();
    ctx.roundRect(-18, -220, 75, 112, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = active ? "#ffa0b4" : "#ddb0c5";
    ctx.beginPath();
    ctx.arc(42, -206, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(18, -160, 17, 0.2, Math.PI - 0.2);
    ctx.stroke();
    for (const x of [6, 30]) {
      ctx.beginPath();
      ctx.arc(x, -180, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (active) {
      ctx.beginPath();
      ctx.ellipse(21, -162, 62, 82, 0, -1.4, 1.4);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawNyamuProjectile(
  ctx: CanvasRenderingContext2D,
  move: Move,
  age: number,
  reduced: boolean,
) {
  if (move.nyamu === "sticks") {
    if (!reduced) ctx.rotate(age * 0.018);
    ctx.globalAlpha *= 0.3;
    ctx.beginPath();
    ctx.ellipse(0, 0, 32, 12, 0, -1.5, 1.5);
    ctx.stroke();
    ctx.globalAlpha /= 0.3;
    drumstick(ctx, 0, 0, -0.4, 68);
  } else {
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-20, -27, 40, 54, 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 13, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 22, Math.sin(a) * 22);
      ctx.lineTo(Math.cos(a) * 34, Math.sin(a) * 34);
      ctx.stroke();
    }
  }
}
