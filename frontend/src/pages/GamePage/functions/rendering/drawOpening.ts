import {
  ENTRANCE_TIMING,
  entranceFor,
  openingFor,
} from "../../../../game/animation/entrance";
import type { BattleSceneContext } from "./battleScene/objects";

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const INK = "#0b1022";
const PAPER = "#fff0d0";
const GOLD = "#ffd56f";

/** Contain the approach in a wider shot, then settle into the normal camera.
 * This is a render projection; the live camera and fighter coordinates stay intact.
 */
export function openingView(scene: BattleSceneContext) {
  const base = scene.camera.snapshot();
  if (scene.match.phase !== "ready" || scene.reducedMotion) return base;
  const frames = scene.match.fighters.map((_, side) =>
    entranceFor(scene.match, side),
  );
  if (!frames.some(Boolean)) return base;
  const age = ENTRANCE_TIMING.total - scene.match.phaseMs;
  const t = clamp(age / 1850);
  const wide = 0.94 + 0.06 * t * t * (3 - 2 * t);
  const boxes = scene.match.fighters.map((f, side) => ({
    x: f.x + (frames[side]?.offsetX ?? 0),
    top: 438 - f.y - (frames[side]?.offsetY ?? 0) - 280,
    bottom: 438 - f.y - Math.min(0, frames[side]?.offsetY ?? 0) + 14,
  }));
  const left = Math.min(...boxes.map((b) => b.x - 130));
  const right = Math.max(...boxes.map((b) => b.x + 130));
  const bottom = Math.max(...boxes.map((b) => b.bottom));
  const top = Math.min(...boxes.map((b) => b.top));
  const zoom = Math.min(
    base.zoom * wide,
    832 / (right - left),
    336 / (bottom - top),
  );
  return {
    x: (left + right) / 2,
    y: bottom - 170 / zoom,
    zoom,
  };
}

export function drawOpeningBackdrop(scene: BattleSceneContext) {
  if (scene.match.phase !== "ready") return;
  const age = ENTRANCE_TIMING.total - scene.match.phaseMs;
  const opacity = scene.reducedMotion
    ? 0.18
    : clamp(age / 120) * clamp((2100 - age) / 320);
  const { ctx } = scene;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = INK;
  ctx.fillRect(0, 98, 960, 24);
  ctx.fillRect(0, 478, 960, 28);
  ctx.globalAlpha *= 0.18;
  ctx.fillRect(0, 122, 960, 356);
  ctx.restore();
}

/** Bold arcade lettering, with one short impact beat instead of a floating label. */
export function drawOpeningCue(scene: BattleSceneContext) {
  const cue = openingFor(scene.match);
  if (!cue) return;
  const { ctx, reducedMotion } = scene;
  const p = cue.progress;
  const versus = cue.kind === "versus";
  const threeWay = versus && scene.match.isBrawl;
  const round = cue.kind === "round";
  const fight = cue.kind === "fight";
  const label = versus
    ? threeWay
      ? "3 WAY"
      : "VS"
    : round
      ? `ROUND ${scene.match.round}`
      : fight
        ? "FIGHT"
        : "READY";
  const opacity = reducedMotion
    ? 1
    : fight
      ? clamp((1 - p) / 0.32)
      : versus
        ? clamp(p / 0.16) * clamp((1 - p) / 0.18)
        : round
          ? clamp(p / 0.12) * clamp((1 - p) / 0.18)
          : 1;
  const slam = reducedMotion
    ? 1
    : 1 +
      Math.max(0, 1 - p / (fight ? 0.25 : 0.2)) ** 2 * (versus ? 0.25 : 0.65);
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(
    480 +
      (!reducedMotion && fight ? Math.max(0, (p - 0.7) / 0.3) ** 2 * 100 : 0),
    threeWay ? 450 : versus ? 195 : 267,
  );
  ctx.scale(slam, slam);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.font = `italic 900 ${threeWay ? 36 : versus ? 58 : round ? 44 : 88}px Impact,"Arial Black",sans-serif`;
  ctx.strokeStyle = INK;
  ctx.lineWidth = threeWay ? 5 : versus ? 9 : 13;
  ctx.strokeText(label, 0, 4);
  ctx.strokeStyle = fight || versus ? GOLD : "#d0dfef";
  ctx.lineWidth = threeWay ? 1.5 : 3;
  ctx.strokeText(label, 0, 0);
  const fill = ctx.createLinearGradient(0, -40, 0, 40);
  fill.addColorStop(0, PAPER);
  fill.addColorStop(0.48, fight || versus ? GOLD : "#ffffff");
  fill.addColorStop(1, fight ? "#ee9554" : "#b3c6df");
  ctx.fillStyle = fill;
  ctx.fillText(label, 0, 0);
  if (!versus) {
    const width = round ? 150 : 220;
    ctx.fillStyle = GOLD;
    ctx.fillRect(-width / 2, 49, width, 3);
    ctx.fillStyle = PAPER;
    ctx.font = 'bold 11px "Microsoft YaHei",sans-serif';
    ctx.fillText(
      round
        ? scene.match.isTeamBattle
          ? "3 对 3 · 车轮战"
          : "对 决 开 始"
        : fight
          ? "开 战"
          : "准 备",
      0,
      68,
    );
  }
  ctx.restore();
}
