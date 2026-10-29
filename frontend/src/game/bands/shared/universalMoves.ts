import type { Move } from "../../objects/Move";

/**
 * Moves every band may use. They are defined once and exempt from a band's
 * ownership rules, so a new band does not have to re-declare throws.
 */
const UNIVERSAL = ["throw"] as const;

export const isUniversalMove = (name: string) =>
  (UNIVERSAL as readonly string[]).includes(name);

export const UNIVERSAL_MOVES: readonly string[] = UNIVERSAL;

/**
 * Registers the authored universal definitions. `bands/mygo/moves` calls
 * this between its skill groups on purpose: the catalog key order is
 * behavioural (the F1 move list renders `Object.entries(MOVES)`), so the throw
 * has to keep its original slot even though every band may use it.
 */
export function registerUniversalMoves(MOVES: Record<string, Move>): void {
  Object.assign(MOVES, {
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
