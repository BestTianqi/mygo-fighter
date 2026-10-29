import type { Move } from "../../../../game/objects/Move";

function steak(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = "#ffd6a0";
  ctx.fillStyle = "#974d3e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 29, 18, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#412c35";
  ctx.lineWidth = 3;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 12 - 5, -10);
    ctx.lineTo(i * 12 + 5, 8);
    ctx.stroke();
  }
  ctx.fillStyle = "#fff1bd";
  ctx.fillRect(-7, -7, 10, 7);
  ctx.restore();
}

function slash(ctx: CanvasRenderingContext2D, reach: number, height: number) {
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(35, -height + i * 13, reach, 45, -0.25, -1.15, 1.15);
    ctx.stroke();
  }
}

/** Anime food motifs accompany the original whole-body guitar animation. */
export function drawRitsuSkill(
  ctx: CanvasRenderingContext2D,
  move: Move,
  age: number,
  reduced: boolean,
) {
  ctx.save();
  ctx.strokeStyle = "#b8deff";
  ctx.lineWidth = 2;
  ctx.globalAlpha = age > move.end ? 0.3 : 0.8;
  ctx.shadowColor = "#82c8ff";
  ctx.shadowBlur = reduced ? 0 : 8;
  if (move.ritsu === "meat") {
    const second = age >= move.pulses![1].at;
    steak(ctx, second ? 115 : 70, second ? -145 : -115, 0.9);
    if (age >= move.start && age <= move.end) {
      ctx.strokeStyle = second ? "#ffdaa1" : "#c5e6ff";
      ctx.beginPath();
      ctx.ellipse(
        45,
        -130,
        second ? 145 : 110,
        52,
        second ? -0.4 : 0.4,
        -1.25,
        1.25,
      );
      ctx.stroke();
    }
  } else if (move.ritsu === "polite") {
    // The open front and quiet pulse make the short counter window legible.
    const active = age >= move.start && age <= move.end;
    ctx.globalAlpha = active ? 0.9 : 0.3;
    ctx.beginPath();
    ctx.ellipse(55, -125, 37, 90, 0, -1.45, 1.45);
    ctx.stroke();
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(75, -125 + i * 20);
      ctx.lineTo(93, -125 + i * 20);
      ctx.stroke();
    }
  } else if (move.ritsu === "steak") {
    const p = Math.min(1, age / move.start);
    steak(ctx, 65 + p * 35, -180 + p * 60, 1.25);
    if (age >= move.start && age <= move.end) {
      ctx.strokeStyle = "#ffca88";
      slash(ctx, 130, 140);
    }
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      const x = 85 + i * 15;
      ctx.moveTo(x, -170);
      ctx.quadraticCurveTo(x - 15, -185, x, -205);
      ctx.stroke();
    }
  } else if (move.ritsu === "hungry") {
    for (const [i, pulse] of move.pulses!.entries()) {
      const time = age - pulse.at;
      if (time < 0 || time > 160) continue;
      ctx.globalAlpha = (1 - time / 160) * (reduced ? 0.45 : 0.9);
      ctx.strokeStyle = i % 2 ? "#ffcd8f" : "#b1dfff";
      ctx.lineWidth = i === 4 ? 4 : 2;
      slash(ctx, (pulse.reach ?? move.reach!) * 0.85, i % 2 ? 170 : 115);
    }
    ctx.globalAlpha = 0.75;
    // A growling stomach and a hot meal, without covering her face or guitar.
    steak(ctx, 25, -250, 0.75);
    ctx.beginPath();
    ctx.moveTo(-40, -115);
    ctx.lineTo(-65, -120);
    ctx.lineTo(-49, -132);
    ctx.lineTo(-75, -138);
    ctx.stroke();
  } else {
    steak(ctx, 72, -135, 0.75);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(72, -135, 30 + i * 12, -0.8, 0.8);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawRitsuProjectile(
  ctx: CanvasRenderingContext2D,
  age: number,
  reduced: boolean,
) {
  ctx.save();
  ctx.strokeStyle = "#a6d9ff";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(-12 - i * 12, 0, 20 + i * 9, 28, 0, -1.25, 1.25);
    ctx.stroke();
  }
  ctx.rotate(reduced ? -0.2 : Math.sin(age / 80) * 0.15);
  steak(ctx, 0, 0, 0.85);
  ctx.restore();
}
