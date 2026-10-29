import type { Move, Pulse } from "../../../../objects/Move";
import { createSuperPulses } from "../../../shared/superPulses";
import { createMoveRegistrar, missile } from "../../shared/createMoveRegistrar";
import { registerNormals as registerNormalTemplate } from "../../shared/registerNormals";
import { registerWave as registerWaveTemplate } from "../../shared/registerWave";
export function registerNormals(MOVES: Record<string, Move>): void {
  registerNormalTemplate(MOVES, 12, [
    "笔尖点墨",
    "翻页横挥",
    "分镜挑笔",
    "分镜侧踢",
  ]);
}
export function registerSkills(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  add(12, "u", "富士见夜子·双页分镜", {
    ...missile,
    miyako: "draft",
    damage: 8,
    shots: [150, 330],
    start: 150,
    end: 450,
    duration: 700,
    speed: 560,
    lifetime: 1300,
    maxReach: 760,
    push: 80,
    height: 135,
    projectileVy: 200,
    projectileGravity: 560,
  });
  add(12, "i", "百次参拜·赎罪印", {
    miyako: "stamp",
    delayedArea: true,
    damage: 24,
    warning: 650,
    areaRadius: 135,
    reach: 420,
    stun: 650,
    push: 40,
    recast: 4000,
    duration: 450,
    start: 120,
    end: 260,
  });
  add(12, "o", "秋叶原马拉松·赶稿突进", {
    miyako: "marathon",
    movement: 320,
    movementEnd: 300,
    duration: 680,
    start: 190,
    end: 330,
    reach: 165,
    vertical: 190,
    damage: 22,
    stun: 400,
    push: 220,
    recast: 1800,
  });
  MOVES.mewtype_12_virtual_yokan = {
    ownerCharacter: 12,
    form: "virtual",
    slot: "i",
    visualSlot: "heavy",
    miyako: "yokan",
    name: "巨羊羹·这样太无聊了",
    command: "↓＋I",
    category: "special",
    ground: true,
    cost: 25,
    damage: 28,
    reach: 310,
    vertical: 280,
    start: 240,
    end: 360,
    duration: 800,
    stun: 500,
    push: 320,
    knockdown: 500,
    hitstop: 110,
    chip: 3,
    recast: 3200,
  };
}
export function registerWave(MOVES: Record<string, Move>): void {
  registerWaveTemplate(
    MOVES,
    12,
    {
      name: "不会停笔·墨线声波",
      damage: 15,
      speed: 640,
      radiusX: 32,
      radiusY: 44,
      maxReach: 820,
      start: 170,
      duration: 620,
    },
    { miyako: "ink" },
  );
}
export function registerSuper(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  const duration = 11500;
  const damages = [...Array(8).fill(5), 10];
  const pulses: Pulse[] = createSuperPulses(
    duration,
    damages,
    "临兵斗者皆阵列在前",
  );
  add(12, "super", "临兵斗者皆阵列在前", {
    category: "super",
    duration,
    start: 500,
    end: pulses.at(-1)!.at + 90,
    damage: 50,
    invuln: 0,
    reach: 420,
    vertical: 300,
    pulses,
    targetArea: true,
    targetLock: true,
    areaRadius: 210,
    fixedDamage: true,
    damageReduction: 0.8,
    hitstop: 40,
  });
}
