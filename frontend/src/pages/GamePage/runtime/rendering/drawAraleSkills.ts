import type { Move } from "../../../../game/objects/Move";

const colors = ["#ffe39a", "#f3b5ff", "#b7ddff", "#d3baff", "#c3f3da"];

function star(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5,
      r = i % 2 ? radius * 0.45 : radius;
    if (i === 0) ctx.moveTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
    else ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** Magical-girl fandom, moving forward and singing are adaptations of her anime scenes. */
export function drawAraleSkill(
  ctx: CanvasRenderingContext2D,
  move: Move,
  age: number,
  reduced: boolean,
) {
  ctx.save();
  const active = age >= move.start && age <= move.end;
  ctx.strokeStyle = "#ffe3a0";
  ctx.fillStyle = "#fff4b3";
  ctx.lineWidth = 2;
  ctx.shadowColor = "#ffc4dc";
  ctx.shadowBlur = reduced ? 0 : 8;
  ctx.globalAlpha = active ? 0.85 : 0.4;
  if (move.arale === "star") {
    const p = Math.min(1, age / move.start);
    ctx.beginPath();
    ctx.arc(65, -150, 12 + p * 22, -Math.PI, 0.4);
    ctx.stroke();
    for (let i = 0; i < 3; i++)
      star(ctx, 38 + i * 18, -165 - i * 16, 5 + i * 2);
  } else if (move.arale === "resolve") {
    star(ctx, 65, -135, 20);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(55, -115, 30 + i * 9, 55 + i * 18, 0, -1.4, 1.4);
      ctx.stroke();
    }
  } else if (move.arale === "action") {
    if (age < move.start) {
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-110 - i * 8, -70 - i * 28);
        ctx.lineTo(-20, -80 - i * 28);
        ctx.stroke();
      }
      for (let i = 0; i < 3; i++) star(ctx, -25 - i * 35, -10, 7 - i);
    } else if (active) {
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = colors[i];
        ctx.beginPath();
        ctx.ellipse(60, -125, 90 + i * 18, 40 + i * 10, -0.35, -1.3, 1.3);
        ctx.stroke();
      }
      star(ctx, 130, -150, 22);
    }
  } else if (move.arale === "dream") {
    for (let i = 0; i < 5; i++) {
      const angle =
        (i * Math.PI * 2) / 5 - Math.PI / 2 + (reduced ? 0 : age / 1600);
      ctx.fillStyle = colors[i];
      ctx.strokeStyle = colors[i];
      star(ctx, Math.cos(angle) * 75, -125 + Math.sin(angle) * 110, 9);
    }
    for (const pulse of move.pulses!) {
      const t = (age - pulse.at) / 240;
      if (t < 0 || t > 1) continue;
      ctx.globalAlpha = (1 - t) * 0.8;
      ctx.beginPath();
      ctx.ellipse(70, -115, 25 + t * 70, 40 + t * 90, 0, -1.4, 1.4);
      ctx.stroke();
    }
  } else {
    ctx.font = "30px serif";
    ctx.fillText("♪", 60, -140);
    ctx.beginPath();
    ctx.arc(65, -130, 25, -1.2, 1.2);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawAraleProjectile(
  ctx: CanvasRenderingContext2D,
  kind: Move["arale"],
  age: number,
  reduced: boolean,
) {
  ctx.save();
  if (kind === "star") {
    for (let i = 2; i >= 0; i--) {
      ctx.globalAlpha = 0.25 + (2 - i) * 0.2;
      ctx.fillStyle = colors[i];
      ctx.strokeStyle = colors[0];
      star(ctx, -i * 15, i * 6, 17 - i * 3);
    }
    ctx.globalAlpha = 1;
    ctx.rotate(reduced ? 0 : age / 240);
    ctx.fillStyle = "#ffe8a3";
    ctx.strokeStyle = "#fff7dc";
    star(ctx, 0, 0, 28);
  } else {
    const big = kind === "dream",
      height = big ? 96 : 45;
    for (let i = 0; i < (big ? 5 : 3); i++) {
      ctx.strokeStyle = colors[i];
      ctx.lineWidth = big ? 3 : 2;
      ctx.beginPath();
      ctx.ellipse(-i * 9, 0, 30 + i * 3, height - i * 7, 0, -1.35, 1.35);
      ctx.stroke();
    }
    ctx.fillStyle = "#ffdbec";
    ctx.strokeStyle = "#fff0cb";
    star(ctx, 3, 0, big ? 23 : 16);
    if (big) {
      ctx.font = "20px serif";
      for (const y of [-55, 55]) ctx.fillText("♪", -12, y);
    }
  }
  ctx.restore();
}

export function drawAraleShield(ctx: CanvasRenderingContext2D, hp: number) {
  ctx.save();
  ctx.strokeStyle = "#ffe6a7";
  ctx.fillStyle = "#ffcae52c";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 32, 106, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, 0, 24, 94, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#ffe8ad";
  star(ctx, 0, 0, 24);
  for (const y of [-63, 63]) star(ctx, 0, y, 10);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#182539";
  ctx.fillRect(-27, -130, 54, 5);
  ctx.fillStyle = "#ffe6a7";
  ctx.fillRect(-27, -130, (54 * hp) / 24, 5);
  ctx.font = 'bold 10px "Segoe UI",sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("加油 " + hp, 0, -138);
  ctx.restore();
}
