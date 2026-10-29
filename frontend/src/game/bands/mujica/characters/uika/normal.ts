import type { Move, Pulse } from "../../../../objects/Move";
import { registerBackSkills as registerBackSkillTemplate } from "../../../shared/backSkills";
import { createSuperPulses } from "../../../shared/superPulses";
import {
  combo,
  createMoveRegistrar,
  missile,
} from "../../shared/createMoveRegistrar";
import { registerNormals as registerNormalTemplate } from "../../shared/registerNormals";
export function registerNormals(MOVES: Record<string, Move>): void {
  registerNormalTemplate(MOVES, 7, "normal", ["星屑轻拨", "和弦重击"], 0);
}
export function registerSkills(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  add(7, "normal", "u", "星屑和弦", missile);
  add(7, "normal", "i", "偶像步伐", {
    uika: "pursuit",
    damage: 12,
    stun: 240,
    push: 160,
    reach: 200,
    movement: 280,
    movementEnd: 280,
    duration: 420,
    start: 200,
    end: 310,
  });
  add(7, "normal", "o", "追星连奏", combo([6, 6, 10]));
}
export function registerSuper(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  const damages = [8, 12, 28];
  const duration = 4800;
  const pulses: Pulse[] = createSuperPulses(duration, damages);
  pulses.forEach((pulse, n) => {
    pulse.at = [1000, 2600, 4200][n];
    pulse.reach = 200;
  });
  add(7, "normal", "super", "Saki酱！Saki酱！", {
    category: "super",
    duration,
    start: 500,
    end: pulses.at(-1)!.at + 90,
    invuln: 100,
    damage: 48,
    reach: 200,
    vertical: 90,
    pulses,
    crawl: true,
    crawlSpeed: 90,
    level: "low",
  });
}
export function registerBackSkills(MOVES: Record<string, Move>): void {
  registerBackSkillTemplate(
    MOVES,
    7,
    "mujica_7_normal",
    ["mujica_7_normal_u", "mujica_7_normal_u", "mujica_7_normal_u"],
    { form: "normal" },
  );
}
