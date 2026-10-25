import { ROSTER } from "./data/roster";
// Capture the penguin profile before the shared roster balance pass, as before.
import {
  chainPrefix,
  firstJab,
  isMujica,
  kitFor,
  profileFor,
} from "./data/characters";
import { createMoveCatalog } from "./data/createMoveCatalog";
import { listMoves } from "./data/listMoves";

const MOVES = createMoveCatalog();
function moveList(character: number, penguin = false) {
  return listMoves(MOVES, character, penguin);
}
export {
  FEEL,
  MAX_HEALTH,
  NORMAL_BUTTONS,
  ROUND_END_TIMING,
  verticalScale,
  WORLD,
} from "./data/rules";
export {
  chainPrefix,
  firstJab,
  isMujica,
  kitFor,
  moveList,
  MOVES,
  profileFor,
  ROSTER,
};
