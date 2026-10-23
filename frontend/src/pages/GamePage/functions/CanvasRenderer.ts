import { Camera } from "../../../game/camera";
import {
  createAnimator,
  createMujicaMotion,
  mujicaBodyOffset,
} from "../../../game/animation";
import {
  MOVES,
  ROSTER,
  ROUND_END_TIMING,
  type Match,
} from "../../../game/engine";
import * as mujica from "../../../game/mujica";
import * as mewtype from "../../../game/mewtype";
import type { Assets, Atlas, SpriteFrame } from "../../../game/objects/Assets";
import type { CombatEvent } from "../../../game/objects/CombatEvent";
import type { Fighter } from "../../../game/objects/Fighter";
import type { MatchConfig } from "../../../game/objects/MatchOptions";

interface Effect {
  x: number;
  y: number;
  age: number;
  life: number;
  color: string;
  text: string;
  kind: string;
  direction: number;
}
interface BlinkTrail {
  sprite: Sprite;
  side: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  age: number;
  facing: number;
}
interface Sprite {
  image: HTMLImageElement;
  frame: SpriteFrame;
  scale: number;
  animation: string | null;
}

/** Canvas rendering owns no gameplay state. React owns menus, HUD and controls. */
export class CanvasRenderer {
  private readonly images = new Map<string, HTMLImageElement>();
  private readonly loading = new Map<string, Promise<HTMLImageElement>>();
  private readonly camera = new Camera();
  private readonly animate = createAnimator();
  private readonly motion = createMujicaMotion();
  private readonly context: CanvasRenderingContext2D;
  private readonly reduced = matchMedia("(prefers-reduced-motion: reduce)")
    .matches;
  private effects: Effect[] = [];
  private trails: BlinkTrail[] = [];
  private flash = 0;
  private lastFighter: Fighter | null = null;
  private config: MatchConfig | null = null;

  constructor(
    private readonly assets: Assets,
    private readonly canvas: HTMLCanvasElement,
  ) {
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("浏览器无法启用游戏画布。");
    this.context = context;
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
            image.decode().then(() => {
              this.images.set(url, image);
              resolve(image);
            }, reject);
          image.onerror = () => {
            this.loading.delete(url);
            reject(new Error("角色素材加载失败，请重试。"));
          };
          image.src = url;
        }),
      );
    return this.loading.get(url)!;
  }

  async prepare(config: MatchConfig) {
    this.config = config;
    this.effects = [];
    this.trails = [];
    this.flash = 0;
    this.lastFighter = null;
    const ids = [...new Set(config.teams?.flat() ?? config.characters)];
    const atlases = ids.flatMap((id) => {
      if (id >= 5)
        return [
          ...Object.values(
            (id >= 10 ? this.assets.mewtypeForms : this.assets.mujicaForms)[id],
          ),
          ...Object.values(this.assets.mujicaPortraits[id] ?? {}).map(
            (p) => p.idle,
          ),
          ...(this.assets.mujicaMaskForms[id]
            ? [this.assets.mujicaMaskForms[id]]
            : []),
          ...(id === 7 ? Object.values(this.assets.memeCrawlForms) : []),
          ...(id === 6 ? [this.assets.sakikoCustomerActions] : []),
        ];
      return [
        this.assets.characters[id],
        ...[
          [
            this.assets.anonActions,
            this.assets.anonNormals,
            this.assets.milkDragon,
            this.assets.jabActions[0],
          ],
          [
            this.assets.soyoActions,
            this.assets.soyoTensora,
            this.assets.jabActions[1],
          ],
          [
            this.assets.tomoriActions,
            this.assets.penguin,
            this.assets.jabActions[2],
          ],
          [this.assets.ranaParfaitActions],
          [],
        ][id],
      ];
    });
    const urls = new Set([
      this.assets.backgrounds[config.settings.arena],
      this.assets.ranaParfait.src,
      ...atlases.map((a) => a.atlas),
    ]);
    await Promise.all([...urls].map((url) => this.load(url)));
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
  }

  private sprite(match: Match, side: number): Sprite | null {
    const f = match.fighters[side],
      a = this.assets;
    const animation = this.animate(match, side);
    const move = MOVES[f.attack ?? ""];
    let art: Atlas = a.characters[f.character];
    let frame = art.frames[match.pose(side)] ?? art.frames[0];
    let height = frame.height ?? (235 * frame.h) / art.frames[0].h;
    if (f.character >= 5) {
      const form = (f.character >= 10 ? mewtype : mujica).formFor(f);
      art = (f.character >= 10 ? a.mewtypeForms : a.mujicaForms)[f.character][
        form
      ];
      if (animation?.startsWith("mask-"))
        art = a.mujicaMaskForms[f.character] ?? art;
      else if (animation?.startsWith("customer-"))
        art = a.sakikoCustomerActions;
      else if (animation?.startsWith("crawl-"))
        art = a.memeCrawlForms[form] ?? art;
      else if (animation === "idle" && a.mujicaPortraits[f.character]?.[form])
        art = a.mujicaPortraits[f.character][form].idle;
      frame =
        art.frames.find((frame) => frame.name === animation) ?? art.frames[0];
      height = frame.height ?? 235;
    } else if (f.character === 0 && f.attack === "super" && !f.stun) {
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
        frame = art.frames[index];
        height = frame.height ?? 235;
      }
      if (animation) {
        if (f.penguin) art = a.penguin;
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
    return image
      ? { image, frame, scale: height / frame.h, animation: animation ?? null }
      : null;
  }

  consume(match: Match, events: CombatEvent[]) {
    for (const event of events) {
      const side = event.side ?? 0;
      if (["result", "roundAdvance", "teamAdvance"].includes(event.type)) {
        this.effects = [];
        this.trails = [];
      }
      const f = match.fighters[side];
      if (event.type === "blink") {
        const sprite = this.sprite(match, side);
        if (sprite)
          this.trails.push({
            sprite,
            side,
            fromX: event.fromX ?? f.x,
            fromY: event.fromY ?? f.y,
            toX: f.x,
            toY: f.y,
            age: 0,
            facing: f.facing,
          });
      }
      if (
        [
          "hit",
          "clash",
          "landing",
          "blink",
          "heal",
          "tune",
          "stageFormStart",
          "penguinStart",
          "shieldHit",
          "minionHit",
          "memePulse",
        ].includes(event.type)
      ) {
        this.effects.push({
          x: event.x ?? f.x,
          y: 438 - (event.y ?? f.y + 110),
          age: 0,
          life: event.type === "blink" ? 260 : 500,
          color: event.blocked ? "#a5e5ff" : ROSTER[f.character].color,
          text:
            event.glyph ??
            (event.amount
              ? "+" + event.amount
              : event.damage
                ? "−" + event.damage
                : ""),
          kind: event.type,
          direction: event.direction ?? f.facing,
        });
        if (
          event.type === "hit" &&
          !event.blocked &&
          (event.weight ?? 0) >= 2 &&
          !this.reduced
        ) {
          this.flash = 110;
          this.camera.impact({ x: event.x ?? f.x, weight: event.weight ?? 2 });
        }
      }
    }
  }

  draw(match: Match, dt: number) {
    if (!this.config) return;
    const ctx = this.context,
      scene = this.assets.stages[this.config.settings.arena];
    if (this.lastFighter !== match.fighters[0]) {
      this.lastFighter = match.fighters[0];
      this.camera.reset(match);
    } else this.camera.update(match, dt);
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.round(960 * ratio),
      height = Math.round(540 * ratio);
    if (this.canvas.width !== width) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = "#101825";
    ctx.fillRect(0, 0, 960, 540);
    const background = this.images.get(
      this.assets.backgrounds[this.config.settings.arena],
    );
    if (background)
      ctx.drawImage(
        background,
        -24 - (this.camera.x - 480) * 0.025,
        -12,
        1008,
        564,
      );
    const shade = ctx.createLinearGradient(0, 0, 0, 540);
    shade.addColorStop(0, "#060b1855");
    shade.addColorStop(1, "#050b17aa");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, 960, 540);
    if (!this.reduced) {
      ctx.fillStyle = "#e6f0ff55";
      for (let i = 0; i < 24; i++) {
        const x = (i * 137 + match.elapsed * 0.008) % 960,
          y = (i * 79 + Math.sin(match.elapsed / 2000 + i) * 12) % 500;
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }
    ctx.save();
    ctx.translate(480, 270);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);
    const terrain = match.options.terrain;
    if (terrain) {
      ctx.beginPath();
      ctx.moveTo(-750, 1000);
      for (let x = -750; x <= 1710; x += 12)
        ctx.lineTo(x, 438 - match.floorHeight(x));
      ctx.lineTo(1710, 1000);
      ctx.closePath();
      ctx.fillStyle = scene.terrain.colors?.[2] ?? "#142735";
      ctx.fill();
      ctx.strokeStyle = "#b8d2e455";
      ctx.lineWidth = 3;
      for (const p of terrain.platforms) {
        ctx.fillStyle = scene.terrain.colors?.[1] ?? "#344c60";
        ctx.fillRect(p.left, 438 - p.height, p.right - p.left, 14);
        ctx.beginPath();
        ctx.moveTo(p.left, 438 - p.height);
        ctx.lineTo(p.right, 438 - p.height);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = "#a7bcd733";
      ctx.fillRect(-750, 438, 2460, 2);
    }
    for (const area of match.areas) {
      ctx.globalAlpha = 0.3 + Math.sin(match.elapsed / 60) * 0.12;
      ctx.fillStyle = ROSTER[match.fighters[area.owner].character].color;
      ctx.beginPath();
      ctx.ellipse(area.x, 438 - area.y, area.radius, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    for (const trail of this.trails) {
      if (!match.paused) trail.age += dt;
      const { image, frame, scale } = trail.sprite;
      for (let i = 0; i < (this.reduced ? 1 : 5); i++) {
        const fraction = i / 5,
          age = trail.age - fraction * 90;
        if (age < 0) continue;
        const fade = Math.max(0, 1 - age / (260 - fraction * 90));
        ctx.save();
        ctx.translate(
          trail.fromX + (trail.toX - trail.fromX) * fraction,
          438 - trail.fromY - (trail.toY - trail.fromY) * fraction,
        );
        ctx.scale(trail.facing * scale, scale);
        ctx.globalAlpha = (this.reduced ? 0.15 : 0.42) * fade * fade;
        ctx.drawImage(
          image,
          frame.x,
          frame.y,
          frame.w,
          frame.h,
          -frame.ax,
          -frame.ay,
          frame.w,
          frame.h,
        );
        ctx.restore();
      }
    }
    this.trails = this.trails.filter((trail) => trail.age < 260);
    for (const [side, f] of match.fighters.entries()) {
      const sprite = this.sprite(match, side);
      if (!sprite) continue;
      const { image, frame, scale, animation } = sprite;
      ctx.save();
      ctx.translate(f.x, 438 - match.floorHeight(f.x));
      ctx.fillStyle = "#01040a70";
      ctx.beginPath();
      ctx.ellipse(0, 0, f.penguin ? 70 : 48, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(f.x, 438 - f.y);
      ctx.scale(f.facing * scale, scale);
      const motion =
        f.character >= 5
          ? this.motion(match, side, animation, this.reduced)
          : null;
      if (motion) {
        for (let strip = 0; strip < 32; strip++) {
          const top = (frame.h * strip) / 32,
            bottom = (frame.h * (strip + 1)) / 32;
          const offset = mujicaBodyOffset(motion, (frame.ay - top) / frame.ay);
          ctx.drawImage(
            image,
            frame.x,
            frame.y + top,
            frame.w,
            bottom - top,
            -frame.ax + offset.x / scale,
            -frame.ay + top + offset.y / scale,
            frame.w,
            bottom - top + 0.4,
          );
        }
      } else
        ctx.drawImage(
          image,
          frame.x,
          frame.y,
          frame.w,
          frame.h,
          -frame.ax,
          -frame.ay,
          frame.w,
          frame.h,
        );
      ctx.restore();
      if (f.guard || f.shield) {
        ctx.strokeStyle = f.shield ? "#ccecff" : "#a8dcff88";
        ctx.lineWidth = f.shield ? 6 : 3;
        ctx.beginPath();
        ctx.ellipse(
          f.x + f.facing * 40,
          438 - f.y - 90,
          42,
          95,
          0,
          -Math.PI / 2,
          Math.PI / 2,
        );
        ctx.stroke();
      }
      for (const unit of f.summons?.units ?? []) {
        const art = this.assets.soyoTensora,
          image = this.images.get(art.atlas);
        if (!image) continue;
        const frame = art.frames[unit.phase === "charge" ? 2 : 0],
          scale = 72 / frame.h;
        ctx.save();
        ctx.translate(unit.x, 438 - unit.y);
        ctx.scale(unit.facing * scale, scale);
        ctx.drawImage(
          image,
          frame.x,
          frame.y,
          frame.w,
          frame.h,
          -frame.ax,
          -frame.ay,
          frame.w,
          frame.h,
        );
        ctx.restore();
      }
      if (f.soyoSuper?.released) {
        ctx.strokeStyle = "#ffe7b0aa";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(
          f.soyoSuper.x,
          438 - f.soyoSuper.y,
          f.soyoSuper.radius,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
    }
    for (const w of match.waves) {
      const color = ROSTER[match.fighters[w.owner].character].color;
      ctx.save();
      ctx.translate(w.x, 438 - w.y);
      ctx.fillStyle = color;
      ctx.strokeStyle = "#ffffffcc";
      ctx.shadowColor = color;
      ctx.shadowBlur = this.reduced ? 0 : 16;
      if (w.attack === "ranaParfait") {
        const image = this.images.get(this.assets.ranaParfait.src);
        if (image) ctx.drawImage(image, -25, -42, 50, 84);
      } else {
        ctx.beginPath();
        ctx.ellipse(
          0,
          0,
          w.radial ? (w.radius ?? 0) : (w.rx ?? 22),
          w.radial ? (w.radius ?? 0) : (w.ry ?? 30),
          0,
          0,
          Math.PI * 2,
        );
        w.radial ? ctx.stroke() : ctx.fill();
      }
      ctx.restore();
    }
    for (const e of this.effects) {
      if (!match.paused) e.age += dt;
      const progress = e.age / e.life;
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.globalAlpha = Math.max(0, 1 - progress);
      ctx.strokeStyle = e.color;
      ctx.fillStyle = e.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(
        0,
        0,
        12 + progress * 80,
        10 + progress * 55,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(e.text, 0, -30 - progress * 35);
      ctx.restore();
    }
    this.effects = this.effects.filter((e) => e.age < e.life);
    ctx.restore();
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,230,242,${this.flash / 500})`;
      ctx.fillRect(0, 0, 960, 540);
      if (!match.paused) this.flash -= dt;
    }
    if (match.phase === "ready") {
      ctx.fillStyle = "#f4f3ff";
      ctx.textAlign = "center";
      ctx.font = "italic bold 66px sans-serif";
      ctx.fillText("READY", 480, 280);
    }
    if (match.roundEnd && match.phaseMs > ROUND_END_TIMING.total - 700) {
      ctx.fillStyle = "#fff4e4";
      ctx.textAlign = "center";
      ctx.font = "italic bold 90px sans-serif";
      ctx.fillText(match.reason, 480, 285);
    }
  }
}
