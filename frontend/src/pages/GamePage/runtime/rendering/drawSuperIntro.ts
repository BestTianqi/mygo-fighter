import { bandPortrait } from "../../../../assets/bandArt";
import { MOVES } from "../../../../game/combatData";
import type { SuperCast } from "../../../../game/objects/SuperCast";
import type { BattleSceneContext } from "./battleScene/objects";
import { drawSuperOrnament, superStyle } from "./superOrnaments";

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
};

/** Camera framing is visual only. Short casts keep the normal gameplay camera. */
export function superIntroView(
  scene: BattleSceneContext,
  base: { x: number; y: number; zoom: number },
) {
  const intro = scene.match.superIntro;
  if (!intro || intro.sides.length !== 1 || scene.reducedMotion) return base;
  const f = scene.match.fighters[intro.sides[0]];
  const envelope =
    ease(intro.elapsedMs / 240) *
    ease((intro.durationMs - intro.elapsedMs) / 340);
  const blend = 0.16 * envelope;
  return {
    x: base.x + (f.x - base.x) * blend,
    y: base.y + (438 - f.y - 140 - base.y) * blend,
    zoom: base.zoom * (1 + 0.1 * envelope),
  };
}

function drawPortrait(
  scene: BattleSceneContext,
  cast: SuperCast,
  x: number,
  width: number,
  height: number,
  cut: number,
  color: string,
) {
  const { ctx } = scene;
  const portrait = bandPortrait(scene.assets, cast.character, cast.form);
  const atlas = cast.form === "penguin" ? scene.assets.penguin : null;
  const frame = atlas?.frames[0];
  const image = scene.getImage(atlas?.atlas ?? portrait?.portrait ?? "");
  if (!image) return;
  const y = 270 - height / 2;
  const left = x - width / 2;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(left + 24, y);
  ctx.lineTo(left + width, y);
  ctx.lineTo(left + width - 24, y + height);
  ctx.lineTo(left, y + height);
  ctx.closePath();
  ctx.clip();
  const background = ctx.createLinearGradient(
    left,
    y,
    left + width,
    y + height,
  );
  background.addColorStop(0, "#080c1e");
  background.addColorStop(0.7, "#10182d");
  background.addColorStop(1, color);
  ctx.fillStyle = background;
  ctx.fillRect(left, y, width, height);
  ctx.fillStyle = color;
  ctx.fillRect(left, y, width, 3);
  ctx.fillRect(left, y + height - 2, width, 2);
  ctx.globalAlpha *= 0.8 + 0.2 * cut;
  if (frame) {
    const h = height * 0.96;
    const w = (h * frame.w) / frame.h;
    ctx.drawImage(
      image,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      x - w / 2,
      y,
      w,
      h,
    );
  } else {
    const h = height * 1.83;
    const w = (h * image.width) / image.height;
    ctx.drawImage(image, x - w / 2, y + 4, w, h);
  }
  ctx.restore();
}

/** Both frozen introductions and immediate casts use the same media clock. */
export function drawSuperIntro(scene: BattleSceneContext) {
  const { match, ctx, reducedMotion } = scene;
  if (match.phase !== "fighting") return;
  const intro = match.superIntro;
  const casts = match.superCasts.filter((cast): cast is SuperCast => {
    if (!cast || !match.active(cast.side)) return false;
    if (intro) return intro.sides.includes(cast.side) && !cast.held;
    const timing = MOVES[cast.attack].cinematic!;
    const afterCue = cast.elapsedMs - timing.releaseCueMs;
    return afterCue < 620 && cast.elapsedMs >= -(timing.mediaDelayMs ?? 0);
  });
  if (!casts.length) return;
  const introOpacity = intro ? ease(intro.elapsedMs / 110) : 0;
  ctx.save();
  if (intro) {
    ctx.globalAlpha = introOpacity;
    const shade = ctx.createLinearGradient(0, 0, 0, 540);
    shade.addColorStop(0, "#050816c8");
    shade.addColorStop(0.46, "#05081600");
    shade.addColorStop(1, "#050816ce");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, 960, 540);
  }

  for (const [index, cast] of casts.entries()) {
    const move = MOVES[cast.attack];
    const timing = move.cinematic!;
    const age = cast.elapsedMs + (timing.mediaDelayMs ?? 0);
    const afterCue = cast.elapsedMs - timing.releaseCueMs;
    const style = superStyle(cast);
    const center = (960 * (index + 0.5)) / casts.length;
    const span = Math.min(360, 870 / casts.length);
    const introProgress = intro ? clamp(intro.elapsedMs / intro.durationMs) : 1;
    const opacity = intro ? introOpacity : ease((620 - afterCue) / 370);
    ctx.globalAlpha = opacity;
    // Put the moving ornament below the action, outside of the HUD.
    drawSuperOrnament(
      ctx,
      style,
      center,
      443,
      span,
      reducedMotion ? 0 : age,
      introProgress,
    );
    const portraitLength = timing.leadInMs > 650 ? 880 : 480;
    const portraitAge = age;
    const cut =
      ease((portraitAge + 30) / 120) *
      ease((portraitLength - portraitAge) / 220);
    if (cut > 0) {
      const width = Math.min(intro ? 300 : 175, span);
      const height = intro ? 253 : 152;
      // Quick supers keep the center of the arena visible.
      const position =
        intro || casts.length > 1 ? center : cast.side === 0 ? 155 : 805;
      const slide = reducedMotion
        ? 0
        : (1 - cut) * (cast.side === 0 ? -65 : 65);
      ctx.globalAlpha = opacity * cut;
      drawPortrait(
        scene,
        cast,
        position + slide,
        width,
        height,
        cut,
        style.color,
      );
    }
    const flash = afterCue >= 0 ? ease(1 - afterCue / 240) : 0;
    if (flash > 0) {
      ctx.globalAlpha = flash * (reducedMotion ? 0.32 : 0.76);
      ctx.fillStyle = style.color;
      ctx.fillRect(center - span / 2, 425, span, 2);
    }
    ctx.globalAlpha = opacity * 0.94;
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff5e6";
    ctx.strokeStyle = "#080a14";
    ctx.lineWidth = 3;
    ctx.font = "bold 18px sans-serif";
    ctx.strokeText(move.name, center, 476, span + 14);
    ctx.fillText(move.name, center, 476, span + 14);
  }
  ctx.restore();
}
