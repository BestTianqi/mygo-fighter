import type { Move, Pulse } from "../../../../objects/Move";
import { createSuperPulses } from "../../../shared/superPulses";
import { createMoveRegistrar, missile } from "../../shared/createMoveRegistrar";
import { registerNormals as registerNormalTemplate } from "../../shared/registerNormals";
import { registerWave as registerWaveTemplate } from "../../shared/registerWave";
export function registerNormals(MOVES: Record<string, Move>): void {
  registerNormalTemplate(MOVES, 11, [
    "蓝熊探弦",
    "蓝熊肘击",
    "熊爪上勾",
    "琴身重拍",
  ]);
}
export function registerSkills(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  add(11, "u", "两磅肉排·双重横扫", {
    ritsu: "meat",
    reach: 240,
    vertical: 210,
    damage: 18,
    movement: 90,
    movementEnd: 240,
    duration: 700,
    start: 140,
    end: 390,
    recast: 1500,
    pulses: [
      { at: 140, damage: 7, reach: 220, push: 15, stun: 320 },
      { at: 330, damage: 11, reach: 260, push: 240, stun: 400 },
    ],
  });
  const counter = add(11, "i", "请多关照·优等生防反", {
    ritsu: "polite",
    category: "defense",
    counter: true,
    counterAttack: "mewtype_11_virtual_counter",
    start: 100,
    end: 420,
    duration: 600,
    damage: 0,
    recast: 4000,
  });
  MOVES.mewtype_11_virtual_counter = {
    ...missile,
    ownerCharacter: 11,
    form: "virtual",
    ritsu: "polite",
    internal: true,
    duration: 0,
    start: 0,
    end: 0,
    name: MOVES[counter].name + "·反击",
    category: "special",
    damage: 18,
    chip: 0,
    stun: 340,
    push: 220,
    speed: 700,
    lifetime: 500,
  };
  add(11, "o", "七分熟·厚切重奏", {
    ritsu: "steak",
    damage: 25,
    movement: 220,
    movementEnd: 300,
    start: 210,
    end: 340,
    reach: 175,
  });
}
export function registerWave(MOVES: Record<string, Move>): void {
  registerWaveTemplate(
    MOVES,
    11,
    {
      name: "七分熟·炙烤弦波",
      damage: 16,
      speed: 700,
      radiusX: 30,
      radiusY: 42,
      maxReach: 780,
      start: 190,
      duration: 660,
    },
    { ritsu: "wave" },
  );
}
export function registerSuper(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  const duration = 2200;
  const damages = Array(5).fill(10);
  const pulses: Pulse[] = createSuperPulses(duration, damages);
  pulses.forEach((pulse, i) => {
    pulse.at = 200 + i * 360;
    pulse.reach = 230 + i * 30;
    pulse.stun = 300;
    pulse.push = i === 4 ? 240 : 8;
  });
  pulses.at(-1)!.launch = 300;
  add(11, "super", "饥饿狂战士·开饭啦", {
    category: "super",
    duration,
    start: 200,
    end: pulses.at(-1)!.at + 90,
    damage: 50,
    invuln: 100,
    reach: 420,
    vertical: 300,
    pulses,
    ritsu: "hungry" as const,
    movement: 180,
    movementEnd: 1800,
    hitstop: 50,
  });
}
