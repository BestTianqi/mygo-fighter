import type { Move } from "../../../objects/Move";
/** These unowned base moves are shared by the band's character schemes. */
export const COMMON_MOVES = {
  special: {
    name: "闪耀合奏",
    command: "L",
    category: "special",
    duration: 650,
    start: 230,
    end: 290,
    damage: 24,
    stun: 380,
    push: 280,
    cost: 60,
  },
  wave: {
    name: "音符弹·中",
    command: "↓↘→ + H / I",
    category: "special",
    projectile: true,
    duration: 380,
    start: 120,
    end: 140,
    damage: 14,
    stun: 200,
    push: 150,
    cost: 20,
    speed: 440,
  },
} satisfies Record<string, Move>;
