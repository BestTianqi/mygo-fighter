import type { Move } from "../../../game/objects/Move";

function heart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.65);
  ctx.bezierCurveTo(
    x - size * 1.5,
    y - size * 0.2,
    x - size * 0.7,
    y - size,
    x,
    y - size * 0.4,
  );
  ctx.bezierCurveTo(
    x + size * 0.7,
    y - size,
    x + size * 1.5,
    y - size * 0.2,
    x,
    y + size * 0.65,
  );
  ctx.stroke();
}

function jaws(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  gap: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.ellipse(0, -gap, radius, radius * 0.55, 0, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, gap, radius, radius * 0.55, 0, 0, Math.PI);
  ctx.stroke();
  for (const direction of [-1, 1])
    for (let i = -1; i <= 1; i++) {
      const px = i * radius * 0.5;
      ctx.beginPath();
      ctx.moveTo(px - radius * 0.12, direction * gap);
      ctx.lineTo(px, direction * (gap - radius * 0.22));
      ctx.lineTo(px + radius * 0.12, direction * gap);
      ctx.stroke();
    }
  ctx.restore();
}

function tuna(ctx: CanvasRenderingContext2D, angle: number) {
  ctx.save();
  ctx.translate(65, -145);
  ctx.rotate(angle);
  ctx.fillStyle = "#759cae";
  ctx.strokeStyle = "#d9edf4";
  ctx.beginPath();
  ctx.ellipse(0, 0, 56, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#d4e2df";
  ctx.beginPath();
  ctx.ellipse(2, 8, 47, 10, 0, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = "#5d8194";
  for (const direction of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-45, 0);
    ctx.lineTo(-75, direction * 23);
    ctx.lineTo(-65, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-10, -18);
  ctx.lineTo(5, -33);
  ctx.lineTo(18, -17);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#172838";
  ctx.beginPath();
  ctx.arc(38, -5, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Anime props and gestures surround the retained full-body virtual outfit. */
export function drawNonokaSkill(
  ctx: CanvasRenderingContext2D,
  move: Move,
  age: number,
  reduced: boolean,
) {
  const active = age >= move.start && age <= move.end;
  ctx.save();
  ctx.strokeStyle = "#dcfff0";
  ctx.fillStyle = "#d3f6e5";
  ctx.lineWidth = 2;
  if (move.nonoka === "hug") {
    const p = Math.min(1, age / move.start);
    ctx.globalAlpha = active ? 0.9 : 0.4;
    heart(ctx, 55 + p * 25, -150, 18 + p * 18);
    for (const direction of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(
        65,
        -120,
        35 + p * 30,
        85,
        direction * 0.25,
        direction < 0 ? 1.5 : -1.5,
        direction < 0 ? 4.7 : 1.5,
      );
      ctx.stroke();
    }
  } else if (move.nonoka === "search") {
    if (age < move.start) {
      ctx.fillStyle = "#334b54a0";
      for (const x of [30, 61]) {
        ctx.beginPath();
        ctx.ellipse(x, -185, 18, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(46, -190);
      ctx.lineTo(47, -190);
      ctx.stroke();
    } else {
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-90, -30 - i * 30);
        ctx.lineTo(30, -45 - i * 30);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(100, -115, 32, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(57, -115);
      ctx.lineTo(75, -115);
      ctx.moveTo(125, -115);
      ctx.lineTo(143, -115);
      ctx.stroke();
    }
  } else if (move.nonoka === "tuna") {
    const p = Math.min(1, age / move.start);
    ctx.globalAlpha =
      age <= move.end ? 0.95 : Math.max(0, 1 - (age - move.end) / 220);
    tuna(ctx, age < move.start ? -1.5 + p * 0.3 : 0.25);
    if (age >= move.start) {
      ctx.strokeStyle = "#eafff6";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(80, -115, 90, 65, -0.2, -1.7, 1.3);
      ctx.stroke();
    }
  } else if (move.nonoka === "comfort") {
    ctx.globalAlpha = active ? 0.9 : 0.45;
    heart(ctx, 0, -145, 36);
    ctx.beginPath();
    ctx.ellipse(0, -120, 64, 110, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (move.nonoka === "bite" && age <= move.end + 100) {
    ctx.globalAlpha = active ? 0.75 : 0.35;
    jaws(ctx, 60, -130, 32, age < move.start ? 18 : 8);
  } else if (move.nonoka === "eater") {
    for (const pulse of move.pulses!) {
      const time = age - pulse.at;
      if (time < -70 || time > 190) continue;
      const p = Math.max(0, time / 190);
      ctx.globalAlpha = (1 - p) * (reduced ? 0.55 : 0.9);
      jaws(
        ctx,
        Math.min(190, pulse.reach! * 0.6),
        -130,
        50 + p * 40,
        4 + (1 - p) * 24,
      );
      heart(ctx, 35, -235, 12);
    }
  }
  ctx.restore();
}

export function drawNonokaProjectile(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.strokeStyle = "#eafff6";
  ctx.lineWidth = 2.5;
  jaws(ctx, 0, 0, 26, 8);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-45 - i * 7, -12 + i * 12);
    ctx.lineTo(-25, -12 + i * 12);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawNonokaShield(ctx: CanvasRenderingContext2D, hp: number) {
  ctx.strokeStyle = "#c3ffe6";
  ctx.fillStyle = "#9cdac72a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 28, 106, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  heart(ctx, 0, 0, 19);
  ctx.fillStyle = "#c3ffe6";
  ctx.fillRect(-27, -130, (54 * hp) / 24, 5);
  ctx.font = 'bold 11px "Segoe UI",sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("元气 " + hp, 0, -140);
}
