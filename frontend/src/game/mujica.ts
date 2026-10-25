import { registerNormalMoves } from "./mujica/normalMoves";
import { registerSkillMoves } from "./mujica/skillMoves";
import { registerSuperMoves } from "./mujica/superMoves";
import type { Move } from "./objects/Move";

/** Build this band's moves in authored order; shared balance runs in combatData. */
const MOVES: Record<string, Move> = {};
registerNormalMoves(MOVES);
registerSkillMoves(MOVES);
registerSuperMoves(MOVES);
export {
  formFor,
  normalFor,
  prefixFor,
  schemeFor,
  STAGE_FORM,
} from "./mujica/forms";
export { CHARACTERS } from "./mujica/roster";
export { MOVES };
