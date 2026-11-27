import type { Move } from "../../objects/Move";

/**
 * Moves every band may use. They are defined once and exempt from a band's
 * ownership rules, including motion commands shared by every form.
 */
const UNIVERSAL = ["throw", "uppercut", "dragonPunch"] as const;

export const isUniversalMove = (name: string) =>
  (UNIVERSAL as readonly string[]).includes(name);

export const UNIVERSAL_MOVES: readonly string[] = UNIVERSAL;

/**
 * Registers the authored universal definitions. `bands/mygo/moves` calls
 * this between its skill groups on purpose: the catalog key order is
 * behavioural (the F1 move list renders `Object.entries(MOVES)`).
 */
export function registerUniversalMoves(MOVES: Record<string, Move>): void {
  Object.assign(MOVES, {
    uppercut: {
      name: "上勾拳",
      command: "↓↘→＋J",
      category: "special",
      ground: true,
      duration: 360,
      start: 70,
      end: 155,
      damage: 10,
      stun: 330,
      launch: 310,
      push: 12,
      reach: 104,
      hitstop: 65,
      movement: 24,
      movementEnd: 75,
    },
    dragonPunch: {
      name: "升龙拳",
      command: "→↓↘＋K",
      category: "special",
      ground: true,
      duration: 560,
      start: 70,
      end: 230,
      damage: 16,
      stun: 370,
      launch: 510,
      push: 34,
      reach: 104,
      hitstop: 85,
      movement: 48,
      movementEnd: 170,
    },
    throw: {
      name: "投技·换拍",
      command: "B（后投：← + B）",
      category: "throw",
      ground: true,
      duration: 520,
      start: 80,
      end: 100,
      damage: 18,
      stun: 500,
      push: 320,
      reach: 66,
      knockdown: 650,
    },
  });
}
