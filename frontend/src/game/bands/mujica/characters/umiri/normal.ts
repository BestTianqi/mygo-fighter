import type { Move, Pulse } from "../../../../objects/Move";
import { registerBackSkills as registerBackSkillTemplate } from "../../../shared/backSkills";
import { createSuperPulses } from "../../../shared/superPulses";
import { createMoveRegistrar, missile } from "../../shared/createMoveRegistrar";
import { registerNormals as registerNormalTemplate } from "../../shared/registerNormals";
export function registerNormals(MOVES: Record<string, Move>): void {
  registerNormalTemplate(MOVES, 5, "normal", ["拨弦轻击", "琴颈重拍"], 8);
}
export function registerSkills(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  add(5, "normal", "u", "意欲何为·精准拨弦", {
    ...missile,
    lifetime: 1400,
    speed: 600,
  });
  add(5, "normal", "i", "很遗憾·稳拍反拨", {
    category: "defense",
    counter: true,
    counterDamage: 18,
    start: 120,
    end: 300,
    duration: 600,
    damage: 0,
    recast: 4000,
  });
  add(5, "normal", "o", "零卡路里·收工重拍", {
    damage: 25,
    vertical: 300,
    reach: 150,
    launch: 350,
  });
}
export function registerSuper(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  const damages = [16, 16, 16];
  const duration = 3400;
  const pulses: Pulse[] = createSuperPulses(duration, damages);
  add(5, "normal", "super", "练习结束后再吵", {
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
    5,
    "mujica_5_normal",
    ["mujica_5_normal_u", "mujica_5_normal_u", "mujica_5_normal_u"],
    { form: "normal" },
  );
}
