import type { Move, Pulse } from "../../../../objects/Move";
import { registerBackSkills as registerBackSkillTemplate } from "../../../shared/backSkills";
import { createSuperPulses } from "../../../shared/superPulses";
import { createMoveRegistrar, missile } from "../../shared/createMoveRegistrar";
import { registerNormals as registerNormalTemplate } from "../../shared/registerNormals";
export function registerNormals(MOVES: Record<string, Move>): void {
  registerNormalTemplate(MOVES, 6, "stage", ["黑键敲击", "傀儡重音"], 0);
}
export function registerSkills(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  add(6, "stage", "u", "黑键断章", {
    ...missile,
    damage: 8,
    shots: [160, 330],
    end: 350,
    duration: 650,
  });
  add(6, "stage", "i", "遗忘之牢", {
    delayedArea: true,
    damage: 24,
    warning: 600,
    areaRadius: 115,
    recast: 4000,
    start: 120,
    end: 140,
    duration: 450,
  });
  add(6, "stage", "o", "傀儡律令", { reach: 360, pull: 100 });
}
export function registerSuper(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  const damages = [8, 12, 28];
  const duration = 6400;
  const pulses: Pulse[] = createSuperPulses(duration, damages);
  add(6, "stage", "super", "我来成为神明", {
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
    "mujica_6_stage",
    ["mujica_6_stage_u", "mujica_6_stage_u", "mujica_6_stage_u"],
    { form: "stage" },
  );
}
