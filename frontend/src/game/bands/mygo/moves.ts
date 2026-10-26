import type { Move } from "../../objects/Move";
import { registerBaseNormals } from "./normalMoves";
import {
  registerPenguinNormals,
  registerPenguinSpecials,
} from "./penguinMoves";
import { registerRanaMoves } from "./ranaMoves";
import { registerRangedMoves } from "./rangedMoves";
import { registerRikiMoves } from "./rikiMoves";
import { registerMygoSkills } from "./skillMoves";

/** Authored MyGO moves in their original registration order. */
const MOVES: Record<string, Move> = {};
registerBaseNormals(MOVES);
registerPenguinSpecials(MOVES);
registerRangedMoves(MOVES);
registerMygoSkills(MOVES);
registerRanaMoves(MOVES);
registerPenguinNormals(MOVES);
registerRikiMoves(MOVES);

export { MOVES };
