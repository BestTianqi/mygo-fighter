import {
  ENTRANCE_TIMING,
  entranceFor,
} from "../../../../game/animation/entrance";
import { ROSTER } from "../../../../game/engine";
import type { BattleSceneContext } from "./battleScene/objects";

const TAU = Math.PI * 2;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const envelope = (age: number) =>
  clamp(age / 180) * clamp((ENTRANCE_TIMING.performance - age) / 340);

function line(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  endX: number,
  endY: number,
) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(endX, endY);
  ctx.stroke();
}
function sparkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x, y - radius);
  ctx.lineTo(x + radius * 0.3, y - radius * 0.3);
  ctx.lineTo(x + radius, y);
  ctx.lineTo(x + radius * 0.3, y + radius * 0.3);
  ctx.lineTo(x, y + radius);
  ctx.lineTo(x - radius * 0.3, y + radius * 0.3);
  ctx.lineTo(x - radius, y);
  ctx.lineTo(x - radius * 0.3, y - radius * 0.3);
  ctx.closePath();
  ctx.stroke();
}
function note(ctx: CanvasRenderingContext2D, x: number, y: number, size = 1) {
  ctx.beginPath();
  ctx.ellipse(x, y, 5 * size, 3 * size, -0.3, 0, TAU);
  ctx.fill();
  line(ctx, x + 4 * size, y, x + 4 * size, y - 20 * size);
  ctx.beginPath();
  ctx.moveTo(x + 4 * size, y - 20 * size);
  ctx.quadraticCurveTo(
    x + 16 * size,
    y - 16 * size,
    x + 10 * size,
    y - 8 * size,
  );
  ctx.stroke();
}
function heart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x, y + radius);
  ctx.bezierCurveTo(
    x - radius * 2,
    y - radius * 0.2,
    x - radius,
    y - radius * 1.8,
    x,
    y - radius * 0.6,
  );
  ctx.bezierCurveTo(
    x + radius,
    y - radius * 1.8,
    x + radius * 2,
    y - radius * 0.2,
    x,
    y + radius,
  );
  ctx.stroke();
}

/** Thin world-space accents follow the same paused/synchronized entrance clock as the body. */
export function drawEntranceEffects(scene: BattleSceneContext) {
  const { ctx, match, reducedMotion } = scene;
  for (const side of [0, 1]) {
    const entry = entranceFor(match, side, reducedMotion);
    if (!entry) continue;
    const f = match.fighters[side];
    const age = entry.age,
      p = entry.progress;
    ctx.save();
    ctx.translate(f.x + entry.offsetX, 438 - f.y - entry.offsetY);
    ctx.strokeStyle = ctx.fillStyle = ROSTER[entry.character].color;
    ctx.lineWidth = 1.7;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = reducedMotion ? 0.32 : envelope(age) * 0.62;
    if (reducedMotion) {
      // A static footing mark; no animated particles, rotation, or secondary motion.
      line(ctx, -47, -2, -35, -2);
      line(ctx, 35, -2, 47, -2);
      ctx.restore();
      continue;
    }
    ctx.scale(f.facing, 1);
    const drift = Math.sin(p * Math.PI) * 16;
    switch (entry.style) {
      case "sparkle":
        for (let i = 0; i < 5; i++) {
          const x = (i % 2 ? -1 : 1) * (58 + i * 8);
          sparkle(
            ctx,
            x,
            -110 - i * 27 - drift,
            4 + Math.sin(age / 290 + i) * 1.5,
          );
        }
        break;
      case "petals":
        for (let i = 0; i < 5; i++) {
          ctx.save();
          ctx.translate(
            (i % 2 ? -1 : 1) * (64 + i * 7) + Math.sin(p * 4 + i) * 8,
            -240 + i * 24 + p * 42,
          );
          ctx.rotate(i * 0.8 + p * 1.1);
          ctx.beginPath();
          ctx.ellipse(0, 0, 3.5, 8, 0, 0, TAU);
          ctx.stroke();
          ctx.restore();
        }
        break;
      case "breath":
        for (let i = 0; i < 3; i++) {
          const x = 45 + i * 12,
            y = -191 - drift * 0.3 + i * 7;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + 9, y - 5, x + 11, y - 13);
          ctx.stroke();
        }
        break;
      case "cat":
        note(ctx, 60, -160 - drift, 0.8);
        note(ctx, -72, -218 - drift * 0.6, 0.65);
        sparkle(ctx, 89, -223, 5);
        break;
      case "sticks": {
        const spread = Math.sin(p * Math.PI) * 11;
        line(ctx, 56, -169, 86 + spread, -204);
        line(ctx, 89, -170, 62 - spread, -208);
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(-28 + i * 18, -12, 2.2, 0, TAU);
          ctx.fill();
        }
        break;
      }
      case "bass":
        for (let i = 0; i < 2; i++) {
          ctx.beginPath();
          ctx.ellipse(
            0,
            -23 - i * 9,
            70 + i * 15 + drift * 0.5,
            10 + i * 4,
            0,
            0.15,
            Math.PI - 0.15,
          );
          ctx.stroke();
        }
        note(ctx, 71, -151 - drift * 0.4, 0.65);
        break;
      case "keys":
        for (let i = 0; i < 5; i++) {
          const x = 54 + i * 10;
          line(ctx, x, -154, x, -169 - (i % 2 ? 5 : 0));
        }
        line(ctx, 49, -149, 101, -149);
        sparkle(ctx, 83, -196 - drift * 0.4, 5);
        break;
      case "guitar":
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(29, -147, 38 + i * 11 + drift * 0.25, -0.7, 0.6);
          ctx.stroke();
        }
        note(ctx, -66, -205 - drift, 0.7);
        break;
      case "strings":
        for (let i = 0; i < 4; i++) {
          line(ctx, 49, -140 - i * 8, 102, -152 - i * 8);
          line(ctx, 95, -155 - i * 8, 98, -148 - i * 8);
        }
        break;
      case "camera":
        for (const x of [-77, 77])
          for (const y of [-244, -78]) {
            line(ctx, x, y, x - Math.sign(x) * 15, y);
            line(ctx, x, y, x, y + (y < -100 ? 15 : -15));
          }
        ctx.beginPath();
        ctx.arc(65, -232, 2.5, 0, TAU);
        ctx.fill();
        break;
      case "stars":
        for (let i = 0; i < 5; i++) {
          const x = (i % 2 ? -1 : 1) * (60 + i * 6),
            y = -90 - i * 37 - drift;
          ctx.beginPath();
          for (let point = 0; point < 10; point++) {
            const angle = -Math.PI / 2 + (point * Math.PI) / 5,
              radius = point % 2 ? 3 : 7;
            const sx = x + Math.cos(angle) * radius,
              sy = y + Math.sin(angle) * radius;
            if (point === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }
          ctx.closePath();
          ctx.stroke();
        }
        break;
      case "bow":
        ctx.beginPath();
        ctx.ellipse(0, -231, 62, 19, 0, Math.PI * 1.12, Math.PI * 1.88);
        ctx.stroke();
        for (let i = 0; i < 3; i++)
          line(ctx, 60 + i * 9, -177 - i * 9, 65 + i * 10, -183 - i * 9);
        break;
      case "ink":
        ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(51 + i * 13, -126 - i * 18);
          ctx.quadraticCurveTo(
            83 + i * 4,
            -143 - i * 14,
            75 + i * 10 + drift * 0.3,
            -164 - i * 12,
          );
          ctx.stroke();
        }
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(-63 - i * 8, -185 + i * 17, 1.6 + i * 0.5, 0, TAU);
          ctx.fill();
        }
        break;
      case "waves":
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          for (let x = -88; x <= 88; x += 4) {
            const y = -39 - i * 10 + Math.sin(x / 22 + p * Math.PI * 2 + i) * 4;
            if (x === -88) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        break;
      case "hearts":
        for (let i = 0; i < 4; i++)
          heart(
            ctx,
            (i % 2 ? -1 : 1) * (61 + i * 8),
            -133 - i * 35 - drift,
            5 + (i % 2),
          );
        break;
      case "film":
        for (const x of [-80, 80]) {
          line(ctx, x, -207, x, -92);
          for (let i = 0; i < 4; i++)
            ctx.strokeRect(x - 3, -198 + i * 27, 6, 10);
        }
        line(ctx, 57, -234, 91, -242);
        line(ctx, 62, -228, 93, -228);
        break;
      default:
        sparkle(ctx, -67, -205, 5);
        sparkle(ctx, 70, -180, 4);
    }
    ctx.restore();
  }
}

/** Temporary side labels leave the combat HUD and the central ready cue unobstructed. */
export function drawEntranceTitles(scene: BattleSceneContext) {
  const { ctx, match, reducedMotion } = scene;
  for (const side of [0, 1]) {
    const entry = entranceFor(match, side, reducedMotion);
    if (!entry) continue;
    const profile = ROSTER[entry.character],
      x = side === 0 ? 57 : 903;
    ctx.save();
    ctx.globalAlpha = reducedMotion ? 0.78 : envelope(entry.age);
    ctx.textAlign = side === 0 ? "left" : "right";
    ctx.textBaseline = "alphabetic";
    ctx.shadowColor = "#07101f";
    ctx.shadowBlur = 7;
    ctx.fillStyle = profile.color;
    ctx.font = 'bold 21px "Microsoft YaHei",sans-serif';
    ctx.fillText(profile.name, x, 142);
    ctx.fillStyle = "#dae3ef";
    ctx.font = '11px "Microsoft YaHei",sans-serif';
    ctx.fillText(entry.title, x, 163);
    ctx.strokeStyle = profile.color;
    ctx.lineWidth = 2;
    line(
      ctx,
      side === 0 ? x - 10 : x + 10,
      124,
      side === 0 ? x - 10 : x + 10,
      164,
    );
    ctx.restore();
  }
}
