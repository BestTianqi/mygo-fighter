import * as mewtype from "../mewtype";
import * as mujica from "../mujica";
import type { Move } from "../objects/Move";
import { applyBalance } from "./moves/balance";
import { registerBaseNormals } from "./moves/baseNormals";
import { registerChainsAndScaleMovement } from "./moves/chains";
import { registerMygoSkills } from "./moves/mygoSkills";
import {
  registerPenguinNormals,
  registerPenguinSpecials,
} from "./moves/penguinMoves";
import { registerRanaMoves } from "./moves/ranaMoves";
import { registerRangedMoves } from "./moves/rangedMoves";
import { registerRikiMoves } from "./moves/rikiMoves";
import { applySuperOverrides } from "./moves/superOverrides";
/** Registration and tuning order is part of the combat rules. */
export function createMoveCatalog(): Record<string, Move> {
  const MOVES: Record<string, Move> = {};
  registerBaseNormals(MOVES);
  registerPenguinSpecials(MOVES);
  registerRangedMoves(MOVES);
  registerMygoSkills(MOVES);
  registerRanaMoves(MOVES);
  registerPenguinNormals(MOVES);
  registerRikiMoves(MOVES);
  Object.assign(MOVES, mujica.MOVES, mewtype.MOVES);
  registerChainsAndScaleMovement(MOVES);
  applyBalance(MOVES);
  applySuperOverrides(MOVES);
  return MOVES;
}
