import type { Move } from "../../../../objects/Move";
import { createMoveRegistrar } from "../../shared/createMoveRegistrar";
import { registerNormals as registerNormalTemplate } from "../../shared/registerNormals";
import { registerWave as registerWaveTemplate } from "../../shared/registerWave";
export function registerNormals(MOVES: Record<string, Move>): void {
  registerNormalTemplate(MOVES, 14, [
    "兔爪轻拨",
    "跃兔直拳",
    "琴颈上挑",
    "兔耳重扫",
  ]);
}
export function registerSkills(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  add(14, "u", "抱抱还是亲亲·强制手当", {
    nonoka: "hug",
    category: "throw",
    damage: 14,
    reach: 110,
    movement: 70,
    movementEnd: 140,
    start: 160,
    end: 230,
    duration: 700,
    stun: 600,
    push: 40,
    recast: 2000,
  });
  add(14, "i", "海边搜寻·找到由乃亲", {
    nonoka: "search",
    damage: 18,
    movement: 300,
    movementEnd: 300,
    start: 200,
    end: 340,
    duration: 700,
    reach: 165,
    recast: 1600,
  });
  add(14, "o", "金枪鱼小黑·认真一拳", {
    nonoka: "tuna",
    damage: 24,
    reach: 240,
    vertical: 210,
    start: 230,
    end: 330,
    duration: 740,
    stun: 400,
    push: 300,
    launch: 160,
    knockdown: 450,
    recast: 1800,
  });
  MOVES.mewtype_14_virtual_comfort = {
    ownerCharacter: 14,
    form: "virtual",
    nonoka: "comfort",
    name: "我没事哦·元气护身",
    slot: "i",
    visualSlot: "skill-u",
    command: "↓＋I",
    category: "defense",
    ground: true,
    cost: 25,
    damage: 0,
    durability: 24,
    lifetime: 1800,
    recast: 6000,
    start: 140,
    end: 170,
    duration: 450,
  };
}
export function registerWave(MOVES: Record<string, Move>): void {
  registerWaveTemplate(
    MOVES,
    14,
    {
      name: "兔食者·咬咬波",
      damage: 13,
      speed: 760,
      radiusX: 26,
      radiusY: 36,
      maxReach: 900,
      start: 160,
      duration: 600,
    },
    { nonoka: "bite" },
  );
}
export function registerSuper(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  add(14, "super", "心意直达·兔兔头槌", {
    category: "super",
    // Shared super balance halves these timings:160ms crouch,600ms rush,
    // then340ms recovery. Movement is distance, so it remains600 world units.
    duration: 2200,
    start: 320,
    end: 1520,
    movement: 600,
    movementEnd: 1520,
    damage: 50,
    fixedDamage: true,
    invuln: 100,
    reach: 180,
    vertical: 300,
    stun: 460,
    push: 340,
    hitstop: 100,
    nonoka: "headbutt",
  });
}
