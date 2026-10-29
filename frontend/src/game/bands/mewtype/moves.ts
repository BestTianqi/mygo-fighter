import { registerNormalMoves } from "./normalMoves";
import { registerSkillMoves } from "./skillMoves";
import { registerSuperMoves } from "./superMoves";
import { registerViolaMoves } from "./violaMoves";
import type { Move } from "../../objects/Move";
import { registerBackSkills } from "../shared/backSkills";
import { CHARACTERS } from "./roster";

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
export { MOVES };
