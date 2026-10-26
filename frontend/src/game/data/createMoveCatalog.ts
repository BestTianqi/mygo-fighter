import { BANDS } from "../bands";
import { bindMoveCatalog } from "../bands/shared/catalog";
import { registerMygoChains, registerMygoJabs } from "../bands/mygo/chains";
import { validateCatalog } from "../bands/validation";
import type { Move } from "../objects/Move";
import { applyBalance } from "./moves/balance";
import { scaleSharedMovement } from "./moves/scale";

function mergeBand(MOVES: Record<string, Move>, band: (typeof BANDS)[number]) {
  for (const key of Object.keys(band.moves))
    if (Object.prototype.hasOwnProperty.call(MOVES, key))
      throw new Error(
        `Move key "${key}" from band ${band.id} is already registered`,
      );
  Object.assign(MOVES, band.moves);
}

/** Registration and tuning order is part of the combat rules. */
export function createMoveCatalog(): Record<string, Move> {
  const MOVES: Record<string, Move> = {};
  for (const band of BANDS) mergeBand(MOVES, band);
  registerMygoJabs(MOVES);
  scaleSharedMovement(MOVES);
  registerMygoChains(MOVES);
  applyBalance(MOVES);
  for (const band of BANDS) band.tune?.(MOVES);
  validateCatalog(BANDS, MOVES);
  bindMoveCatalog(MOVES);
  return MOVES;
}
