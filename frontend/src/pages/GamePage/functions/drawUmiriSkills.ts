import type { Move } from "../../../game/objects/Move";

function clock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * radius * 0.8, Math.sin(a) * radius * 0.8);
    ctx.lineTo(Math.cos(a) * radius * 0.94, Math.sin(a) * radius * 0.94);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, -radius * 0.65);
  ctx.lineTo(0, 0);
  ctx.lineTo(radius * 0.5, 0);
  ctx.stroke();
  ctx.restore();
}

/** Foot-local bass strings, pull lines and timetable cues; artwork stays intact. */
export function drawUmiriSkill(
  ctx: CanvasRenderingContext2D,
  move: Move,
  age: number,
  reduced: boolean,
) {
  const active = age >= move.start && age <= move.end;
  ctx.save();
  ctx.strokeStyle = "#c6e0f0";
  ctx.fillStyle = "#dcebf5";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  if (move.umiri === "bass") {
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(-25, -126 + i * 5);
      ctx.quadraticCurveTo(
        30,
        -145 + i * 7 + (reduced ? 0 : Math.sin(age * 0.04 + i) * 5),
        92,
        -150 + i * 5,
      );
      ctx.stroke();
    }
    for (const at of move.shots!) {
      const t = age - at;
      if (t < 0 || t > 180) continue;
      ctx.globalAlpha = (1 - t / 180) * 0.8;
      ctx.beginPath();
      ctx.ellipse(
        48 + t * 0.16,
        -6,
        35 + t * 0.3,
        10 + t * 0.04,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
  } else if (move.umiri === "hook") {
    const second = age >= move.pulses![1].at;
    if (!second) {
      const p = Math.min(1, age / move.start);
      const retract = Math.max(0, Math.min(1, (age - move.start) / 240));
      const length = 40 + p * (move.reach! - 40) - retract * 170;
      ctx.globalAlpha = active ? 0.85 : 0.35;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(22, -135 + i * 3);
        ctx.quadraticCurveTo(length * 0.55, -110 + i * 3, length, -115 + i * 3);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.ellipse(length, -108, 16, 35, 0, -1.4, 1.4);
      ctx.stroke();
    } else {
      const fade = Math.max(0, 1 - (age - move.pulses![1].at) / 220);
      ctx.globalAlpha = fade * 0.85;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(58, -115, 55 + i * 13, 95 + i * 10, -0.45, -1.4, 1.2);
        ctx.stroke();
      }
    }
  } else if (move.umiri === "toss") {
    const p = Math.min(1, age / move.start);
    ctx.globalAlpha = active ? 0.8 : 0.35;
    if (age <= move.end) {
      ctx.beginPath();
      ctx.ellipse(60, -105, 25 + p * 50, 70, -p * 0.8, -1.6, 1.7);
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-55 - i * 15, -12 - i * 9);
        ctx.lineTo(12, -12 - i * 9);
        ctx.stroke();
      }
    } else {
      ctx.globalAlpha *= Math.max(0, 1 - (age - move.end) / 250);
      ctx.beginPath();
      ctx.ellipse(80, -8, 65, 13, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // A small zero mark refers to the eating-without-gaining-weight joke.
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("0", -30, -160);
  } else if (move.umiri === "schedule") {
    ctx.globalAlpha = active ? 0.8 : 0.3;
    ctx.fillStyle = "#152736a0";
    ctx.beginPath();
    ctx.roundRect(-22, -223, 92, 116, 7);
    ctx.fill();
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
      ctx.strokeRect(-10, -206 + i * 27, 12, 12);
      ctx.beginPath();
      ctx.moveTo(13, -200 + i * 27);
      ctx.lineTo(55, -200 + i * 27);
      ctx.stroke();
    }
    clock(ctx, 69, -123, 27);
    if (active) {
      ctx.beginPath();
      ctx.ellipse(38, -115, 58, 92, 0, -1.4, 1.4);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawUmiriProjectile(
  ctx: CanvasRenderingContext2D,
  move: Move,
  age: number,
  reduced: boolean,
) {
  ctx.save();
  if (move.umiri === "bass") {
    ctx.strokeStyle = "#c6e0f0";
    ctx.fillStyle = "#789fb942";
    ctx.beginPath();
    ctx.ellipse(0, 0, 34, 28, -0.2, -1.8, 1.8);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      for (let x = -45; x <= 22; x += 4) {
        const y =
          (i - 2) * 8 + Math.sin(x * 0.12 + (reduced ? 0 : age * 0.025)) * 3;
        if (x === -45) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(-8, 29, 47, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.strokeStyle = "#c6e0f0";
    clock(ctx, 0, 0, 24);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-42, -16 + i * 16);
      ctx.lineTo(-27, -16 + i * 16);
      ctx.stroke();
    }
  }
  ctx.restore();
}
