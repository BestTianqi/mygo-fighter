import type { Move, Pulse } from "../../../../objects/Move";
import { registerBackSkills as registerBackSkillTemplate } from "../../../shared/backSkills";
import { createSuperPulses } from "../../../shared/superPulses";
import { createMoveRegistrar, missile } from "../../shared/createMoveRegistrar";
import { registerNormals as registerNormalTemplate } from "../../shared/registerNormals";
export function registerNormals(MOVES: Record<string, Move>): void {
  registerNormalTemplate(MOVES, 6, "normal", ["琴键轻拍", "茶会重音"], 0);
}
export function registerSkills(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  add(6, "normal", "u", "琴键问候", missile);
  add(6, "normal", "customer", "客服小祥·请稍候", {
    ...missile,
    slot: "u",
    command: "↓＋U",
    visualSlot: "customer",
    cost: 20,
    customerService: true,
    damage: 14,
    stun: 550,
    push: 160,
    speed: 680,
    lifetime: 900,
    radiusX: 30,
    radiusY: 54,
    duration: 680,
    start: 180,
    end: 210,
    recast: 2400,
  });
  add(6, "normal", "i", "茶会谢绝", {
    category: "defense",
    durability: 24,
    lifetime: 2000,
    recast: 6000,
    damage: 0,
    start: 120,
    end: 140,
    duration: 400,
  });
  add(6, "normal", "o", "不必再联系", { reach: 195, push: 400 });
}
export function registerSuper(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  const damages = [8, 12, 28];
  const duration = 6400;
  const pulses: Pulse[] = createSuperPulses(duration, damages);
  add(6, "normal", "super", "我来成为神明", {
    category: "super",
    duration,
    start: 500,
    end: pulses.at(-1)!.at + 90,
    invuln: 100,
    damage: 48,
    reach: 420,
    vertical: 300,
    pulses,
  });
}
export function registerBackSkills(MOVES: Record<string, Move>): void {
  registerBackSkillTemplate(
    MOVES,
    6,
    "mujica_6_normal",
    ["mujica_6_normal_u", "mujica_6_normal_u", "mujica_6_normal_u"],
    { form: "normal" },
  );
}
