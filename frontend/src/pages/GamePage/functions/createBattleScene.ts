import { Camera } from "../../../game/camera";
import { STAGE_FORM } from "../../../game/mujica";
import { createMujicaMotion, mujicaBodyOffset } from "../../../game/animation";
import {
  MOVES,
  ROSTER,
  ROUND_END_TIMING,
  type Match,
} from "../../../game/engine";
import type { Assets, SpriteFrame } from "../../../game/objects/Assets";
import type { CombatEvent } from "../../../game/objects/CombatEvent";
import type { Fighter } from "../../../game/objects/Fighter";
import type { Sprite } from "./CanvasRenderer";
import { presentationFor } from "./presentationFor";
import { createStageRenderer } from "./createStageRenderer";
import { createProjectileRenderer } from "./createProjectileRenderer";
import { drawBurger } from "./drawBurger";

type SceneSprite = Sprite & { atlas: HTMLImageElement; facing: number };
type ParticleKind =
  | "burst"
  | "dash"
  | "landing"
  | "guard"
  | "shock"
  | "incantation"
  | "parfaitSplash"
  | "impact"
  | "steelBreak";
interface ParticleEffect {
  type: ParticleKind;
  x: number;
  y: number;
  life: number;
  max: number;
  color: string;
  text: string;
  weight: number;
  direction: number;
  heavy: boolean;
  radius: number;
}
interface BlinkEffect {
  type: "blink";
  side: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  life: number;
  max: number;
  travelMs: number;
  color: string;
  sprite: SceneSprite;
}
type Effect = ParticleEffect | BlinkEffect;

/** Authored stage and combat presentation, ported from the previous game.
 * Visual state is local to a renderer; no drawing method mutates the match.
 */
export function createBattleScene(
  ctx: CanvasRenderingContext2D,
  assets: Assets,
  getImage: (url: string) => HTMLImageElement | undefined,
  spriteFor: (match: Match, side: number, direction: number) => Sprite | null,
) {
  const camera = new Camera(),
    mujicaMotion = createMujicaMotion();
  const colors = ["#f6a4c7", "#65d1ee"];
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stageRenderer = createStageRenderer(
    ctx,
    assets,
    camera,
    getImage,
    reducedMotion,
  );
  const drawWave = createProjectileRenderer(
    ctx,
    assets,
    getImage,
    reducedMotion,
  );
  let match: Match,
    battleArena = 0,
    visualTime = 0;
  let cameraFighter: Fighter | null = null;
  let fx: Effect[] = [],
    flash = 0,
    inkMs = 0,
    inkMax = 200;
  let impactMotion: {
    age: number;
    duration: number;
    power: number;
    direction: number;
  } | null = null;
  function fighterSprite(side: number, direction = 0): SceneSprite | null {
    const sprite = spriteFor(match, side, direction);
    return (
      sprite && {
        ...sprite,
        atlas: sprite.image,
        facing: match.fighters[side].facing,
      }
    );
  }
  function add(
    effect: Pick<ParticleEffect, "type" | "x" | "y" | "life" | "color"> &
      Partial<ParticleEffect>,
  ) {
    fx.push({
      max: effect.life,
      text: "",
      weight: 1,
      direction: 1,
      heavy: false,
      radius: 100,
      ...effect,
    });
  }
  function consumeEvent(event: CombatEvent) {
    const side = event.side ?? event.owner ?? 0,
      f = match.fighters[side];
    const x = event.x ?? f.x,
      y = 438 - (event.y ?? f.y);
    const color = ROSTER[f.character].color;
    const burst = (text: string, tint = color, height = 110, life = 650) =>
      add({
        type: "burst",
        x: f.x,
        y: 438 - f.y - height,
        life,
        color: tint,
        text,
      });
    if (event.type === "roundAdvance" || event.type === "teamAdvance") {
      fx = [];
      flash = inkMs = 0;
      impactMotion = null;
    }
    if (event.type === "result")
      fx = fx.filter((effect) => effect.type !== "blink");
    if (event.type === "attack") {
      const move = MOVES[event.attack ?? ""],
        presentation = presentationFor(assets, f, event.attack ?? null);
      if (presentation?.label && presentation.slot !== "p")
        burst(presentation.label, color, 230, 950);
      if (
        event.attack === "super" ||
        event.attack === "soyoSuper" ||
        move?.category === "super"
      )
        flash = reducedMotion ? 0 : event.attack === "super" ? 150 : 100;
    }
    if (event.type === "dash" || event.type === "blink") {
      if (event.type === "blink") {
        const sprite = fighterSprite(side, event.direction ?? f.facing);
        fx = fx.filter(
          (effect) => effect.type !== "blink" || effect.side !== side,
        );
        if (sprite)
          fx.push({
            type: "blink",
            side,
            fromX: event.fromX ?? f.x,
            fromY: event.fromY ?? f.y,
            toX: f.x,
            toY: f.y,
            sprite,
            life: reducedMotion ? 160 : 260,
            max: reducedMotion ? 160 : 260,
            travelMs: reducedMotion ? 0 : 90,
            color: colors[side],
          });
      }
      add({
        type: "dash",
        x: f.x,
        y: 438 - f.y,
        life: 160,
        direction: event.direction ?? f.facing,
        color: colors[side],
      });
    }
    if (event.type === "landing") {
      add({
        type: "landing",
        x,
        y,
        life: event.heavy ? 420 : 240,
        heavy: !!event.heavy,
        color: "#d5d4ce",
      });
      if (event.heavy && !reducedMotion)
        impactMotion = { age: 0, duration: 150, power: 4, direction: 0 };
    }
    if (event.type === "stageFormStart" || event.type === "stageFormEnd") {
      burst(
        event.type === "stageFormStart"
          ? (ROSTER[f.character].stageName ?? ROSTER[f.character].name)
          : "谢幕",
      );
      if (event.type === "stageFormStart" && !reducedMotion)
        inkMs = inkMax = 720;
    }
    if (
      event.type === "counter" ||
      event.type === "areaPulse" ||
      event.type === "penguinCounter"
    )
      add({
        type: event.type === "areaPulse" ? "shock" : "guard",
        x,
        y,
        life: 450,
        color,
        text:
          event.type === "counter"
            ? "反拨"
            : event.type === "penguinCounter"
              ? "糖哭反击"
              : "",
      });
    if (event.type === "memePulse")
      add({
        type: "incantation",
        x,
        y: y - 35,
        life: 1300,
        color: "#dbabff",
        text: event.glyph ?? "",
        radius: event.radius ?? 100,
      });
    if (event.type === "hardControl")
      add({
        type: "burst",
        x,
        y: y - 70,
        life: 700,
        color: "#ffe5ac",
        text: "硬直 2 秒",
      });
    if (event.type === "beatBoost") burst("四拍强化", "#ddc9ff", 175, 450);
    if (event.type === "tune")
      burst("+" + event.amount + " 共鸣", "#bce9c6", 170, 800);
    if (event.type === "parfaitSplash")
      add({ type: "parfaitSplash", x, y, life: 520, color: "#b4cf60" });
    if (event.type === "penguinStart" || event.type === "penguinEnd")
      burst(event.type === "penguinStart" ? "凑企鹅！" : "恢复原形", "#fff0c6");
    if (event.type === "heal")
      burst("+" + event.amount + " 生命", "#aeefcf", 160, 950);
    if (event.type === "summon") burst("小天素罗 ×3", "#ffe0a0", 120);
    if (event.type === "minionCall")
      add({
        type: "burst",
        x,
        y: y - 85,
        life: 650,
        color: "#ffe0a0",
        text: "哦也！",
      });
    if (event.type === "minionHit")
      add({
        type: "impact",
        x,
        y: y - 35,
        life: 350,
        color: "#ffe0a0",
        weight: 0,
        text: "-" + event.damage,
      });
    if (event.type === "terrainHit")
      add({ type: "burst", x, y, life: 300, color: "#c4d9e5" });
    if (event.type === "shieldHit")
      add({
        type: event.broken && f.character < 5 ? "steelBreak" : "burst",
        x,
        y,
        life: event.broken ? 600 : 350,
        color: "#c4e9ff",
        text:
          (f.character === 13
            ? "节拍屏障"
            : f.character >= 5
              ? "茶会护盾"
              : "钢板") + (event.broken ? "破碎" : " −" + event.absorbed),
      });
    if (event.type === "hit" || event.type === "clash") {
      const tint = event.blocked
        ? "#b1e6ff"
        : event.type === "clash"
          ? "#fff2c4"
          : colors[side];
      const weight = Math.max(0, Math.min(3, event.weight ?? 1));
      add({
        type: event.blocked ? "guard" : "impact",
        x,
        y,
        life: event.blocked ? 220 : 300 + weight * 35,
        weight,
        direction: f.facing,
        color: tint,
        text: event.counter
          ? "COUNTER"
          : event.blocked
            ? "GUARD"
            : event.damage
              ? "-" + event.damage
              : "",
      });
      if (!reducedMotion) {
        const power = event.blocked
          ? 2
          : (2.4 + [1, 1.3, 1.85, 2.8][weight] * 2.2) * 1.5;
        if (!impactMotion || power >= impactMotion.power)
          impactMotion = {
            age: 0,
            duration: event.blocked ? 50 : weight >= 2 ? 200 : 120,
            power,
            direction: f.facing,
          };
        camera.impact({ blocked: event.blocked, x, weight });
      }
      if (!event.blocked && weight >= 2)
        inkMs = inkMax = weight === 3 ? 370 : 200;
      if (event.attack === "super" || event.attack === "soyoSuper")
        add({
          type: "shock",
          x,
          y: 438 - f.y,
          life: 650,
          color: event.attack === "super" ? "#ffa9d2" : "#ffe3a6",
        });
    }
  }
  function drawBlinkTrails(dt: number) {
    for (const effect of fx)
      if (effect.type === "blink") {
        if (!match.paused) effect.life = Math.max(0, effect.life - dt);
        const age = effect.max - effect.life,
          { atlas, frame, scale, facing } = effect.sprite;
        const count = reducedMotion ? 1 : 5;
        for (let i = 0; i < count; i++) {
          const position = i / 5,
            delay = position * effect.travelMs;
          if (age < delay) continue;
          const fade = Math.max(0, 1 - (age - delay) / (effect.max - delay));
          if (!fade) continue;
          const x = effect.fromX + (effect.toX - effect.fromX) * position;
          const y = effect.fromY + (effect.toY - effect.fromY) * position;
          ctx.save();
          ctx.translate(x, 438 - y);
          ctx.scale(facing * scale, scale);
          ctx.globalAlpha = (reducedMotion ? 0.18 : 0.48) * fade * fade;
          ctx.shadowColor = effect.color;
          ctx.shadowBlur = reducedMotion ? 0 : 7;
          ctx.drawImage(
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
          ctx.restore();
        }
      }
  }
  function drawMujicaBody(
    atlas: HTMLImageElement,
    frame: SpriteFrame,
    scale: number,
    motion: { lean: number; lift: number },
  ) {
    // Narrow contiguous bands keep the face intact while the torso follows through.
    // This supplements the authored poses; the bottom quarter is never displaced.
    const strips = 40,
      step = frame.h / strips;
    ctx.save();
    ctx.shadowBlur = 0;
    for (let n = 0; n < strips; n++) {
      const top = n * step,
        bottom = Math.min(frame.h, (n + 1) * step);
      const a = mujicaBodyOffset(motion, (frame.ay - top) / frame.ay);
      const b = mujicaBodyOffset(motion, (frame.ay - bottom) / frame.ay);
      ctx.drawImage(
        atlas,
        frame.x,
        frame.y + top,
        frame.w,
        bottom - top,
        -frame.ax + (a.x + b.x) / (2 * scale),
        -frame.ay + top + a.y / scale,
        frame.w,
        bottom - top + (b.y - a.y) / scale,
      );
    }
    ctx.restore();
  }
  function drawFighter(side: number) {
    const f = match.fighters[side],
      move = MOVES[f.attack ?? ""],
      acting = !f.stun && !f.knockdown && match.phase === "fighting";
    const blink = fx.find(
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
      f.x + (traveling ? (blink.fromX - blink.toX) * remaining : 0);
    const renderY =
      f.y + (traveling ? (blink.fromY - blink.toY) * remaining : 0);
    const sprite = traveling ? blink.sprite : fighterSprite(side);
    if (!sprite) return;
    const { atlas, frame, scale, animation, facing } = sprite;
    const floor = 438,
      surface = match.surfaceBelow(renderX, renderY, f.dropMs),
      shadowY = floor - surface;
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#03111e";
    ctx.beginPath();
    ctx.ellipse(
      renderX,
      shadowY + 3,
      37 - Math.min(12, (f.y - surface) * 0.04),
      9,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = colors[side];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(renderX, shadowY + 1, 31, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    const motion = mujicaMotion(match, side, animation, reducedMotion);
    const isMujica = f.character >= 5 && f.character < 10;
    const bob =
      !isMujica && !f.attack && !f.stun && !f.vx
        ? Math.sin(visualTime * 0.004 + side) * 1.2
        : 0;
    const recoil =
      !reducedMotion && f.stun
        ? Math.min(9, f.stun / 25) * (f.guard ? 0.55 : 1) * -f.facing
        : 0;
    ctx.translate(renderX + recoil, floor - renderY + (traveling ? 0 : bob));
    ctx.scale(facing * scale, scale);
    if (f.attack === "dive" && acting) ctx.rotate(0.18);
    if (!animation && f.crouch && !f.attack && !f.guard) ctx.scale(1.06, 0.87);
    ctx.shadowColor = ["special", "super"].includes(f.attack ?? "")
      ? colors[side]
      : "#051323";
    ctx.shadowBlur = ["special", "super"].includes(f.attack ?? "") ? 16 : 4;
    if (
      !traveling &&
      !reducedMotion &&
      (f.dashMs || (acting && ["thrust", "dive"].includes(f.attack ?? "")))
    ) {
      const trailDirection = f.dashMs ? Math.sign(f.vx) * f.facing : 1;
      for (const distance of [40, 20]) {
        ctx.globalAlpha = distance === 40 ? 0.08 : 0.15;
        ctx.drawImage(
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
      ctx.globalAlpha = 1;
    }
    if (traveling) ctx.globalAlpha = 0.7 + 0.3 * progress;
    if (f.wakeInvuln > 0 && !reducedMotion && Math.floor(visualTime / 50) % 2)
      ctx.globalAlpha = 0.65;
    if (motion && !traveling) drawMujicaBody(atlas, frame, scale, motion);
    else
      ctx.drawImage(
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
    ctx.restore();
    if (
      f.character === 4 &&
      acting &&
      move?.rikiOnly &&
      f.attackMs >= move.start &&
      f.attackMs <= move.end
    ) {
      ctx.save();
      ctx.translate(f.x, floor - f.y - 110);
      ctx.scale(f.facing, 1);
      ctx.strokeStyle = move.boosted ? "#fff0c7" : "#d9c4ff";
      ctx.lineWidth = move.category === "super" ? 5 : 3;
      ctx.globalAlpha = reducedMotion ? 0.4 : 0.7;
      const radius =
        move.category === "super" ? 90 + ((f.attackMs % 320) / 320) * 330 : 65;
      ctx.beginPath();
      ctx.ellipse(25, 0, radius, radius * 0.6, -0.5, -1.8, 1.2);
      ctx.stroke();
      ctx.restore();
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
      ctx.save();
      ctx.translate(f.x, floor - f.y - 95);
      ctx.scale(f.facing, 1);
      ctx.strokeStyle = "#c9f0c3";
      ctx.lineWidth = f.attack === "ranaSuper" ? 4 : 2;
      ctx.globalAlpha = reducedMotion ? 0.3 : 0.65;
      ctx.shadowColor = "#b9e8c3";
      ctx.shadowBlur = reducedMotion ? 0 : 12;
      if (f.attack === "ranaSuper" && active) {
        const radius = 80 + ((f.attackMs % 300) / 300) * 330;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.ellipse(20, 0, radius - i * 18, 70 + i * 20, 0, -1.5, 1.5);
          ctx.stroke();
        }
      } else if (f.attack === "ranaTune") {
        ctx.beginPath();
        ctx.ellipse(
          0,
          95,
          35 + Math.sin(visualTime * 0.008) * 3,
          8,
          0,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      } else if (active) {
        ctx.beginPath();
        ctx.arc(30, f.attack === "ranaSlide" ? 65 : -10, 65, -1.8, 1.1);
        ctx.stroke();
      }
      ctx.restore();
    }
    // Side colours also distinguish mirror matches.
    if (match.grounded(f) && !f.stun && !f.attack && match.phase === "idle") {
      ctx.fillStyle = colors[side];
      ctx.font = 'bold 9px "Segoe UI",sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(ROSTER[f.character].en, f.x, shadowY + 23);
    }
  }
  function drawSoyoEffect(side: number) {
    const f = match.fighters[side],
      move = MOVES[f.attack ?? ""],
      t = f.attackMs;
    if (f.character !== 1 || match.phase !== "fighting" || f.stun || !move)
      return;
    ctx.save();
    ctx.translate(f.x, 438 - f.y);
    if (f.attack === "soyoCutline") {
      ctx.scale(f.facing, 1);
      ctx.lineCap = "round";
      ctx.shadowColor = "#f6d6a4";
      ctx.shadowBlur = reducedMotion ? 0 : 12;
      if (t < move.start) {
        const ready = t / move.start;
        ctx.strokeStyle = "#f4dbb8";
        ctx.lineWidth = 1.4;
        ctx.globalAlpha = 0.25 + ready * 0.45;
        for (const slope of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(28, -112 + slope * 13);
          ctx.lineTo(65 + ready * 36, -112 - slope * 30);
          ctx.stroke();
        }
      }
      for (let i = 0; i < move.pulses!.length; i++) {
        const age = t - move.pulses![i].at;
        if (age < 0 || age > 290) continue;
        const growth = Math.min(1, age / 75),
          fade = 1 - age / 290;
        const end = 42 + (move.reach! - 42) * growth,
          slope = i ? -1 : 1;
        const startY = -112 + slope * 49,
          endY = -112 - slope * 49;
        ctx.globalAlpha = fade * 0.95;
        for (const [width, color] of [
          [10, "#e4b77b44"],
          [4, "#e8bf84"],
          [1.4, "#fff6df"],
        ] as const) {
          ctx.lineWidth = width;
          ctx.strokeStyle = color;
          ctx.beginPath();
          ctx.moveTo(42, startY);
          ctx.lineTo(end, startY + (endY - startY) * growth);
          ctx.stroke();
        }
        ctx.strokeStyle = "#fff4d7";
        ctx.lineWidth = 1.5;
        const cutX = end - 18,
          cutY = startY + (endY - startY) * growth;
        ctx.beginPath();
        ctx.moveTo(cutX - 7, cutY - 9);
        ctx.lineTo(cutX + 7, cutY + 9);
        ctx.moveTo(cutX - 7, cutY + 9);
        ctx.lineTo(cutX + 7, cutY - 9);
        ctx.stroke();
        if (!reducedMotion)
          for (let n = 0; n < 5; n++) {
            ctx.globalAlpha = fade * 0.65;
            ctx.fillStyle = "#ffebbf";
            const x = 65 + ((end - 65) * n) / 5,
              y = startY + ((endY - startY) * n) / 5;
            ctx.fillRect(
              x + age * 0.035,
              y + Math.sin(n * 2) * age * 0.06,
              3,
              2,
            );
          }
      }
    } else if (f.attack === "heal") {
      const progress = Math.min(1, t / move.start),
        fade = t > 950 ? (move.duration - t) / 250 : 1;
      ctx.strokeStyle = "#a4e8c7";
      ctx.fillStyle = "#d5ffe7";
      ctx.lineWidth = 1.8;
      ctx.shadowColor = "#87dcb7";
      ctx.shadowBlur = reducedMotion ? 0 : 10;
      ctx.globalAlpha = 0.65 * fade;
      ctx.beginPath();
      ctx.ellipse(0, -4, 36 + progress * 12, 9, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(
        0,
        -145,
        25 + progress * 13,
        -Math.PI / 2,
        -Math.PI / 2 + progress * Math.PI * 2,
      );
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const phase = (t / 1000 + i / 6) % 1,
          x = Math.sin(i * 2.4 + t / 500) * 40,
          y = -30 - phase * 170;
        ctx.globalAlpha = Math.sin(phase * Math.PI) * 0.75 * fade;
        ctx.fillRect(x - 1, y - 4, 2, 8);
        ctx.fillRect(x - 4, y - 1, 8, 2);
      }
    } else if (
      ["light", "heavy", "special", "summon"].includes(f.attack ?? "") &&
      t >= move.start &&
      t < move.end + 110
    ) {
      const phase = (t - move.start) / (move.end + 110 - move.start);
      ctx.scale(f.facing, 1);
      ctx.strokeStyle = f.attack === "summon" ? "#f2d398" : "#b2dce4";
      ctx.globalAlpha = (1 - phase) * 0.7;
      ctx.lineWidth = f.attack === "heavy" ? 3 : 1.5;
      ctx.beginPath();
      ctx.ellipse(
        65 + phase * 45,
        -125,
        12 + phase * 15,
        28 + phase * 25,
        -0.15,
        -0.9,
        1.5,
      );
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawOffenseEffect(side: number) {
    const f = match.fighters[side],
      t = f.attackMs;
    if (
      match.phase !== "fighting" ||
      f.stun ||
      !["thrust", "rush", "dive"].includes(f.attack ?? "")
    )
      return;
    ctx.save();
    ctx.translate(f.x, 438 - f.y);
    ctx.scale(f.facing, 1);
    ctx.strokeStyle = "#ffc0e1";
    ctx.shadowColor = "#ff87c4";
    ctx.shadowBlur = 13;
    ctx.lineWidth = 2;
    if (f.attack === "thrust" && t < 280) {
      for (let i = 0; i < 5; i++) {
        const y = -45 - i * 30;
        ctx.globalAlpha = 0.65 - i * 0.08;
        ctx.beginPath();
        ctx.moveTo(-80 - i * 6, y);
        ctx.lineTo(35 - i * 6, y - 4);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = "#fff0f9";
      ctx.beginPath();
      ctx.moveTo(80, -130);
      ctx.lineTo(105, -112);
      ctx.lineTo(80, -94);
      ctx.lineTo(88, -112);
      ctx.closePath();
      ctx.fill();
    } else if (f.attack === "rush" && t < 650) {
      const beat = t < 250 ? 0 : t < 460 ? 1 : 2,
        pulse = MOVES.rush.pulses![beat];
      const strength = Math.max(0.15, 1 - Math.abs(t - pulse.at) / 140);
      ctx.globalAlpha = strength;
      ctx.lineWidth = 3 + beat;
      ctx.beginPath();
      ctx.ellipse(
        55,
        -110,
        40 + beat * 8,
        60 + beat * 9,
        -0.4 + beat * 0.25,
        -1.4,
        1.3,
      );
      ctx.stroke();
      ctx.scale(f.facing, 1);
      ctx.fillStyle = "#ffdbed";
      ctx.textAlign = "center";
      ctx.font = 'bold italic 12px "Segoe UI",sans-serif';
      ctx.fillText(beat + 1 + " / 3 BEAT", 0, -245);
    } else if (f.attack === "dive") {
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.75;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-65 + i * 19, -210 - i * 4);
        ctx.lineTo(-25 + i * 20, -110 + i * 10);
        ctx.stroke();
      }
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#c8edff";
      ctx.beginPath();
      ctx.arc(25, -25, 35, -0.8, 1.2);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawSuperAura() {
    const view = camera.viewport();
    for (const f of match.fighters) {
      if (f.hardStun > 0 && match.phase === "fighting") {
        ctx.save();
        ctx.translate(f.x, 438 - f.y - 245);
        ctx.strokeStyle = "#ffe1a0";
        ctx.fillStyle = "#fff0cb";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 30, 9, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        for (let i = 0; i < 3; i++) {
          const a = visualTime / 250 + (i * Math.PI * 2) / 3;
          ctx.fillText("✦", Math.cos(a) * 30, Math.sin(a) * 9 + 4);
        }
        const sealed = match.fighters.some(
          (source) => source.binding?.target === match.fighters.indexOf(f),
        );
        ctx.fillText(
          sealed ? "封印锁定" : "硬直 " + (f.hardStun / 1000).toFixed(1) + "s",
          0,
          -15,
        );
        ctx.restore();
      }
      if (f.soyoSuper && match.phase === "fighting") {
        const cast = f.soyoSuper,
          age = MOVES.soyoSuper.duration - cast.ms - MOVES.soyoSuper.start;
        if (age <= 700) {
          ctx.save();
          ctx.translate(cast.x, 438 - cast.y);
          ctx.strokeStyle = "#ffe3a6";
          ctx.fillStyle = "#ffe3a612";
          ctx.shadowColor = "#e8ac52";
          ctx.shadowBlur = reducedMotion ? 0 : 14;
          ctx.globalAlpha = cast.released
            ? Math.min(1, Math.max(0, (700 - age) / 250))
            : 0.35;
          const radius = cast.released
            ? Math.max(1, cast.radius)
            : 30 + Math.sin(visualTime / 90) * 5;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.globalAlpha *= 0.5;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, radius * 0.82, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
      if (f.attack !== "super" || match.phase !== "fighting") continue;
      const t = f.attackMs,
        intensity = Math.min(1, t / 500) * Math.min(1, (2600 - t) / 400);
      ctx.save();
      ctx.fillStyle = `rgba(12,6,24,${0.4 * intensity})`;
      ctx.fillRect(view.left, view.top, view.width, view.height);
      const glow = ctx.createRadialGradient(
        f.x,
        438 - f.y - 160,
        15,
        f.x,
        438 - f.y - 160,
        370,
      );
      glow.addColorStop(0, "#ffbcdf70");
      glow.addColorStop(0.65, "#e54da42a");
      glow.addColorStop(1, "#ffb1d800");
      ctx.fillStyle = glow;
      ctx.fillRect(view.left, view.top, view.width, view.height);
      ctx.strokeStyle = "#ffb7d9";
      ctx.shadowColor = "#ff70bd";
      ctx.shadowBlur = 18;
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const r = 45 + ((t * 0.12 + i * 65) % 200);
        ctx.globalAlpha = intensity * (1 - r / 270);
        ctx.beginPath();
        ctx.ellipse(f.x, 439 - f.y, r, r * 0.2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (!reducedMotion)
        for (let i = 0; i < 14; i++) {
          const x = f.x + Math.sin(i * 2.4) * 180,
            y = 440 - f.y - ((t * 0.25 + i * 39) % 350);
          ctx.globalAlpha = intensity * 0.6;
          ctx.fillStyle = "#ffd0e6";
          ctx.fillRect(x, y, 2, 9);
        }
      ctx.restore();
    }
  }
  function drawShield(side: number) {
    const f = match.fighters[side],
      steel = f.shield;
    if (!steel || match.phase !== "fighting") return;
    if (f.character >= 5) {
      ctx.save();
      ctx.translate(f.x + f.facing * 58, 438 - f.y - 110);
      ctx.globalAlpha = Math.min(1, steel.ms / 200);
      ctx.strokeStyle = f.character === 13 ? "#ff91d6" : "#e1d7ff";
      ctx.fillStyle = "#adbbef25";
      ctx.shadowColor = "#d4caff";
      ctx.shadowBlur = reducedMotion ? 0 : steel.hitMs ? 22 : 8;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, 28, 106, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 1;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(-22, i * 20);
        ctx.lineTo(22, i * 20);
        ctx.stroke();
      }
      ctx.font = "28px Georgia";
      ctx.textAlign = "center";
      ctx.fillStyle = "#f0eaff";
      ctx.fillText("♪", 0, 10);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#182539";
      ctx.fillRect(-27, -130, 54, 5);
      ctx.fillStyle = "#dad3ff";
      ctx.fillRect(-27, -130, (54 * steel.hp) / 24, 5);
      ctx.font = 'bold 10px "Segoe UI",sans-serif';
      ctx.fillText(
        (f.character === 13 ? "节拍 " : "茶会 ") + steel.hp,
        0,
        -138,
      );
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.translate(f.x + f.facing * 58, 438 - f.y);
    ctx.scale(f.facing, 1);
    ctx.globalAlpha = Math.min(1, steel.ms / 200);
    ctx.shadowColor = "#aee6ff";
    ctx.shadowBlur = steel.hitMs ? 22 : 7;
    const metal = ctx.createLinearGradient(-23, 0, 24, 0);
    metal.addColorStop(0, "#394956");
    metal.addColorStop(0.12, "#dae7ef");
    metal.addColorStop(0.3, "#8899a8");
    metal.addColorStop(0.65, "#abbac5");
    metal.addColorStop(1, "#4a5f70");
    ctx.fillStyle = metal;
    ctx.strokeStyle = "#e0eff7";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-23, -222);
    ctx.lineTo(23, -211);
    ctx.lineTo(23, -12);
    ctx.lineTo(-23, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#283d4e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-17, -211);
    ctx.lineTo(-17, -12);
    ctx.stroke();
    ctx.strokeStyle = "#e6f1f530";
    ctx.lineWidth = 1;
    for (let y = -200; y < -15; y += 5) {
      ctx.beginPath();
      ctx.moveTo(-12, y);
      ctx.lineTo(18, y + 2);
      ctx.stroke();
    }
    for (const y of [-199, -27])
      for (const x of [-11, 12]) {
        ctx.fillStyle = "#344b5d";
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#dae6ee";
        ctx.fillRect(x - 1, y - 2, 2, 1);
      }
    ctx.strokeStyle = "#e7b46f";
    ctx.lineWidth = 5;
    for (let y = -185; y < -40; y += 26) {
      ctx.beginPath();
      ctx.moveTo(18, y);
      ctx.lineTo(18, y + 12);
      ctx.stroke();
    }
    if (steel.hp < 20) {
      ctx.strokeStyle = "#263947";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-8, -160);
      ctx.lineTo(5, -137);
      ctx.lineTo(-5, -120);
      ctx.lineTo(11, -96);
      ctx.lineTo(0, -73);
      ctx.stroke();
    }
    if (steel.hitMs) {
      ctx.fillStyle = `rgba(235,249,255,${steel.hitMs / 250})`;
      ctx.fillRect(-15, -205, 31, 190);
    }
    ctx.scale(f.facing, 1);
    ctx.fillStyle = "#152c40";
    ctx.fillRect(-27, -240, 54, 6);
    ctx.fillStyle = steel.hp > 15 ? "#bde8fc" : "#ffc475";
    ctx.fillRect(-27, -240, (54 * steel.hp) / MOVES.shield.durability!, 6);
    ctx.fillStyle = "#e0f5ff";
    ctx.textAlign = "center";
    ctx.font = 'bold 10px "Segoe UI",sans-serif';
    ctx.fillText("钢板 " + steel.hp, 0, -248);
    ctx.restore();
  }
  function drawSummons() {
    const art = assets.soyoTensora,
      tensoraAtlas = getImage(art.atlas);
    if (!tensoraAtlas) return;
    for (const [side, f] of match.fighters.entries()) {
      const group = f.summons;
      if (!group) continue;
      for (const p of group.units) {
        const age = 10000 - group.ms,
          bob =
            Math.abs(Math.sin(visualTime * 0.012 + p.id * 1.8)) *
            (p.phase === "charge" ? 12 : 6);
        const index =
          p.hitMs > 0
            ? 3
            : p.phase === "charge"
              ? 2
              : Math.floor(visualTime / 160 + p.id) % 2;
        const frame = art.frames[index],
          scale = (frame.height ?? 72) / frame.h;
        const surface = match.surfaceBelow(p.x, p.y),
          ground = 438 - surface;
        ctx.save();
        ctx.globalAlpha = Math.min(1, age / 160, group.ms / 400);
        ctx.fillStyle = "#09101c66";
        ctx.beginPath();
        ctx.ellipse(p.x, ground + 3, 21, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = colors[side];
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(p.x, ground + 2, 19, 4, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.translate(p.x, 438 - p.y - bob);
        ctx.scale(p.facing * scale, scale);
        ctx.shadowColor = "#e9ba64";
        ctx.shadowBlur = p.hitMs ? 10 : 2;
        ctx.drawImage(
          tensoraAtlas,
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
        ctx.save();
        ctx.globalAlpha = Math.min(1, age / 160, group.ms / 400);
        ctx.translate(p.x, 438 - p.y - bob - 82);
        ctx.fillStyle = "#111726df";
        ctx.fillRect(-23, -3, 46, 6);
        ctx.fillStyle = p.hp <= 6 ? "#ef8d8d" : "#f1d38c";
        ctx.fillRect(-22, -2, (44 * p.hp) / p.maxHp, 4);
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff0cf";
        ctx.fillText(p.hp + "/" + p.maxHp, 0, -7);
        ctx.restore();
      }
    }
  }
  function drawMaskAura(f: Fighter) {
    if (
      match.phase !== "fighting" ||
      f.character < 5 ||
      f.character > 9 ||
      !f.stageForm
    )
      return;
    const age = STAGE_FORM.duration - f.stageForm.ms;
    if (age < 0 || f.hp <= 0) return;
    const fade = Math.min(1, f.stageForm.ms / 700),
      pulse = reducedMotion ? 0 : Math.sin(visualTime * 0.003 + f.character),
      burst = Math.min(1, age / 650);
    const color = ROSTER[f.character].color,
      strength = (1 - burst) * (reducedMotion ? 0.35 : 1);
    ctx.save();
    ctx.translate(f.x, 438 - f.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    // A restrained aura stays behind the art for the full transformed state.
    const glow = ctx.createRadialGradient(0, -110, 20, 0, -110, 175);
    glow.addColorStop(0, color + "00");
    glow.addColorStop(0.5, color + "28");
    glow.addColorStop(1, color + "00");
    ctx.globalAlpha = fade * (0.8 + pulse * 0.15);
    ctx.fillStyle = glow;
    ctx.fillRect(-180, -290, 360, 300);
    ctx.shadowColor = color;
    ctx.shadowBlur = reducedMotion ? 0 : 12;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = fade * 0.55;
    for (const radius of [52, 65]) {
      ctx.beginPath();
      ctx.ellipse(0, -2, radius, radius * 0.22, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    for (let i = 0; i <= 5; i++) {
      const angle =
        -Math.PI / 2 +
        (i * 4 * Math.PI) / 5 +
        (reducedMotion ? 0 : visualTime * 0.00015);
      const x = Math.cos(angle) * 50,
        y = Math.sin(angle) * 11 - 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Rising ribbons frame the silhouette and fade out with the form timer.
    if (!reducedMotion) {
      for (let i = 0; i < 6; i++) {
        const rise = (age * 0.09 + i * 41) % 240,
          x = (i % 2 ? 1 : -1) * (48 + Math.sin(rise * 0.018 + i) * 12);
        ctx.globalAlpha = fade * Math.sin((rise / 240) * Math.PI) * 0.5;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, -rise);
        ctx.quadraticCurveTo(x + (i % 2 ? 18 : -18), -rise - 25, x, -rise - 52);
        ctx.stroke();
      }
    }
    // The opening shockwave matches the immediate, single damaging H burst.
    if (age < 650) {
      ctx.globalAlpha = strength;
      ctx.lineWidth = 5 * (1 - burst) + 1;
      const radius = 35 + burst * (MOVES.mujicaTransform.reach! - 35);
      ctx.beginPath();
      ctx.ellipse(0, -100, radius, radius * 0.82, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = strength * 0.65;
      ctx.beginPath();
      ctx.ellipse(0, -2, radius * 1.2, radius * 0.22, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (!reducedMotion)
        for (let i = 0; i < 16; i++) {
          const angle = i * 2.39996,
            near = 40 + burst * 110,
            far = near + 30 + (i % 4) * 12;
          ctx.strokeStyle = i % 3 ? color : "#fff0dd";
          ctx.lineWidth = i % 2 ? 2 : 3;
          ctx.beginPath();
          ctx.moveTo(
            Math.cos(angle) * near,
            -100 + Math.sin(angle) * near * 0.82,
          );
          ctx.lineTo(
            Math.cos(angle) * far,
            -100 + Math.sin(angle) * far * 0.82,
          );
          ctx.stroke();
        }
    }
    ctx.restore();
  }
  function drawMujicaEffects() {
    if (match.phase !== "fighting") return;
    for (const area of match.areas) {
      const profile = ROSTER[match.fighters[area.owner].character],
        y = 438 - area.y;
      ctx.save();
      ctx.strokeStyle = profile.color;
      ctx.fillStyle = profile.color + "25";
      ctx.lineWidth = 2;
      ctx.globalAlpha = area.fired
        ? Math.max(0, area.life / 100)
        : 0.45 + Math.sin(visualTime * 0.025) * 0.2;
      if (MOVES[area.attack].mortis === "snare") {
        ctx.strokeStyle = "#d8eab4";
        ctx.beginPath();
        ctx.ellipse(area.x, y, area.radius, 22, 0, 0, Math.PI * 2);
        ctx.stroke();
        for (const direction of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(area.x + direction * area.radius, y - 230);
          ctx.lineTo(area.x - direction * 30, y - (area.fired ? 120 : 12));
          ctx.stroke();
        }
        ctx.restore();
        continue;
      }
      if (profile.band === "mewtype") {
        ctx.strokeRect(area.x - area.radius, y - 12, area.radius * 2, 24);
        const rise = area.fired ? 160 : 20 + 40 * (1 - area.warning / 600);
        for (let i = -1; i <= 1; i++) {
          const x = area.x + i * area.radius * 0.6;
          ctx.fillRect(x - 25, y - rise, 50, rise);
          ctx.strokeRect(x - 25, y - rise, 50, rise);
          ctx.beginPath();
          ctx.moveTo(x - 17, y - rise + 12);
          ctx.lineTo(x + 17, y - rise + 12);
          ctx.stroke();
        }
        ctx.restore();
        continue;
      }
      ctx.beginPath();
      ctx.ellipse(area.x, y, area.radius, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const rise = area.fired ? 180 : 20 + 55 * (1 - area.warning / 600);
      for (let i = -2; i <= 2; i++) {
        const x = area.x + (i * area.radius) / 3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - rise);
        ctx.stroke();
      }
      ctx.restore();
    }
    for (const f of match.fighters) {
      if (f.character < 5) continue;
      const profile = ROSTER[f.character],
        move = MOVES[f.attack ?? ""];
      ctx.save();
      ctx.translate(f.x, 438 - f.y);
      ctx.strokeStyle = profile.color;
      ctx.fillStyle = profile.color;
      if (
        !move ||
        move.ownerCharacter! !== f.character ||
        f.stun ||
        !move.slot
      ) {
        ctx.restore();
        continue;
      }
      const age = f.attackMs,
        active = age >= move.start && age <= move.end;
      ctx.scale(f.facing, 1);
      ctx.lineWidth = active ? 3 : 1.5;
      ctx.globalAlpha = active ? 0.8 : 0.28;
      ctx.shadowColor = profile.color;
      ctx.shadowBlur = reducedMotion ? 0 : active ? 12 : 3;
      if (move.mortis) {
        const ghost = (
          offset: number,
          form: string,
          pose: string,
          alpha: number,
        ) => {
          const art = assets.mujicaForms[8]?.[form],
            image = art && getImage(art.atlas),
            frame = art?.frames.find((frame) => frame.name === pose);
          if (!image || !frame) return;
          const scale = 235 / frame.h;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.shadowBlur = 0;
          ctx.drawImage(
            image,
            frame.x,
            frame.y,
            frame.w,
            frame.h,
            offset - frame.ax * scale,
            -frame.ay * scale,
            frame.w * scale,
            frame.h * scale,
          );
          ctx.restore();
        };
        if (move.mortis === "toddler") {
          const pulse = Math.min(1, age / move.end);
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.ellipse(
              0,
              -115,
              45 + pulse * 180 - i * 20,
              35 + pulse * 70,
              0,
              0,
              Math.PI * 2,
            );
            ctx.stroke();
          }
        } else if (move.mortis === "scream") {
          ctx.strokeStyle = "#c4edb4";
          ctx.lineWidth = 2;
          for (let i = 0; i < 3; i++) {
            const radius =
              24 + i * 17 + (reducedMotion ? 0 : (age * 0.08) % 17);
            ctx.globalAlpha = (active ? 0.65 : 0.2) * (1 - i * 0.2);
            ctx.beginPath();
            ctx.ellipse(0, -145, radius, radius * 1.2, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else if (move.mortis === "burger") {
          if (age < move.start) drawBurger(ctx, 65, -150, 0.6);
        } else if (move.mortis === "double" || move.mortis === "theater") {
          const theater = move.mortis === "theater",
            offsets = theater ? [-180, 180] : [150, 270];
          offsets.forEach((offset, index) => {
            ghost(
              offset,
              index ? "stage" : "normal",
              theater && index ? "super-impact" : "idle",
              active ? 0.5 : 0.18,
            );
            ctx.beginPath();
            ctx.moveTo(offset - 35, -350);
            ctx.lineTo(offset - 25, -140);
            ctx.moveTo(offset + 35, -350);
            ctx.lineTo(offset + 25, -140);
            ctx.stroke();
          });
          if (theater) {
            ctx.beginPath();
            ctx.ellipse(0, -90, move.reach!, 170, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else if (move.mortis === "parry") {
          ghost(-55, "normal", "idle", 0.22);
          ctx.beginPath();
          ctx.ellipse(20, -115, 62, 108, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-20, -90);
          ctx.quadraticCurveTo(15, -60, 50, -90);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -240);
          ctx.lineTo(130, -80);
          ctx.lineTo(30, -200);
          ctx.stroke();
        }
      } else if (move.counter) {
        ctx.beginPath();
        ctx.ellipse(38, -105, 34, 85, 0, -0.5 * Math.PI, 0.5 * Math.PI);
        ctx.stroke();
      } else if (move.targetArea && f.attackTarget) {
        ctx.save();
        ctx.scale(f.facing, 1);
        const center = f.binding ?? f.attackTarget,
          tx = center.x - f.x,
          ty = f.y - center.y,
          radius = f.binding ? 125 : move.areaRadius!,
          progress = Math.min(1, age / move.start),
          glyphs = "临兵斗者皆阵列在前",
          pulseAge = age - (move.pulses?.[f.hitMarks.at(-1) ?? 0]?.at ?? 0),
          flash = pulseAge >= 0 ? Math.max(0, 1 - pulseAge / 220) : 0;
        ctx.strokeStyle = "#e3a6ff";
        ctx.fillStyle = "#bc63fb";
        ctx.shadowColor = "#ce78ff";
        ctx.globalAlpha = f.binding ? 0.85 : 0.25 + progress * 0.2;
        // Two rings and eight surrounding talismans give the seal depth on every side.
        for (const height of [0, -255 * progress]) {
          ctx.beginPath();
          ctx.ellipse(tx, ty + height, radius, 26, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.font = "bold 24px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4 + Math.PI / 8,
            px = tx + Math.cos(angle) * radius,
            py = ty - 125 * progress + Math.sin(angle) * 30;
          ctx.save();
          ctx.translate(px, py);
          ctx.fillStyle = "#280e3bb8";
          ctx.fillRect(-18, -105 * progress, 36, 210 * progress);
          ctx.strokeRect(-18, -105 * progress, 36, 210 * progress);
          ctx.fillStyle = "#f3d8ff";
          ctx.fillText(glyphs[i], 0, 0);
          ctx.restore();
        }
        if (f.binding) {
          ctx.globalAlpha = 0.35 + flash * 0.6;
          ctx.lineWidth = 2 + flash * 3;
          // A different direction closes inward on each of the nine strikes.
          for (let i = 0; i < 4; i++) {
            const angle = ((f.hitMarks.length + i * 2) * Math.PI) / 4,
              dx = Math.cos(angle) * radius,
              dy = Math.sin(angle) * 115;
            ctx.beginPath();
            ctx.moveTo(tx + dx, ty - 120 + dy);
            ctx.lineTo(tx + dx * (1 - flash), ty - 120 + dy * (1 - flash));
            ctx.stroke();
          }
        }
        // The caster's ward lasts for the entire animation, including startup/recovery.
        ctx.globalAlpha = 0.7;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, -115, 57, 125, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#f3d8ff";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText("减伤 80%", 0, -260);
        ctx.restore();
      } else if (!move.delayedArea && !move.durability!) {
        const reach = Math.min(move.reach || 170, 420),
          p = Math.min(1, age / Math.max(1, move.end));
        if (f.character === 10) {
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.ellipse(
              35 + (i * reach) / 4,
              -125,
              12 + i * 12 + p * 14,
              24 + i * 18,
              0,
              -1.25,
              1.25,
            );
            ctx.stroke();
          }
        } else if (f.character === 12) {
          for (let i = 0; i < 3; i++) {
            ctx.save();
            ctx.translate(40 + (i * reach) / 4, -150 + i * 20);
            ctx.rotate(-0.18 + i * 0.12);
            ctx.strokeRect(0, 0, 48, 65);
            for (let j = 0; j < 3; j++) {
              ctx.beginPath();
              ctx.moveTo(8, 12 + j * 15);
              ctx.lineTo(38, 12 + j * 15);
              ctx.stroke();
            }
            ctx.restore();
          }
        } else if (f.character === 13) {
          for (let i = 0; i < 9; i++) {
            const h = 12 + (1 + Math.sin(age * 0.025 + i * 0.9)) * 32;
            ctx.fillRect(25 + (i * reach) / 11, -95 - h / 2, 8, h);
          }
        } else if (f.character === 6) {
          // Piano keys fan out from the conductor's hands.
          for (let i = 0; i < 7; i++) {
            const x = 30 + (i * reach) / 9,
              y = -125 + Math.sin(i * 0.65 + p * 2) * 25;
            ctx.fillRect(x, y, 10, i % 3 ? 27 : 18);
          }
        } else if (f.character === 9) {
          // Drum hits form paired rings; the stage kit uses a faster eight-beat roll.
          const beat =
            (age % (f.stageForm ? 120 : 180)) / (f.stageForm ? 120 : 180);
          for (const offset of [-28, 28]) {
            ctx.beginPath();
            ctx.ellipse(
              60 + reach * 0.3,
              -105 + offset,
              20 + beat * 55,
              12 + beat * 24,
              -0.35,
              0,
              Math.PI * 2,
            );
            ctx.stroke();
          }
        } else {
          const low = move.level === "low",
            high = move.level === "high",
            y = low ? -35 : high ? -165 : -105;
          for (let i = 0; i < (f.character === 5 ? 4 : 6); i++) {
            ctx.beginPath();
            ctx.moveTo(28, y + i * 5);
            ctx.quadraticCurveTo(
              reach * 0.55,
              y - (f.character === 7 ? 65 : 25) + i * 9,
              reach,
              y + i * 5,
            );
            ctx.stroke();
          }
          if (move.pull) {
            ctx.beginPath();
            ctx.arc(reach, y, 15, -0.5, 2.6);
            ctx.stroke();
          }
        }
        if (move.category === "super") {
          ctx.globalAlpha *= 0.55;
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.ellipse(
              90,
              -100,
              50 + i * 38 + p * 25,
              85 + i * 16,
              -0.3,
              -0.8,
              2,
            );
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }
  }
  function drawFx(dt: number) {
    for (const effect of fx) {
      if (effect.type === "blink") continue;
      if (!match.paused) effect.life -= dt;
      const progress = 1 - effect.life / effect.max;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - progress);
      ctx.translate(effect.x, effect.y);
      ctx.strokeStyle = effect.color;
      ctx.fillStyle = effect.color;
      ctx.shadowColor = effect.color;
      ctx.shadowBlur = 16;
      if (effect.type === "incantation") {
        const radius = effect.radius * (0.72 + progress * 0.28);
        ctx.save();
        ctx.scale(1, 0.32);
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.rotate((effect.max - effect.life) * (reducedMotion ? 0 : 0.001));
        ctx.beginPath();
        for (let i = 0; i <= 9; i++) {
          const angle = (i * Math.PI * 8) / 9;
          const x = Math.cos(angle) * radius,
            y = Math.sin(angle) * radius;
          if (!i) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      } else if (effect.type === "landing") {
        ctx.shadowBlur = 0;
        for (let i = 0; i < (effect.heavy ? 12 : 7); i++) {
          const direction = i % 2 ? -1 : 1,
            distance = progress * (30 + (i % 5) * 20);
          ctx.globalAlpha = Math.max(0, 1 - progress) * 0.55;
          ctx.beginPath();
          ctx.ellipse(
            direction * distance,
            -Math.sin(progress * Math.PI) * (5 + (i % 3) * 9),
            6 + progress * 12,
            2 + progress * 4,
            0,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      } else if (effect.type === "dash") {
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
          const x = -effect.direction * (i * 9 + progress * 40),
            y = -4 - i * 3;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - effect.direction * (12 + progress * 20), y - 3);
          ctx.stroke();
        }
      } else if (effect.type === "parfaitSplash") {
        ctx.shadowBlur = 0;
        for (let i = 0; i < 15; i++) {
          const angle = i * 2.4,
            dist = 8 + progress * (35 + (i % 4) * 10);
          const x = Math.cos(angle) * dist,
            y =
              Math.sin(angle) * dist - progress * 18 + progress * progress * 38;
          ctx.fillStyle = [
            "#a1ba45",
            "#fff0c6",
            "#e95d58",
            "#f4d278",
            "#79513a",
          ][i % 5];
          ctx.beginPath();
          ctx.ellipse(
            x,
            y,
            3 + (i % 3) * 2,
            2 + (i % 2) * 2,
            angle,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      } else if (effect.type === "impact") {
        ctx.save();
        ctx.rotate(-0.4 * effect.direction);
        const size = (18 + effect.weight * 9) * (0.65 + progress * 1.8);
        const age = (effect.max - effect.life) / 1000,
          power = [1, 1.3, 1.85, 2.8][effect.weight];
        if (effect.weight >= 2 && age < 0.17) {
          ctx.globalAlpha *= (1 - age / 0.17) * (reducedMotion ? 0.25 : 0.8);
          for (let i = 0; i < 9; i++) {
            const angle = i * 2.4,
              near = 55,
              far = (240 + effect.weight * 65) * (0.7 + (i % 3) * 0.15);
            ctx.lineWidth = i % 2 ? 3 : 5;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * near, Math.sin(angle) * near);
            ctx.lineTo(Math.cos(angle) * far, Math.sin(angle) * far);
            ctx.stroke();
          }
          ctx.globalAlpha = Math.max(0, 1 - progress);
        }
        for (let i = 0; i < 20 + effect.weight * 4; i++) {
          const angle = i * 2.39996,
            length = (12 + effect.weight * 10) * (1 - progress);
          ctx.lineWidth = (i % 2 ? 2 : 4) * (1 - progress) + 1;
          const distance =
            ((650 + (i % 7) * 95) * power * (1 - Math.exp(-5 * age))) / 5;
          const x =
              Math.cos(angle) * distance * 1.2 +
              effect.direction * age * power * 100,
            y = Math.sin(angle) * distance * 0.65 + age * age * 200;
          ctx.strokeStyle = i % 3 ? effect.color : "#fff4da";
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(
            x + Math.cos(angle) * length * 0.3,
            y + Math.sin(angle) * length * 0.3,
          );
          ctx.stroke();
          if (i % 5 === 0) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle + progress * 4);
            ctx.fillRect(-2, -3, 4, 6);
            ctx.restore();
          }
        }
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha *= Math.max(0, 1 - progress * 2);
        ctx.beginPath();
        ctx.moveTo(-size * 0.7, 0);
        ctx.lineTo(0, -size * 0.4);
        ctx.lineTo(size * 0.7, 0);
        ctx.lineTo(0, size * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (effect.type === "steelBreak") {
        for (let i = 0; i < 8; i++) {
          const angle = i * 2.4;
          ctx.save();
          ctx.translate(
            Math.cos(angle) * progress * 80,
            Math.sin(angle) * progress * 80 + progress * progress * 65,
          );
          ctx.rotate(angle + progress * 5);
          ctx.fillRect(-3, -6, 6, 12);
          ctx.restore();
        }
      } else if (effect.type === "shock") {
        ctx.lineWidth = 5 * (1 - progress) + 1;
        ctx.beginPath();
        ctx.ellipse(
          0,
          0,
          40 + progress * 300,
          8 + progress * 45,
          0,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      } else if (effect.type === "guard") {
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(
          0,
          0,
          12 + progress * 18,
          38 + progress * 10,
          0,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      } else {
        for (let i = 0; i < 10; i++) {
          const angle = (i / 10) * Math.PI * 2,
            dist = 9 + progress * 48;
          ctx.lineWidth = i % 2 ? 1.5 : 3;
          ctx.beginPath();
          ctx.moveTo(
            Math.cos(angle) * dist * 0.25,
            Math.sin(angle) * dist * 0.25,
          );
          ctx.lineTo(Math.cos(angle) * dist, Math.sin(angle) * dist);
          ctx.stroke();
        }
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 5 + progress * 27, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.textAlign = "center";
      ctx.font =
        "bold " +
        (effect.type === "impact" ? 38 : 26) +
        'px "Segoe UI",sans-serif';
      ctx.fillText(effect.text || "", 0, -55 - progress * 35);
      ctx.restore();
    }
    fx = fx.filter((e) => e.life > 0);
  }
  function draw(dt: number, videoBackground: boolean) {
    if (cameraFighter !== match.fighters[0]) {
      cameraFighter = match.fighters[0];
      camera.reset(match);
    } else camera.update(match, dt);
    ctx.save();
    if (impactMotion) {
      if (!match.paused) impactMotion.age += dt;
      const p = Math.min(1, impactMotion.age / impactMotion.duration),
        phase = [1, -0.6, 0.3, -0.15][Math.min(3, Math.floor(p * 4))];
      const offset = phase * impactMotion.power * (1 - p);
      ctx.translate(
        offset * impactMotion.direction,
        offset * (impactMotion.direction ? 0.35 : 1),
      );
      if (p === 1) impactMotion = null;
    }
    if (!videoBackground) stageRenderer.background(battleArena, visualTime);
    if (inkMs > 0) {
      ctx.fillStyle =
        "rgba(7,8,18," +
        Math.min(reducedMotion ? 0.12 : 0.64, (0.64 * inkMs) / inkMax) +
        ")";
      ctx.fillRect(0, 0, 960, 540);
      if (!match.paused) inkMs = Math.max(0, inkMs - dt);
    }
    ctx.save();
    ctx.translate(480, 270);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);
    stageRenderer.terrain(match, battleArena);
    drawSuperAura();
    match.fighters.forEach(drawMaskAura);
    drawMujicaEffects();
    for (const side of [0, 1]) drawOffenseEffect(side);
    for (const side of [0, 1]) drawSoyoEffect(side);
    for (const f of match.fighters)
      if (
        f.character === 2 &&
        !f.penguin &&
        MOVES[f.attack ?? ""]?.tomoriOnly &&
        !MOVES[f.attack ?? ""]?.nativeOnly &&
        !f.stun &&
        match.phase === "fighting"
      ) {
        const t = f.attackMs;
        ctx.save();
        ctx.translate(f.x, 438 - f.y);
        ctx.scale(f.facing, 1);
        ctx.strokeStyle = "#bcd7ec";
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.35;
        const pulse = (t % 190) / 190;
        ctx.beginPath();
        ctx.ellipse(
          12 + pulse * 18,
          -178,
          14 + pulse * 12,
          20 + pulse * 15,
          0,
          -1.1,
          1.1,
        );
        ctx.stroke();
        if (f.attack === "tomoriChorus") {
          ctx.strokeStyle = "#d9b9d8";
          ctx.beginPath();
          ctx.ellipse(0, -3, 40 + pulse * 10, 8, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    for (const f of match.fighters)
      if (match.phase === "fighting" && !f.stun && f.penguin) {
        ctx.save();
        ctx.translate(f.x, 438 - f.y);
        ctx.strokeStyle = "#fff0c7";
        ctx.lineWidth = 2;
        if (f.penguin.ms > 19880) {
          const t = (20000 - f.penguin.ms) / 120;
          ctx.globalAlpha = Math.sin(t * Math.PI) * 0.7;
          ctx.beginPath();
          ctx.ellipse(0, -100, 55 + t * 30, 105, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else if (f.attack === "penguinCry") {
          ctx.strokeStyle = "#b6e7ff";
          ctx.globalAlpha = 0.45;
          ctx.beginPath();
          ctx.ellipse(0, -100, 57, 85, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else if (
          f.attack === "penguinLaugh" &&
          f.attackMs >= 180 &&
          f.attackMs < 420
        ) {
          const p = (f.attackMs - 180) / 240;
          ctx.globalAlpha = 0.7 * (1 - p);
          ctx.beginPath();
          ctx.ellipse(0, -90, 50 + p * 170, 35 + p * 110, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else if (
          f.attack === "penguinHey" &&
          f.attackMs >= 100 &&
          f.attackMs < 320
        ) {
          ctx.scale(f.facing, 1);
          ctx.globalAlpha = Math.min(1, (320 - f.attackMs) / 180);
          ctx.beginPath();
          ctx.ellipse(115, -105, 55, 40, 0, -1.4, 1.4);
          ctx.stroke();
          ctx.fillStyle = "#e6f7ff";
          ctx.font = "bold 22px sans-serif";
          ctx.fillText("hey?", 65, -130);
        } else if (
          f.attack === "penguinCall" &&
          f.attackMs >= 120 &&
          f.attackMs < 600
        ) {
          ctx.scale(f.facing, 1);
          ctx.globalAlpha = 0.6;
          const pulse = (f.attackMs % 160) / 160;
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.ellipse(45 - i * 25, -95, 35 + pulse * 30, 65, 0, -1.4, 1.4);
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    drawBlinkTrails(dt);
    for (const side of [0, 1]) drawFighter(side);
    drawSummons();
    for (const side of [0, 1]) drawShield(side);
    match.waves.forEach(drawWave);
    drawFx(dt);
    ctx.restore();
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
    if (flash > 0) {
      ctx.fillStyle = "#f6cee92a";
      ctx.fillRect(0, 0, 960, 540);
      if (!match.paused) flash -= dt;
    }
    ctx.restore();
  }

  return {
    reset(arena: number) {
      battleArena = arena;
      visualTime = flash = inkMs = 0;
      fx = [];
      impactMotion = null;
      cameraFighter = null;
    },
    consume(value: Match, events: CombatEvent[]) {
      match = value;
      events.forEach(consumeEvent);
    },
    draw(value: Match, dt: number, videoBackground = false) {
      match = value;
      if (!match.paused) visualTime += dt;
      draw(dt, videoBackground);
    },
  };
}
