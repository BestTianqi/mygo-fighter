import { bandFor } from "../bands";
import type { MoveRow } from "../objects/Band";
import type { Move } from "../objects/Move";

/** Each band owns its move-list rules; this only dispatches. */
export function listMoves(
  MOVES: Record<string, Move>,
  character: number,
  penguin = false,
): MoveRow[] {
  return bandFor(character).movesFor(MOVES, character, penguin);
}
