import { bandFor } from "../../../../../game/bands";
import { entranceFor } from "../../../../../game/animation/entrance";
import { MOVES, ROSTER } from "../../../../../game/engine";
import { heavyMotion } from "../../../../../game/heavyAnimation";
import type { SpriteFrame } from "../../../../../game/objects/Assets";
import { drawHeavySwing } from "../drawHeavySwing";
import type { BattleSceneContext, BlinkEffect, SceneSprite } from "./objects";
export function fighterSprite(
  scene: BattleSceneContext,
  side: number,
  direction = 0,
): SceneSprite | null {
  const sprite = scene.spriteFor(scene.match, side, direction);
  return (
    sprite && {
      ...sprite,
      atlas: sprite.image,
      facing: scene.match.fighters[side].facing,
    }
  );
}

export function drawBodyMotion(
  scene: BattleSceneContext,
  atlas: HTMLImageElement,
  frame: SpriteFrame,
  scale: number,
  motion: { lean: number; lift: number; width: number },
) {
  // Transform the complete drawing once. Separate translucent strips produce
  // horizontal seams when the camera scales them onto fractional pixels.
  const bodyHeight = frame.ay * scale;
  scene.ctx.save();
  scene.ctx.shadowBlur = 0;
  // Shear and breathing scale pivot around the existing foot anchor (0, 0).
  scene.ctx.transform(
    motion.width,
    0,
    -motion.lean / bodyHeight,
    1 + motion.lift / bodyHeight,
    0,
    0,
  );
  scene.ctx.drawImage(
    atlas,
    frame.x,
    frame.y,
    frame.w,
    frame.h,
    -frame.ax,
    -frame.ay,
    frame.w,
    frame.h,
  );
  scene.ctx.restore();
}

export function drawFighter(scene: BattleSceneContext, side: number) {
  const f = scene.match.fighters[side],
    move = MOVES[f.attack ?? ""],
    acting = !f.stun && !f.knockdown && scene.match.phase === "fighting";
  const entry = entranceFor(scene.match, side, scene.reducedMotion);
  const blink = scene.state.fx.find(
    (effect): effect is BlinkEffect =>
      effect.type === "blink" &&
      effect.side === side &&
      effect.max - effect.life < effect.travelMs,
  );
  // Combat stays responsive at the destination; attacks and hit reactions show there immediately.
  const traveling = blink && acting && !f.attack;
  const progress = traveling
    ? Math.min(1, (blink.max - blink.life) / blink.travelMs)
    : 1;
  const remaining = (1 - progress) * (1 - progress);
  const renderX =
    f.x +
    (entry?.offsetX ?? 0) +
    (traveling ? (blink.fromX - blink.toX) * remaining : 0);
  const renderY =
    f.y +
    (entry?.offsetY ?? 0) +
    (traveling ? (blink.fromY - blink.toY) * remaining : 0);
  const sprite = traveling ? blink.sprite : fighterSprite(scene, side);
  if (!sprite) return;
  const { atlas, frame, scale, animation, facing } = sprite;
  const floor = 438,
    surface = scene.match.surfaceBelow(renderX, renderY, f.dropMs),
    shadowY = floor - surface;
  scene.ctx.save();
  scene.ctx.globalAlpha = 0.3 * (entry?.alpha ?? 1);
  scene.ctx.fillStyle = "#03111e";
  scene.ctx.beginPath();
  scene.ctx.ellipse(
    renderX,
    shadowY + 3,
    37 - Math.min(12, (renderY - surface) * 0.04),
    9,
    0,
    0,
    Math.PI * 2,
  );
  scene.ctx.fill();
  scene.ctx.globalAlpha = 0.7 * (entry?.alpha ?? 1);
  scene.ctx.strokeStyle = scene.colors[side];
  scene.ctx.lineWidth = 2;
  scene.ctx.beginPath();
  scene.ctx.ellipse(renderX, shadowY + 1, 31, 6, 0, 0, Math.PI * 2);
  scene.ctx.stroke();
  scene.ctx.globalAlpha = 1;
  const heavy = acting ? heavyMotion(f, move, scene.reducedMotion) : null;
  const motion = entry
    ? null
    : (heavy ??
      scene.mujicaMotion(scene.match, side, animation, scene.reducedMotion));
  const bob =
    !entry &&
    bandFor(f.character).id !== "mujica" &&
    !f.attack &&
    !f.stun &&
    !f.vx
      ? Math.sin(scene.state.visualTime * 0.004 + side) * 1.2
      : 0;
  const recoil =
    !scene.reducedMotion && f.stun
      ? Math.min(9, f.stun / 25) * (f.guard ? 0.55 : 1) * -f.facing
      : 0;
  scene.ctx.translate(
    renderX + recoil,
    floor - renderY + (traveling ? 0 : bob),
  );
  scene.ctx.scale(facing * scale, scale);
  if (entry) {
    scene.ctx.globalAlpha = entry.alpha;
    scene.ctx.rotate(entry.tilt);
    scene.ctx.scale(entry.scaleX, entry.scaleY);
  }
  if (f.attack === "dive" && acting) scene.ctx.rotate(0.18);
  if (!animation && f.crouch && !f.attack && !f.guard)
    scene.ctx.scale(1.06, 0.87);
  scene.ctx.shadowColor = ["special", "super"].includes(f.attack ?? "")
    ? scene.colors[side]
    : "#051323";
  scene.ctx.shadowBlur = ["special", "super"].includes(f.attack ?? "") ? 16 : 4;
  if (
    !traveling &&
    !scene.reducedMotion &&
    (f.dashMs || (acting && ["thrust", "dive"].includes(f.attack ?? "")))
  ) {
    const trailDirection = f.dashMs ? Math.sign(f.vx) * f.facing : 1;
    for (const distance of [40, 20]) {
      scene.ctx.globalAlpha = distance === 40 ? 0.08 : 0.15;
      scene.ctx.drawImage(
        atlas,
        frame.x,
        frame.y,
        frame.w,
        frame.h,
        -frame.ax - (distance / scale) * trailDirection,
        -frame.ay - (f.attack === "dive" ? distance / scale : 0),
        frame.w,
        frame.h,
      );
    }
    scene.ctx.globalAlpha = 1;
  }
  if (traveling) scene.ctx.globalAlpha = 0.7 + 0.3 * progress;
  if (
    f.wakeInvuln > 0 &&
    !scene.reducedMotion &&
    Math.floor(scene.state.visualTime / 50) % 2
  )
    scene.ctx.globalAlpha = 0.65;
  if (motion && !traveling) drawBodyMotion(scene, atlas, frame, scale, motion);
  else
    scene.ctx.drawImage(
      atlas,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      -frame.ax,
      -frame.ay,
      frame.w,
      frame.h,
    );
  scene.ctx.restore();
  if (heavy && !traveling)
    drawHeavySwing(scene.ctx, f, move, heavy, ROSTER[f.character].color);
  if (
    f.character === 4 &&
    acting &&
    move?.rikiOnly &&
    f.attackMs >= move.start &&
    f.attackMs <= move.end
  ) {
    scene.ctx.save();
    scene.ctx.translate(f.x, floor - f.y - 110);
    scene.ctx.scale(f.facing, 1);
    scene.ctx.strokeStyle = move.boosted ? "#fff0c7" : "#d9c4ff";
    scene.ctx.lineWidth = move.category === "super" ? 5 : 3;
    scene.ctx.globalAlpha = scene.reducedMotion ? 0.4 : 0.7;
    const radius =
      move.category === "super" ? 90 + ((f.attackMs % 320) / 320) * 330 : 65;
    scene.ctx.beginPath();
    scene.ctx.ellipse(25, 0, radius, radius * 0.6, -0.5, -1.8, 1.2);
    scene.ctx.stroke();
    scene.ctx.restore();
  }
  if (
    f.character === 3 &&
    acting &&
    f.attack &&
    ["ranaTune", "ranaSuper", "ranaRise", "ranaSlide", "ranaRush"].includes(
      f.attack ?? "",
    )
  ) {
    const m = MOVES[f.attack ?? ""],
      active = f.attackMs >= m.start && f.attackMs <= m.end;
    scene.ctx.save();
    scene.ctx.translate(f.x, floor - f.y - 95);
    scene.ctx.scale(f.facing, 1);
    scene.ctx.strokeStyle = "#c9f0c3";
    scene.ctx.lineWidth = f.attack === "ranaSuper" ? 4 : 2;
    scene.ctx.globalAlpha = scene.reducedMotion ? 0.3 : 0.65;
    scene.ctx.shadowColor = "#b9e8c3";
    scene.ctx.shadowBlur = scene.reducedMotion ? 0 : 12;
    if (f.attack === "ranaSuper" && active) {
      const radius = 80 + ((f.attackMs % 300) / 300) * 330;
      for (let i = 0; i < 3; i++) {
        scene.ctx.beginPath();
        scene.ctx.ellipse(20, 0, radius - i * 18, 70 + i * 20, 0, -1.5, 1.5);
        scene.ctx.stroke();
      }
    } else if (f.attack === "ranaTune") {
      scene.ctx.beginPath();
      scene.ctx.ellipse(
        0,
        95,
        35 + Math.sin(scene.state.visualTime * 0.008) * 3,
        8,
        0,
        0,
        Math.PI * 2,
      );
      scene.ctx.stroke();
    } else if (active) {
      scene.ctx.beginPath();
      scene.ctx.arc(30, f.attack === "ranaSlide" ? 65 : -10, 65, -1.8, 1.1);
      scene.ctx.stroke();
    }
    scene.ctx.restore();
  }
  // Side colours also distinguish mirror matches.
  if (
    scene.match.grounded(f) &&
    !f.stun &&
    !f.attack &&
    scene.match.phase === "idle"
  ) {
    scene.ctx.fillStyle = scene.colors[side];
    scene.ctx.font = 'bold 9px "Segoe UI",sans-serif';
    scene.ctx.textAlign = "center";
    scene.ctx.fillText(ROSTER[f.character].en, f.x, shadowY + 23);
  }
}
