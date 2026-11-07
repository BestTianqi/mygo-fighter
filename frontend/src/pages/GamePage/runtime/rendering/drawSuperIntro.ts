import { bandPortrait } from "../../../../assets/bandArt";
import { MOVES, ROSTER } from "../../../../game/combatData";
import type { BattleSceneContext } from "./battleScene/objects";

const clamp = (n: number) => Math.max(0, Math.min(1, n));

/** A render-only close-up: frozen collision coordinates remain unchanged. */
export function superIntroView(
  scene: BattleSceneContext,
  base: { x: number; y: number; zoom: number },
) {
  const intro = scene.match.superIntro;
  if (!intro || intro.sides.length !== 1 || scene.reducedMotion) return base;
  const f = scene.match.fighters[intro.sides[0]];
  const envelope =
    clamp(intro.elapsedMs / 240) *
    clamp((intro.durationMs - intro.elapsedMs) / 340);
  const blend = 0.16 * envelope;
  return {
    x: base.x + (f.x - base.x) * blend,
    y: base.y + (438 - f.y - 140 - base.y) * blend,
    zoom: base.zoom * (1 + 0.1 * envelope),
  };
}

/** Character-colored score lines, a short portrait cut-in, then room for the original scene. */
export function drawSuperIntro(scene: BattleSceneContext) {
  const intro = scene.match.superIntro;
  if (!intro) return;
  const { ctx, reducedMotion } = scene;
  const opacity =
    clamp(intro.elapsedMs / 100) *
    clamp((intro.durationMs - intro.elapsedMs) / 160);
  ctx.save();
  ctx.globalAlpha = opacity;
  const shade = ctx.createLinearGradient(0, 0, 0, 540);
  shade.addColorStop(0, "#050816b0");
  shade.addColorStop(0.48, "#05081600");
  shade.addColorStop(1, "#050816b0");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, 960, 540);
  ctx.fillStyle = "#070b16b8";
  ctx.fillRect(0, 82, 960, 17);
  ctx.fillRect(0, 459, 960, 22);
  for (const [index, side] of intro.sides.entries()) {
    const cast = scene.match.superCasts[side];
    if (!cast || cast.elapsedMs < 0) continue;
    const color = ROSTER[cast.character].color;
    const progress = clamp(intro.elapsedMs / intro.durationMs);
    const x = (960 * (index + 0.5)) / intro.sides.length;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = opacity * 0.38;
    for (let line = 0; line < 5; line++) {
      ctx.beginPath();
      ctx.moveTo(0, 401 + line * 8);
      ctx.lineTo(960, 401 + line * 8);
      ctx.stroke();
    }
    ctx.globalAlpha = opacity * 0.65;
    ctx.fillRect(x - 100, 471, 200 * progress, 2);
    if (!reducedMotion)
      for (let n = 0; n < 6; n++) {
        const t = (cast.elapsedMs / 2200 + n / 6) % 1;
        const nx = (x - 250 + t * 500 + 960) % 960,
          ny = 420 - Math.sin(t * Math.PI) * 28;
        ctx.beginPath();
        ctx.ellipse(nx, ny, 3.5, 2.5, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(nx + 2, ny - 17, 1, 17);
      }
    // Only the first 0.9 s uses the close-up; dialogue backgrounds stay visible afterward.
    const cut =
      clamp(cast.elapsedMs / 140) * clamp((950 - cast.elapsedMs) / 260);
    if (cut > 0 && intro.durationMs >= 900) {
      const portrait = bandPortrait(
        scene.assets,
        cast.character,
        cast.form === "stage" ? "stage" : "normal",
      );
      const image = portrait && scene.getImage(portrait.portrait);
      if (image) {
        const panel = Math.min(310, 760 / intro.sides.length);
        const left = x - panel / 2 + (reducedMotion ? 0 : (1 - cut) * 75);
        ctx.save();
        ctx.globalAlpha = opacity * cut;
        ctx.beginPath();
        ctx.moveTo(left + 30, 122);
        ctx.lineTo(left + panel, 122);
        ctx.lineTo(left + panel - 30, 393);
        ctx.lineTo(left, 393);
        ctx.closePath();
        ctx.clip();
        ctx.fillStyle = "#080e20b8";
        ctx.fillRect(left, 122, panel, 271);
        const h = 480,
          w = (image.width / image.height) * h;
        ctx.drawImage(image, x - w / 2, 113, w, h);
        ctx.restore();
      }
    }
    ctx.globalAlpha = opacity * 0.9;
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff5e6";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(
      MOVES[cast.attack].name,
      x,
      452,
      Math.min(430, 880 / intro.sides.length),
    );
  }
  ctx.restore();
}
