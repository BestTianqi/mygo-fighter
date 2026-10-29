import type { Move } from "../../objects/Move";
import { registerUniversalMoves } from "../shared/universalMoves";
import * as anon from "./characters/anon/base";
import * as rana from "./characters/rana/base";
import * as riki from "./characters/riki/base";
import * as soyo from "./characters/soyo/base";
import * as tomori from "./characters/tomori/base";
import * as penguin from "./characters/tomori/penguin";
import { COMMON_MOVES } from "./shared/commonMoves";
import { registerBaseNormals } from "./shared/registerNormals";
/** Assembly preserves the shipped catalog and command-list order across authored forms. */
const MOVES: Record<string, Move> = {};
registerBaseNormals(MOVES);
penguin.registerSkills(MOVES);
Object.assign(MOVES, COMMON_MOVES, tomori.MOVES, {
  penguinSuper: penguin.SUPER,
  sonic: anon.MOVES.sonic,
  anonCry: anon.MOVES.anonCry,
  thrust: anon.MOVES.thrust,
  rush: anon.MOVES.rush,
  dive: anon.MOVES.dive,
});
registerUniversalMoves(MOVES);
MOVES.shield = anon.MOVES.shield;
soyo.registerMoves(MOVES);
Object.assign(MOVES, {
  rising: anon.MOVES.rising,
  spin: anon.MOVES.spin,
  overhead: anon.MOVES.overhead,
  super: anon.MOVES.super,
  waveLight: anon.MOVES.waveLight,
  waveHeavy: anon.MOVES.waveHeavy,
});
rana.registerMoves(MOVES);
penguin.registerNormals(MOVES);
riki.registerMoves(MOVES);
for (const form of [anon, soyo, tomori, penguin, rana, riki])
  form.registerBackSkills(MOVES);
export { MOVES };
