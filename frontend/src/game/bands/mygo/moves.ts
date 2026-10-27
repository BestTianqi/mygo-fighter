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
import { registerBackSkills } from "../shared/backSkills";

/** Authored MyGO moves in their original registration order. */
const MOVES: Record<string, Move> = {};
registerBaseNormals(MOVES);
registerPenguinSpecials(MOVES);
registerRangedMoves(MOVES);
registerMygoSkills(MOVES);
registerRanaMoves(MOVES);
registerPenguinNormals(MOVES);
registerRikiMoves(MOVES);
registerBackSkills(MOVES, 0, "anon", ["anonCry", "sonic", "waveHeavy"]);
registerBackSkills(MOVES, 1, "soyo", ["wave", "wave", "wave"], {
  soyoOnly: true,
});
registerBackSkills(
  MOVES,
  2,
  "tomori",
  ["tomoriNote", "tomoriEcho", "tomoriNote"],
  {
    tomoriOnly: true,
    nativeOnly: true,
  },
);
registerBackSkills(
  MOVES,
  2,
  "penguin",
  ["penguinCryWave", "penguinCryWave", "penguinCall"],
  {
    tomoriOnly: true,
    penguinOnly: true,
  },
);
registerBackSkills(MOVES, 3, "rana", ["ranaPick", "ranaChord", "ranaParfait"], {
  ranaOnly: true,
});
registerBackSkills(
  MOVES,
  4,
  "riki",
  ["rikiShock", "rikiShockBoost", "rikiShock"],
  { rikiOnly: true },
);

export { MOVES };
