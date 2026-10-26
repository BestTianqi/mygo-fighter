import { BANDS, bandFor } from "./bands";
import { ROSTER } from "./data/roster";
import { createMoveCatalog } from "./data/createMoveCatalog";
import { listMoves } from "./data/listMoves";
import type { FighterIdentity } from "./objects/Fighter";

const MOVES = createMoveCatalog();
function moveList(character: number, penguin = false) {
  return listMoves(MOVES, character, penguin);
}
const profileFor = (f: FighterIdentity) => bandFor(f.character).profileFor(f);
export {
  FEEL,
  MAX_HEALTH,
  NORMAL_BUTTONS,
  ROUND_END_TIMING,
  verticalScale,
  WORLD,
} from "./data/rules";
export {
  BANDS,
  bandFor,
  MOVES,
  moveList,
  profileFor,
  ROSTER,
};
