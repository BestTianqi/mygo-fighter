import type { Move } from "../../objects/Move";
import { registerBackSkills } from "../shared/backSkills";
import * as arale from "./characters/arale/virtual";
import * as miyako from "./characters/miyako/virtual";
import * as nonoka from "./characters/nonoka/virtual";
import * as ritsu from "./characters/ritsu/virtual";
import * as viola from "./characters/viola/virtual";
import * as yuno from "./characters/yuno/virtual";
import { CHARACTERS } from "./roster";
const CAST = [arale, ritsu, miyako, yuno, nonoka];
const GUESTS = [viola];
/** Guest-form moves follow the original cast's passes, preserving move-list order. */
const MOVES: Record<string, Move> = {};
for (const form of [...CAST, ...GUESTS]) form.registerNormals(MOVES);
for (const form of CAST) form.registerSkills(MOVES);
for (const form of CAST) form.registerWave(MOVES);
for (const form of CAST) form.registerSuper(MOVES);
for (const form of GUESTS) {
  form.registerSkills(MOVES);
  form.registerWave(MOVES);
  form.registerSuper(MOVES);
}
for (const character of CHARACTERS) {
  const prefix = `mewtype_${character.id}_virtual`;
  const source = `${prefix}_wave`;
  registerBackSkills(MOVES, character.id!, prefix, [source, source, source], {
    form: "virtual",
  });
}
export { MOVES };
