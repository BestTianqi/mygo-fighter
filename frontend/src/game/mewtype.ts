import { registerNormalMoves } from "./mewtype/normalMoves";
import { registerSkillMoves } from "./mewtype/skillMoves";
import { registerSuperMoves } from "./mewtype/superMoves";
import { registerViolaMoves } from "./mewtype/violaMoves";
import type { Move } from "./objects/Move";
import { registerBackSkills } from "./bands/shared/backSkills";
import { CHARACTERS } from "./mewtype/roster";

/** Build this band's moves in authored order; shared balance runs in combatData. */
const MOVES: Record<string, Move> = {};
registerNormalMoves(MOVES);
registerSkillMoves(MOVES);
registerSuperMoves(MOVES);
registerViolaMoves(MOVES);
for (const character of CHARACTERS) {
  const prefix = `mewtype_${character.id}_virtual`;
  const source = `${prefix}_wave`;
  registerBackSkills(MOVES, character.id!, prefix, [source, source, source], {
    form: "virtual",
  });
}
export { formFor, normalFor, prefixFor, schemeFor } from "./mewtype/forms";
export { CHARACTERS } from "./mewtype/roster";
export { MOVES };
