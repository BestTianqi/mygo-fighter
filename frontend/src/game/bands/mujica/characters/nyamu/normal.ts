import type { Move, Pulse } from "../../../../objects/Move";
import { registerBackSkills as registerBackSkillTemplate } from "../../../shared/backSkills";
import { createSuperPulses } from "../../../shared/superPulses";
import { combo, createMoveRegistrar } from "../../shared/createMoveRegistrar";
import { registerNormals as registerNormalTemplate } from "../../shared/registerNormals";
export function registerNormals(MOVES: Record<string, Move>): void {
  registerNormalTemplate(MOVES, 9, "normal", ["镜头轻拍", "开播重击"], 0);
}
export function registerSkills(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  add(9, "normal", "u", "补光闪拍", { reach: 200, vertical: 180 });
  add(9, "normal", "i", "流量冲刺", {
    movement: 200,
    movementEnd: 260,
    start: 170,
    end: 280,
  });
  add(9, "normal", "o", "开播连击", combo([6, 6, 10]));
}
export function registerSuper(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  const damages = [8, 12, 28];
  const duration = 3500;
  const pulses: Pulse[] = createSuperPulses(duration, damages);
  add(9, "normal", "super", "完美笑容·摘下面具", {
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
    9,
    "mujica_9_normal",
    ["mujica_9_normal_u", "mujica_9_normal_u", "mujica_9_normal_u"],
    { form: "normal" },
  );
}
