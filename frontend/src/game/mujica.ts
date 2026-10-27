import { registerNormalMoves } from "./mujica/normalMoves";
import { registerSkillMoves } from "./mujica/skillMoves";
import { registerSuperMoves } from "./mujica/superMoves";
import type { Move } from "./objects/Move";
import { registerBackSkills } from "./bands/shared/backSkills";
import { CHARACTERS } from "./mujica/roster";

/** Build this band's moves in authored order; shared balance runs in combatData. */
const MOVES: Record<string, Move> = {};
registerNormalMoves(MOVES);
registerSkillMoves(MOVES);
registerSuperMoves(MOVES);
for (const character of CHARACTERS)
  for (const form of ["normal", "stage"]) {
    const prefix = `mujica_${character.id}_${form}`;
    const source =
      character.id === 7 && form === "stage"
        ? `${prefix}_crescent`
        : character.id === 8 && form === "stage"
          ? "mujica_8_normal_u"
          : character.id === 9 && form === "stage"
            ? `${prefix}_i`
            : `${prefix}_u`;
    registerBackSkills(
      MOVES,
      character.id!,
      prefix,
      [
        source,
        source,
        character.id === 8 && form === "stage" ? `${prefix}_burger` : source,
      ],
      { form },
    );
  }
export {
  formFor,
  normalFor,
  prefixFor,
  schemeFor,
  STAGE_FORM,
} from "./mujica/forms";
export { CHARACTERS } from "./mujica/roster";
export { MOVES };
