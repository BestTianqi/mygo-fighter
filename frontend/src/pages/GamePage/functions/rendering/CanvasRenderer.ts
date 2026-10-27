import { createAnimator } from "../../../../game/animation";
import { entranceFor } from "../../../../game/animation/entrance";
import { bandFor } from "../../../../game/bands";
import { MOVES, ROUND_END_TIMING, type Match } from "../../../../game/engine";
import type {
  Assets,
  Atlas,
  SpriteFrame,
} from "../../../../game/objects/Assets";
import type { CombatEvent } from "../../../../game/objects/CombatEvent";
import type { Fighter } from "../../../../game/objects/Fighter";
import type { MatchConfig } from "../../../../game/objects/MatchOptions";
import { bandAtlas, bandAtlases, bandPortrait } from "../bandArt";
import { finishArtFor } from "../finishArtFor";

import { createBattleScene } from "./createBattleScene";
import { PreScaledSpriteCache } from "./PreScaledSpriteCache";

export interface SpriteSource {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Sprite {
  image: CanvasImageSource;
  frame: SpriteFrame;
  source?: SpriteSource;
  scale: number;
  animation: string | null;
}

const RENDER_SCALES = [1, 1.25, 1.5, 2];
const QUALITY_WARMUP_FRAMES = 30;
const SLOW_QUALITY_FRAMES = 30;
const FAST_QUALITY_FRAMES = 240;
const SLOW_RENDER_MS = 12;
const FAST_RENDER_MS = 4;
const SLOW_FRAME_MS = 24;
const FAST_FRAME_MS = 20;
const FRAME_PRESSURE_SAMPLES = 12;
const MAX_DECODED_IMAGE_BYTES = 384 * 1024 * 1024;

function qualityIndexFor(maximum: number) {
  const index = RENDER_SCALES.findIndex((scale) => scale >= maximum);
  return index < 0 ? RENDER_SCALES.length - 1 : index;
}

/** Canvas rendering owns no gameplay state. React owns menus, HUD and controls. */
export class CanvasRenderer {
  private readonly images = new Map<string, HTMLImageElement>();
  private readonly loading = new Map<string, Promise<HTMLImageElement>>();
  private readonly animate = createAnimator();
  private readonly reducedMotion = matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  private offsets = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ];
  private correctionMs = 0;
  private visualFighters: Fighter[] = [];
  private sourceFighter: Fighter | null = null;
  resetCorrection() {
    this.offsets = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ];
    this.correctionMs = 0;
  }
  positions(match: Match) {
    return match.fighters.map((f, i) => ({
      x: f.x + this.offsets[i].x,
      y: f.y + this.offsets[i].y,
    }));
  }
  correct(match: Match, before: { x: number; y: number }[], snap: boolean) {
    let distance = 0;
    this.offsets = match.fighters.map((f, i) => {
      const x = before[i].x - f.x,
        y = before[i].y - f.y;
      distance = Math.max(distance, Math.hypot(x, y));
      return snap || Math.hypot(x, y) > 80 ? { x: 0, y: 0 } : { x, y };
    });
    this.correctionMs = 80;
    return distance;
  }
  private readonly context: CanvasRenderingContext2D;
  private readonly scene: ReturnType<typeof createBattleScene>;
  private readonly spriteCache = new PreScaledSpriteCache();
  private renderScale = 1;
  private maximumRenderScale = 0;
  private qualityIndex = 0;
  private qualityFrames = 0;
  private slowQualityFrames = 0;
  private fastQualityFrames = 0;
  private averageRenderMs = 0;
  private averageFrameMs = 0;

  constructor(
    private readonly assets: Assets,
    private readonly canvas: HTMLCanvasElement,
  ) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("浏览器无法启用游戏画布。");
    this.context = context;
    this.syncRenderQuality();
    this.renderScale = this.targetRenderScale();
    this.scene = createBattleScene(
      context,
      assets,
      (url) => this.images.get(url),
      (match, side, direction, viewZoom) =>
        this.sprite(match, side, direction, viewZoom),
    );
  }

  private targetRenderScale() {
    return Math.min(this.maximumRenderScale, RENDER_SCALES[this.qualityIndex]);
  }

  private resetQualitySamples(warmup = true) {
    this.qualityFrames = warmup ? 0 : QUALITY_WARMUP_FRAMES;
    this.slowQualityFrames = 0;
    this.fastQualityFrames = 0;
    this.averageRenderMs = 0;
    this.averageFrameMs = 0;
  }

  private syncRenderQuality() {
    const maximum = Math.min(2, window.devicePixelRatio || 1);
    if (maximum === this.maximumRenderScale) return;
    this.maximumRenderScale = maximum;
    this.qualityIndex = qualityIndexFor(maximum);
    this.resetQualitySamples();
  }

  private recordRenderCost(cost: number, frameMs: number) {
    const fresh = this.averageFrameMs === 0;
    this.averageRenderMs = fresh
      ? cost
      : this.averageRenderMs * 0.9 + cost * 0.1;
    this.averageFrameMs = fresh
      ? frameMs
      : this.averageFrameMs * 0.9 + frameMs * 0.1;
    this.qualityFrames++;
    if (this.qualityFrames < QUALITY_WARMUP_FRAMES) return;
    // Cached canvases can defer native raster work beyond the JS draw call.
    // Sustained missed-frame cadence catches that pressure as well.
    const framePressure = this.averageFrameMs > SLOW_FRAME_MS;
    if (this.averageRenderMs > SLOW_RENDER_MS || framePressure) {
      this.slowQualityFrames++;
      this.fastQualityFrames = 0;
      const required = framePressure
        ? FRAME_PRESSURE_SAMPLES
        : SLOW_QUALITY_FRAMES;
      if (this.slowQualityFrames >= required && this.qualityIndex > 0) {
        this.qualityIndex--;
        this.resetQualitySamples(false);
      }
    } else if (
      this.averageRenderMs < FAST_RENDER_MS &&
      this.averageFrameMs < FAST_FRAME_MS
    ) {
      this.fastQualityFrames++;
      this.slowQualityFrames = 0;
      if (
        this.fastQualityFrames >= FAST_QUALITY_FRAMES &&
        this.qualityIndex < qualityIndexFor(this.maximumRenderScale)
      ) {
        this.qualityIndex++;
        this.resetQualitySamples(false);
      }
    } else {
      this.slowQualityFrames = 0;
      this.fastQualityFrames = 0;
    }
  }

  private load(url: string): Promise<HTMLImageElement> {
    if (this.images.has(url)) return Promise.resolve(this.images.get(url)!);
    if (!this.loading.has(url))
      this.loading.set(
        url,
        new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.decoding = "async";
          image.onload = () =>
            image.decode().then(
              () => {
                this.images.set(url, image);
                this.loading.delete(url);
                resolve(image);
              },
              (error: unknown) => {
                this.loading.delete(url);
                reject(error);
              },
            );
          image.onerror = () => {
            this.loading.delete(url);
            reject(new Error("角色素材加载失败，请重试。"));
          };
          image.src = url;
        }),
      );
    return this.loading.get(url)!;
  }

  private trimDecodedImages(retain: Set<string>) {
    const sizes = new Map<string, number>();
    let total = 0,
      required = 0;
    for (const [url, image] of this.images) {
      const bytes = image.naturalWidth * image.naturalHeight * 4;
      sizes.set(url, bytes);
      total += bytes;
      if (retain.has(url)) required += bytes;
    }
    // Never evict a current/reserve fighter's required art. Older matches may
    // occupy the remaining budget, but cannot grow without bound across rosters.
    const budget = Math.max(MAX_DECODED_IMAGE_BYTES, required);
    for (const [url] of this.images) {
      if (total <= budget) break;
      if (retain.has(url)) continue;
      total -= sizes.get(url) ?? 0;
      this.images.delete(url);
    }
  }

  async prepare(config: MatchConfig) {
    this.scene.reset(config.settings.arena);
    this.visualFighters = [];
    this.resetCorrection();
    const ids = [...new Set(config.teams?.flat() ?? config.characters)];
    const atlases = ids.flatMap((id) => bandAtlases(this.assets, id));
    const urls = new Set([
      this.assets.backgrounds[config.settings.arena],
      ...ids.flatMap((character) => [
        finishArtFor(this.assets, { character }),
        finishArtFor(this.assets, { character, stageForm: true }),
        finishArtFor(this.assets, { character }, true),
        finishArtFor(this.assets, { character, stageForm: true }, true),
        finishArtFor(this.assets, { character, penguin: true }, true),
      ]),
      ...ids.flatMap((id) => {
        const portrait = bandPortrait(this.assets, id)?.portrait;
        return [portrait ?? this.assets.characters[id].portrait];
      }),
      this.assets.ranaParfait.src,
      ...atlases.map((a) => a.atlas),
    ]);
    // Six fighters include large normal, action and transformation atlases.
    // Limit simultaneous decoder allocations while still warming every reserve.
    const pending = [...urls];
    for (let i = 0; i < pending.length; i += 2)
      await Promise.all(pending.slice(i, i + 2).map((url) => this.load(url)));
    // Decode and rasterize before the ready countdown starts.
    for (const art of atlases) {
      const frame = art.frames[0];
      this.context.drawImage(
        this.images.get(art.atlas)!,
        frame.x,
        frame.y,
        frame.w,
        frame.h,
        0,
        0,
        2,
        2,
      );
    }
    this.trimDecodedImages(urls);
  }

  private sprite(
    match: Match,
    side: number,
    blinkDirection = 0,
    viewZoom = 1,
  ): Sprite | null {
    const live = match.fighters[side],
      a = this.assets;
    const ending = match.roundEnd?.fighters[side];
    const impact =
      ending &&
      ROUND_END_TIMING.total - match.phaseMs < ROUND_END_TIMING.impact;
    const f: Fighter = ending
      ? {
          ...live,
          stageForm: ending.stageForm ? (live.stageForm ?? { ms: 1 }) : null,
          penguin: ending.penguin ? (live.penguin ?? { ms: 1 }) : null,
          ...(impact
            ? { attack: ending.attack, attackMs: ending.attackMs }
            : {}),
        }
      : live;
    const animation = blinkDirection
      ? f.penguin
        ? blinkDirection * f.facing < 0
          ? "walk-pass"
          : "flipper-heavy"
        : blinkDirection * f.facing < 0
          ? "dash-back"
          : "dash-forward"
      : (entranceFor(match, side, this.reducedMotion)?.animation ??
        this.animate(match, side));
    const move = MOVES[f.attack ?? ""];
    let art: Atlas = a.characters[f.character];
    let frame = art.frames[match.pose(side)] ?? art.frames[0];
    let height = frame.height ?? (235 * frame.h) / art.frames[0].h;
    const band = bandFor(f.character);
    if (band.id !== "mygo") {
      const form = band.formFor(f);
      art = bandAtlas(a, f.character, form);
      if (animation?.startsWith("mask-"))
        art = a.mujicaMaskForms[f.character] ?? art;
      else if (animation?.startsWith("customer-"))
        art = a.sakikoCustomerActions;
      else if (animation?.startsWith("crawl-"))
        art = a.memeCrawlForms[form] ?? art;
      else {
        const portrait = bandPortrait(a, f.character, form);
        if (animation === "idle" && portrait) art = portrait.idle;
      }
      frame =
        art.frames.find((frame) => frame.name === animation) ?? art.frames[0];
      height = frame.height ?? 235;
    } else if (
      f.character === 0 &&
      f.attack === "super" &&
      !f.stun &&
      !f.knockdown &&
      (match.phase === "fighting" || impact)
    ) {
      art = a.milkDragon;
      const t = f.attackMs;
      frame =
        art.frames[t < 350 ? 0 : t < 760 ? 1 : t < 1490 ? 2 : t < 1940 ? 3 : 1];
      height =
        360 *
        Math.min(1, 0.4 + t / 600) *
        (t > 2050 ? Math.max(0.35, 1 - (t - 2050) / 700) : 1);
    } else {
      if (
        f.character === 0 &&
        move &&
        !f.stun &&
        !f.knockdown &&
        (match.phase === "fighting" || impact) &&
        (move.normalIndex !== undefined ||
          move.artIndex !== undefined ||
          f.attack === "rising")
      ) {
        art = a.anonNormals;
        const index =
          f.attack === "rush"
            ? f.attackMs < 250
              ? 0
              : f.attackMs < 460
                ? 1
                : 2
            : (move.normalIndex ??
              move.artIndex ??
              (f.attackMs < 180 ? 8 : 14));
        frame =
          art.frames[f.attack === "thrust" && f.attackMs < 60 ? 0 : index];
        height = frame.height ?? 235;
      }
      if (
        animation &&
        !(
          animation === "idle" &&
          !f.penguin &&
          !a.mygoPortraits?.[f.character] &&
          f.character < 2
        )
      ) {
        if (f.penguin) art = a.penguin;
        else if (animation === "idle" && a.mygoPortraits?.[f.character])
          art = a.mygoPortraits[f.character].idle;
        else if (animation.startsWith("jab-") && f.character < 3)
          art = a.jabActions[f.character];
        else if (f.character === 3 && animation.startsWith("parfait-"))
          art = a.ranaParfaitActions;
        else
          art = [
            a.anonActions,
            a.soyoActions,
            a.tomoriActions,
            a.characters[3],
            a.characters[4],
          ][f.character];
        const frames =
          "actionFrames" in art
            ? ((art as Assets["characters"][number]).actionFrames ?? art.frames)
            : art.frames;
        frame = frames.find((frame) => frame.name === animation) ?? frame;
        height = frame.height ?? 235;
      }
    }
    const image = this.images.get(art.atlas);
    if (!image) return null;
    const sprite = {
      image,
      frame,
      scale: height / frame.h,
      animation: animation ?? null,
    };
    return this.spriteCache.get(art.atlas, sprite, this.renderScale * viewZoom);
  }

  consume(match: Match, events: CombatEvent[]) {
    this.scene.consume(match, events);
  }

  draw(
    match: Match,
    dt: number,
    videoBackground = false,
    authority: Match | null = null,
  ) {
    if (this.sourceFighter !== match.fighters[0]) {
      this.sourceFighter = match.fighters[0];
      this.visualFighters = [];
    }
    this.syncRenderQuality();
    const ratio = this.targetRenderScale();
    if (ratio !== this.renderScale) {
      this.renderScale = ratio;
      this.resetQualitySamples(false);
    }
    const width = Math.round(960 * ratio),
      height = Math.round(540 * ratio);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.context.setTransform(
      this.canvas.width / 960,
      0,
      0,
      this.canvas.height / 540,
      0,
      0,
    );
    const renderStarted = performance.now();
    this.context.clearRect(0, 0, 960, 540);
    if (this.correctionMs > 0) {
      const next = Math.max(0, this.correctionMs - dt);
      for (const offset of this.offsets) {
        offset.x *= next / this.correctionMs;
        offset.y *= next / this.correctionMs;
      }
      this.correctionMs = next;
    }
    // Only the render projection moves: authoritative and predicted hitboxes remain untouched.
    const visual = Object.create(match) as Match;
    if (authority)
      Object.assign(visual, {
        phase: authority.phase,
        phaseMs:
          authority.phase === match.phase ? match.phaseMs : authority.phaseMs,
        reason: authority.reason,
        roundEnd: authority.roundEnd,
        winner: authority.winner,
        entrySides: authority.entrySides,
      });
    visual.fighters = match.fighters.map((f, i) => {
      const target = (this.visualFighters[i] ??= { ...f });
      return Object.assign(target, f, {
        hp: authority?.fighters[i].hp ?? f.hp,
        x: f.x + this.offsets[i].x,
        y: f.y + this.offsets[i].y,
      });
    });
    this.scene.draw(visual, dt, videoBackground);
    this.recordRenderCost(performance.now() - renderStarted, dt);
  }
}
