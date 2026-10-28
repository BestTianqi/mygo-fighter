import { bandFor } from "../../../../../game/bands";
import { MOVES, ROSTER } from "../../../../../game/engine";
import type { CombatEvent } from "../../../../../game/objects/CombatEvent";
import { presentationFor } from "../../presentationFor";
import type { BattleSceneContext, ParticleEffect } from "./objects";
import { fighterSprite } from "./sprites";
export function add(
  scene: BattleSceneContext,
  effect: Pick<ParticleEffect, "type" | "x" | "y" | "life" | "color"> &
    Partial<ParticleEffect>,
) {
  scene.state.fx.push({
    max: effect.life,
    text: "",
    weight: 1,
    direction: 1,
    heavy: false,
    radius: 100,
    ...effect,
  });
}

export function consumeEvent(scene: BattleSceneContext, event: CombatEvent) {
  const side = event.side ?? event.owner ?? 0,
    f = scene.match.fighters[side];
  const x = event.x ?? f.x,
    y = 438 - (event.y ?? f.y);
  const color = ROSTER[f.character].color;
  const burst = (text: string, tint = color, height = 110, life = 650) =>
    add(scene, {
      type: "burst",
      x: f.x,
      y: 438 - f.y - height,
      life,
      color: tint,
      text,
    });
  if (event.type === "fighterRespawn") {
    scene.state.fx = scene.state.fx.filter(
      (effect) => effect.type !== "blink" || effect.side !== side,
    );
    burst(`${side + 1}P 替补登场`, scene.colors[side], 230, 1000);
    add(scene, {
      type: "landing",
      x: f.x,
      y: 438 - f.y,
      life: 500,
      color: scene.colors[side],
    });
  }
  if (event.type === "roundAdvance" || event.type === "teamAdvance") {
    scene.state.fx = [];
    scene.state.flash = scene.state.inkMs = 0;
    scene.state.impactMotion = null;
  }
  if (event.type === "result")
    scene.state.fx = scene.state.fx.filter((effect) => effect.type !== "blink");
  if (event.type === "attack") {
    const move = MOVES[event.attack ?? ""],
      presentation = presentationFor(scene.assets, f, event.attack ?? null);
    if (presentation?.label && presentation.slot !== "p")
      burst(presentation.label, color, 230, 950);
    if (
      event.attack === "super" ||
      event.attack === "soyoSuper" ||
      move?.category === "super"
    )
      scene.state.flash = scene.reducedMotion
        ? 0
        : event.attack === "super"
          ? 150
          : 100;
  }
  if (event.type === "dash" || event.type === "blink") {
    if (event.type === "blink") {
      const sprite = fighterSprite(scene, side, event.direction ?? f.facing);
      scene.state.fx = scene.state.fx.filter(
        (effect) => effect.type !== "blink" || effect.side !== side,
      );
      if (sprite)
        scene.state.fx.push({
          type: "blink",
          side,
          fromX: event.fromX ?? f.x,
          fromY: event.fromY ?? f.y,
          toX: f.x,
          toY: f.y,
          sprite,
          life: scene.reducedMotion ? 160 : 260,
          max: scene.reducedMotion ? 160 : 260,
          travelMs: scene.reducedMotion ? 0 : 90,
          color: scene.colors[side],
        });
    }
    add(scene, {
      type: "dash",
      x: f.x,
      y: 438 - f.y,
      life: 160,
      direction: event.direction ?? f.facing,
      color: scene.colors[side],
    });
  }
  if (event.type === "landing") {
    add(scene, {
      type: "landing",
      x,
      y,
      life: event.heavy ? 420 : 240,
      heavy: !!event.heavy,
      color: "#d5d4ce",
    });
    if (event.heavy && !scene.reducedMotion)
      scene.state.impactMotion = {
        age: 0,
        duration: 150,
        power: 4,
        direction: 0,
      };
  }
  if (event.type === "stageFormStart" || event.type === "stageFormEnd") {
    burst(
      event.type === "stageFormStart"
        ? (ROSTER[f.character].stageName ?? ROSTER[f.character].name)
        : "谢幕",
    );
    if (event.type === "stageFormStart" && !scene.reducedMotion)
      scene.state.inkMs = scene.state.inkMax = 720;
  }
  if (
    event.type === "counter" ||
    event.type === "counterRelease" ||
    event.type === "areaPulse" ||
    event.type === "penguinCounter"
  )
    add(scene, {
      type: event.type === "areaPulse" ? "shock" : "guard",
      x,
      y,
      life: 450,
      color,
      text:
        event.type === "counterRelease"
          ? "收招音波"
          : event.type === "counter"
            ? "反拨"
            : event.type === "penguinCounter"
              ? "糖哭反击"
              : "",
    });
  if (
    event.type === "memePulse" &&
    MOVES[event.attack ?? ""]?.sakiko !== "ascension"
  )
    add(scene, {
      type: "incantation",
      x,
      y: y - 35,
      life: 1300,
      color: "#dbabff",
      text: event.glyph ?? "",
      radius: event.radius ?? 100,
    });
  if (event.type === "hardControl")
    add(scene, {
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
    add(scene, { type: "parfaitSplash", x, y, life: 520, color: "#b4cf60" });
  if (event.type === "penguinStart" || event.type === "penguinEnd")
    burst(event.type === "penguinStart" ? "凑企鹅！" : "恢复原形", "#fff0c6");
  if (event.type === "heal")
    burst("+" + event.amount + " 生命", "#aeefcf", 160, 950);
  if (event.type === "lifestealStart")
    burst(
      `吸血 ${event.amount}% · ${(event.duration ?? 0) / 1000}秒`,
      "#ff9ba9",
      180,
      1000,
    );
  if (event.type === "summon") burst("小天素罗 ×3", "#ffe0a0", 120);
  if (event.type === "minionCall")
    add(scene, {
      type: "burst",
      x,
      y: y - 85,
      life: 650,
      color: "#ffe0a0",
      text: "哦也！",
    });
  if (event.type === "minionHit")
    add(scene, {
      type: "impact",
      x,
      y: y - 35,
      life: 350,
      color: "#ffe0a0",
      weight: 0,
      text: "-" + event.damage,
    });
  if (event.type === "terrainHit")
    add(scene, { type: "burst", x, y, life: 300, color: "#c4d9e5" });
  if (event.type === "shieldHit")
    add(scene, {
      type:
        event.broken && bandFor(f.character).id === "mygo"
          ? "steelBreak"
          : "burst",
      x,
      y,
      life: event.broken ? 600 : 350,
      color: "#c4e9ff",
      text:
        (f.character === 13
          ? "合奏屏障"
          : f.character === 14
            ? "元气护盾"
            : bandFor(f.character).id !== "mygo"
              ? "茶会护盾"
              : "钢板") + (event.broken ? "破碎" : " −" + event.absorbed),
    });
  if (event.type === "hit" || event.type === "clash") {
    const tint = event.blocked
      ? "#b1e6ff"
      : event.type === "clash"
        ? "#fff2c4"
        : scene.colors[side];
    const weight = Math.max(0, Math.min(3, event.weight ?? 1));
    add(scene, {
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
    if (!scene.reducedMotion) {
      const power = event.blocked
        ? 2
        : (2.4 + [1, 1.3, 1.85, 2.8][weight] * 2.2) * 1.5;
      if (!scene.state.impactMotion || power >= scene.state.impactMotion.power)
        scene.state.impactMotion = {
          age: 0,
          duration: event.blocked ? 50 : weight >= 2 ? 200 : 120,
          power,
          direction: f.facing,
        };
      scene.camera.impact({ blocked: event.blocked, x, weight });
    }
    if (!event.blocked && weight >= 2)
      scene.state.inkMs = scene.state.inkMax = weight === 3 ? 370 : 200;
    if (event.attack === "super" || event.attack === "soyoSuper")
      add(scene, {
        type: "shock",
        x,
        y: 438 - f.y,
        life: 650,
        color: event.attack === "super" ? "#ffa9d2" : "#ffe3a6",
      });
  }
}
