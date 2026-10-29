import type { Move, Pulse } from "../../../../objects/Move";
import { registerBackSkills as registerBackSkillTemplate } from "../../../shared/backSkills";
import { createSuperPulses } from "../../../shared/superPulses";
import { createMoveRegistrar, missile } from "../../shared/createMoveRegistrar";
import { registerNormals as registerNormalTemplate } from "../../shared/registerNormals";
export function registerNormals(MOVES: Record<string, Move>): void {
  registerNormalTemplate(MOVES, 8, "normal", ["寡言轻拨", "琴身重击"], 8);
}
export function registerSkills(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  add(8, "normal", "u", "青瓜投掷", {
    ...missile,
    height: 135,
    spawnOffset: 60,
    projectileVy: 220,
    projectileGravity: 600,
  });
  add(8, "normal", "i", "寡言拨弦", { level: "low", reach: 230 });
  add(8, "normal", "o", "请安静一点", { omni: true, reach: 170, push: 400 });
}
export function registerSuper(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  const damages = [8, 12, 28];
  const duration = 8300;
  const pulses: Pulse[] = createSuperPulses(duration, damages);
  add(8, "normal", "super", "从来没觉得玩乐队开心过", {
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
    8,
    "mujica_8_normal",
    ["mujica_8_normal_u", "mujica_8_normal_u", "mujica_8_normal_u"],
    { form: "normal" },
  );
}
