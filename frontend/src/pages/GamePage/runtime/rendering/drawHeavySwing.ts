import type { heavyMotion } from "./animation/heavyAnimation";
import type { Fighter } from "../../../../game/objects/Fighter";
import type { Move } from "../../../../game/objects/Move";

/** A short weapon/limb trail, drawn without making copies of the character. */
export function drawHeavySwing(
  ctx: CanvasRenderingContext2D,
  fighter: Fighter,
  move: Move,
  motion: NonNullable<ReturnType<typeof heavyMotion>>,
  color: string,
) {
  if (motion.opacity <= 0) return;
  const p = motion.swing;
  const reach = Math.min(240, (move.reach ?? 140) * 0.9);
  const low = move.stance === "crouch";
  ctx.save();
  ctx.translate(fighter.x, 438 - fighter.y - (low ? 65 : 115));
  ctx.scale(fighter.facing, 1);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [width, stroke, alpha] of [
    [9, color, 0.18],
    [3, color, 0.8],
    [1.1, "#fff7ef", 0.9],
  ] as const) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.globalAlpha = motion.opacity * alpha;
    ctx.beginPath();
    if (motion.kind === "thrust" || motion.kind === "penguin") {
      const x = 32 + reach * (0.3 + p * 0.7);
      ctx.moveTo(32, -18);
      ctx.quadraticCurveTo(x * 0.55, -28, x, -8);
      ctx.moveTo(32, 20);
      ctx.quadraticCurveTo(x * 0.55, 26, x, 9);
      ctx.ellipse(
        x,
        0,
        motion.kind === "penguin" ? 13 : 7,
        19,
        -0.15,
        -1.1,
        1.1,
      );
    } else if (motion.kind === "down") {
      for (const offset of [-7, 9]) {
        ctx.moveTo(35 + offset, -65);
        ctx.quadraticCurveTo(
          reach + offset,
          -70,
          reach * 0.8 + offset,
          -50 + p * 112,
        );
      }
    } else {
      const angle = -1.8 + p * 2.8;
      ctx.ellipse(
        22,
        low ? 13 : -3,
        reach * 0.83,
        low ? 31 : 70,
        motion.kind === "kick" ? 0.28 : -0.3,
        angle - 0.85,
        angle,
      );
    }
    ctx.stroke();
  }
  ctx.restore();
}
