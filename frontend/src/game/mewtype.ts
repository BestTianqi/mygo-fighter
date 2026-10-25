import { registerNormalMoves } from "./mewtype/normalMoves";
import { registerSkillMoves } from "./mewtype/skillMoves";
import { registerSuperMoves } from "./mewtype/superMoves";
import type { Move } from "./objects/Move";

/** Build this band's moves in authored order; shared balance runs in combatData. */
const MOVES: Record<string, Move> = {};
registerNormalMoves(MOVES);
registerSkillMoves(MOVES);
registerSuperMoves(MOVES);
export { formFor, normalFor, prefixFor, schemeFor } from "./mewtype/forms";
export { CHARACTERS } from "./mewtype/roster";
export { MOVES };
