import { createAnimator } from "../../../game/animation";
import { MOVES, ROUND_END_TIMING, type Match } from "../../../game/engine";
import * as mujica from "../../../game/mujica";
import * as mewtype from "../../../game/mewtype";
import type { Assets, Atlas, SpriteFrame } from "../../../game/objects/Assets";
import type { CombatEvent } from "../../../game/objects/CombatEvent";
import type { Fighter } from "../../../game/objects/Fighter";
import type { MatchConfig } from "../../../game/objects/MatchOptions";

import { createBattleScene } from "./createBattleScene";

export interface Sprite {
  image: HTMLImageElement;
  frame: SpriteFrame;
  scale: number;
  animation: string | null;
}

/** Canvas rendering owns no gameplay state. React owns menus, HUD and controls. */
export class CanvasRenderer {
  private readonly images = new Map<string, HTMLImageElement>();
  private readonly loading = new Map<string, Promise<HTMLImageElement>>();
  private readonly animate = createAnimator();
  private readonly context: CanvasRenderingContext2D;
  private readonly scene: ReturnType<typeof createBattleScene>;

  constructor(
    private readonly assets: Assets,
    private readonly canvas: HTMLCanvasElement,
  ) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("浏览器无法启用游戏画布。");
    this.context = context;
    this.scene = createBattleScene(
      context,
      assets,
      (url) => this.images.get(url),
      (match, side, direction) => this.sprite(match, side, direction),
    );
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
    this.scene.reset(config.settings.arena);
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

  private sprite(
    match: Match,
    side: number,
    blinkDirection = 0,
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
      : this.animate(match, side);
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
    this.scene.consume(match, events);
  }

  draw(match: Match, dt: number, videoBackground = false) {
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.round(960 * ratio),
      height = Math.round(540 * ratio);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.context.clearRect(0, 0, 960, 540);
    this.scene.draw(match, dt, videoBackground);
  }
}
