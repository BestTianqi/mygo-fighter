import type { Move } from "../../objects/Move";

/**
 * Late-bound handle to the assembled move catalog. Band modules must not import
 * `combatData` (that would create a registry cycle), but band hooks need to read
 * tuned values such as a super's reach. `createMoveCatalog` binds the record
 * before any match can run.
 */
let catalog: Record<string, Move> | null = null;

export function bindMoveCatalog(moves: Record<string, Move>): void {
  catalog = moves;
}

export function moveCatalog(): Record<string, Move> {
  if (!catalog)
    throw new Error("Move catalog is not ready; createMoveCatalog must run first");
  return catalog;
}
