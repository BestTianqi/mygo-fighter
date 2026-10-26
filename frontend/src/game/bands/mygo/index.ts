import type { Band, Stance } from "../../objects/Band";
import type { Character } from "../../objects/Character";
import type { FighterIdentity } from "../../objects/Fighter";
import { FEEL } from "../../data/rules";
import { defineBand } from "../contract";
import { isUniversalMove } from "../shared/universalMoves";
import { chainPrefix, firstJab, formFor, schemeFor } from "./forms";
import { MOVES } from "./moves";
import { mygoMovesFor } from "./movesFor";
import { CHARACTERS } from "./roster";
import { MYGO_ABILITY } from "./ability";
import { tuneMygo } from "./tune";

/** Captured before the shared balance pass, matching the original behaviour. */
const PENGUIN_PROFILE: Character = {
  ...CHARACTERS[2],
  speed: (375 * FEEL.walk) / 345,
  jump: (640 * FEEL.jump) / 620,
};

const profileFor = (f: FighterIdentity) =>
  f.character === 2 && f.penguin ? PENGUIN_PROFILE : CHARACTERS[f.character];

const BAND: Band = defineBand({
  id: "mygo",
  label: "MYGO!!!!!",
  characters: CHARACTERS,
  moves: MOVES,
  forms: ["base"],
  formFor,
  prefixFor: chainPrefix,
  normalFor: (f, button, stance: Stance = "standing") =>
    button === "light"
      ? firstJab(f)
      : (stance === "standing" ? "" : stance + "_") + button,
  schemeFor,
  movesFor: mygoMovesFor,
  owns: (f, move, name) =>
    isUniversalMove(name) ||
    (!move.form &&
      !move.mujicaOnly &&
      (move.ownerCharacter === undefined ||
        move.ownerCharacter === f.character)),
  profileFor,
  ...MYGO_ABILITY,
  tune: tuneMygo,
});

export { BAND, CHARACTERS, MOVES, PENGUIN_PROFILE, chainPrefix, firstJab, formFor, schemeFor };
