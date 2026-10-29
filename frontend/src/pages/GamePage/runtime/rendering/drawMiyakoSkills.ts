import type { Area } from "../../../../game/objects/Area";
import type { Move } from "../../../../game/objects/Move";

/** Large bamboo wrapper, cream paper band and exposed red-bean end from episode12. */
function yokan(ctx: CanvasRenderingContext2D, angle: number, opacity: number) {
  ctx.save();
  ctx.translate(60, -112);
  ctx.rotate(angle);
  ctx.globalAlpha *= opacity;
  ctx.shadowBlur = 0;
  const bamboo = ctx.createLinearGradient(-30, 0, 30, 0);
  bamboo.addColorStop(0, "#8b613b");
  bamboo.addColorStop(0.45, "#d5ae72");
  bamboo.addColorStop(1, "#9d774b");
  ctx.fillStyle = bamboo;
  ctx.strokeStyle = "#483142";
  ctx.lineWidth = 2;
  ctx.fillRect(-29, -235, 58, 280);
  ctx.strokeRect(-29, -235, 58, 280);
  for (let i = 0; i < 7; i++) {
    const x = -25 + i * 8;
    ctx.strokeStyle = i % 2 ? "#e2c58c" : "#805d3f";
    ctx.beginPath();
    ctx.moveTo(x, -225 + (i % 3) * 7);
    ctx.lineTo(x + 2, 35 - (i % 2) * 10);
    ctx.stroke();
  }
  ctx.fillStyle = "#eee0c5";
  ctx.strokeStyle = "#705546";
  ctx.fillRect(-24, -200, 48, 200);
  ctx.strokeRect(-24, -200, 48, 200);
  ctx.fillStyle = "#2e2027";
  ctx.textAlign = "center";
  ctx.font = 'bold 28px "Yu Mincho", "Microsoft YaHei", serif';
  for (const [i, letter] of [..."巨羊羹"].entries())
    ctx.fillText(letter, 0, -151 + i * 41);
  ctx.strokeStyle = "#3b2930";
  for (const y of [-186, -13]) {
    ctx.beginPath();
    ctx.moveTo(-30, y);
    ctx.lineTo(30, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#4c242e";
  ctx.fillRect(-25, -244, 50, 13);
  ctx.fillStyle = "#b47d7e";
  ctx.fillRect(-19, -242, 34, 3);
  ctx.restore();
}

function yokanSweep(
  ctx: CanvasRenderingContext2D,
  move: Move,
  age: number,
  reduced: boolean,
) {
  const windup = Math.min(1, age / move.start);
  const strike = Math.max(
    0,
    Math.min(1, (age - move.start) / (move.end - move.start)),
  );
  const recovery = Math.max(
    0,
    Math.min(1, (age - move.end) / (move.duration - move.end)),
  );
  const angle =
    age < move.start
      ? -0.65 + windup * 0.55
      : age <= move.end
        ? 0.9 + strike * 0.8
        : 1.7 - recovery * 1.25;
  if (age >= move.start && age <= move.end + 80) {
    ctx.strokeStyle = "#f3dab0";
    ctx.lineWidth = 7;
    ctx.globalAlpha = reduced ? 0.45 : 0.85;
    ctx.beginPath();
    ctx.ellipse(58, -108, move.reach! - 58, 100, 0.25, -1.1, 1.15);
    ctx.stroke();
    if (!reduced) {
      yokan(ctx, angle - 0.22, 0.16);
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i % 2 ? "#dbc194" : "#824853";
        ctx.fillRect(170 + i * 24, -175 + (i % 3) * 37, 5, 7);
      }
    }
  }
  ctx.globalAlpha = 1 - recovery * 0.35;
  yokan(ctx, angle, 1);
}

function page(ctx: CanvasRenderingContext2D, x: number, y: number, angle = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = "#fff7eb";
  ctx.strokeStyle = "#735395";
  ctx.lineWidth = 2;
  ctx.fillRect(-18, -25, 36, 50);
  ctx.strokeRect(-18, -25, 36, 50);
  ctx.strokeRect(-12, -18, 24, 15);
  ctx.strokeRect(-12, 3, 10, 15);
  ctx.strokeRect(3, 3, 9, 15);
  ctx.restore();
}

/** Held manuscript and pen gestures sit over the retained complete sprite. */
export function drawMiyakoSkill(
  ctx: CanvasRenderingContext2D,
  move: Move,
  age: number,
  reduced: boolean,
) {
  ctx.save();
  ctx.strokeStyle = "#dcc6ff";
  ctx.lineWidth = 2;
  ctx.globalAlpha = age > move.end ? 0.3 : 0.85;
  ctx.shadowColor = "#b894db";
  ctx.shadowBlur = reduced ? 0 : 7;
  if (move.miyako === "yokan") {
    yokanSweep(ctx, move, age, reduced);
  } else if (move.miyako === "draft") {
    const second = age >= move.shots![1];
    page(ctx, second ? 96 : 60, -135, second ? 0.25 : -0.2);
    ctx.strokeStyle = "#e5cfff";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(40 + i * 8, -170);
      ctx.quadraticCurveTo(75, -210 - i * 8, 125 + i * 12, -155);
      ctx.stroke();
    }
  } else if (move.miyako === "stamp") {
    const p = Math.min(1, age / move.start);
    ctx.fillStyle = "#745082";
    ctx.fillRect(64, -110 + p * 60, 12, 24);
    ctx.fillStyle = "#f0d8ff";
    ctx.fillRect(53, -88 + p * 60, 34, 12);
    ctx.strokeRect(53, -88 + p * 60, 34, 12);
  } else if (move.miyako === "marathon") {
    page(ctx, 70, -145, -0.2);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-110 - i * 15, -55 - i * 32);
      ctx.lineTo(-30, -65 - i * 32);
      ctx.stroke();
    }
    // Footprints convey running without duplicating any part of the character.
    for (let i = 0; i < 4; i++) {
      ctx.globalAlpha = 0.5 * (1 - i / 4);
      ctx.beginPath();
      ctx.ellipse(-35 - i * 24, -2 - (i % 2) * 7, 9, 3, -0.3, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else {
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(40, -125);
    ctx.lineTo(85, -148);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(85, -148);
    ctx.lineTo(102, -157);
    ctx.lineTo(94, -141);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(112, -145, 22, 35, -0.2, -1.3, 1.3);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawMiyakoArea(ctx: CanvasRenderingContext2D, area: Area) {
  ctx.save();
  ctx.translate(area.x, 438 - area.y);
  const p = area.fired ? 1 : 1 - area.warning / 650;
  ctx.strokeStyle = area.fired ? "#ffd2e8" : "#d9baff";
  ctx.fillStyle = "#c9acf325";
  ctx.fillRect(-area.radius, -17, area.radius * 2, 34);
  ctx.setLineDash(area.fired ? [] : [9, 6]);
  ctx.strokeRect(-area.radius, -17, area.radius * 2, 34);
  ctx.setLineDash([]);
  const y = area.fired ? -65 : -200 + p * 90;
  ctx.fillStyle = area.fired ? "#bd74a333" : "#463254aa";
  ctx.fillRect(-48, y - 24, 96, 60);
  ctx.strokeRect(-48, y - 24, 96, 60);
  ctx.textAlign = "center";
  ctx.font = 'bold 23px "Microsoft YaHei", sans-serif';
  ctx.fillStyle = "#f5dbff";
  ctx.fillText("赎罪", 0, y + 14);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-area.radius * p, -8);
  ctx.lineTo(area.radius * p, -8);
  ctx.stroke();
  if (area.fired) {
    ctx.beginPath();
    ctx.ellipse(0, -8, area.radius, 26, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawMiyakoProjectile(
  ctx: CanvasRenderingContext2D,
  ink: boolean,
  age: number,
  reduced: boolean,
) {
  ctx.save();
  if (!ink) page(ctx, 0, 0, reduced ? -0.2 : age * 0.006);
  else {
    ctx.strokeStyle = "#ead7ff";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-45, 18);
    ctx.quadraticCurveTo(-5, -35, 28, -8);
    ctx.stroke();
    ctx.fillStyle = "#b894db";
    ctx.beginPath();
    ctx.moveTo(5, -22);
    ctx.lineTo(40, -7);
    ctx.lineTo(14, 21);
    ctx.lineTo(-3, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(40, -7);
    ctx.stroke();
  }
  ctx.restore();
}
