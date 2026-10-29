import type { Move, Pulse } from "../../../../objects/Move";
import { registerBackSkills as registerBackSkillTemplate } from "../../../shared/backSkills";
import { createSuperPulses } from "../../../shared/superPulses";
import { createMoveRegistrar, missile } from "../../shared/createMoveRegistrar";
import { registerNormals as registerNormalTemplate } from "../../shared/registerNormals";
export function registerNormals(MOVES: Record<string, Move>): void {
  registerNormalTemplate(MOVES, 7, "stage", ["悲弦轻斩", "双月重斩"], 0);
}
export function registerSkills(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  add(7, "stage", "u", "不是不是不是·三重否认", {
    uika: "denial",
    omni: true,
    damage: 16,
    reach: 260,
    vertical: 210,
    movement: -90,
    movementEnd: 240,
    start: 120,
    end: 440,
    duration: 720,
    recast: 1800,
    pulses: [4, 4, 8].map((damage, i) => ({
      at: 120 + i * 130,
      damage,
      reach: 190 + i * 35,
      stun: i === 2 ? 420 : 300,
      push: i === 2 ? 320 : 20,
    })),
  });
  add(7, "stage", "i", "想见Saki酱·逐星突进", {
    uika: "pursuit",
    damage: 18,
    movement: 280,
    movementEnd: 260,
    start: 140,
    end: 280,
    duration: 650,
    reach: 165,
    recast: 1400,
  });
  add(7, "stage", "o", "Imprisoned·囚爱星笼", {
    uika: "cage",
    delayedArea: true,
    warning: 550,
    areaRadius: 145,
    reach: 420,
    vertical: 240,
    damage: 20,
    stun: 700,
    push: 40,
    start: 160,
    end: 180,
    duration: 480,
    recast: 3200,
  });
  add(7, "stage", "crescent", "同一片星空·弦月回响", {
    ...missile,
    uika: "crescent",
    slot: "u",
    visualSlot: "skill-o",
    command: "↓＋U",
    cost: 20,
    damage: 14,
    speed: 300,
    maxReach: 520,
    radiusX: 44,
    radiusY: 65,
    height: 110,
    lifetime: 1900,
    start: 180,
    end: 220,
    duration: 600,
    recast: 2200,
  });
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
  add(7, "stage", "super", "Saki酱！Saki酱！", {
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
    "mujica_7_stage",
    [
      "mujica_7_stage_crescent",
      "mujica_7_stage_crescent",
      "mujica_7_stage_crescent",
    ],
    { form: "stage" },
  );
}
