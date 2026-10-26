import * as mujica from "../../mujica";
import type { Band } from "../../objects/Band";
import type { Character } from "../../objects/Character";
import { defineBand } from "../contract";
import { isUniversalMove } from "../shared/universalMoves";
import { MUJICA_ABILITY } from "./ability";
import { tuneMujica } from "./tune";

const profileFor = (f: Parameters<Band["profileFor"]>[0]): Character => {
  const profile = mujica.CHARACTERS.find(
    (character) => character.id === f.character,
  )!;
  return f.stageForm
    ? {
        ...profile,
        speed: profile.speed * mujica.STAGE_FORM.speedMultiplier,
        lightReach:
          profile.lightReach * mujica.STAGE_FORM.normalRangeMultiplier,
        heavyReach:
          profile.heavyReach * mujica.STAGE_FORM.normalRangeMultiplier,
      }
    : profile;
};

const BAND: Band = defineBand({
  id: "mujica",
  label: "AVE MUJICA",
  characters: mujica.CHARACTERS,
  moves: mujica.MOVES,
  forms: ["normal", "stage"],
  formFor: mujica.formFor,
  prefixFor: mujica.prefixFor,
  normalFor: mujica.normalFor,
  schemeFor: mujica.schemeFor,
  movesFor: (all, character, penguin) =>
    Object.entries(all)
      .filter(([key, move]) => {
        if (move.internal) return false;
        return (
          key === "throw" ||
          (key === "mujicaTransform" && !penguin) ||
          (move.ownerCharacter === character &&
            move.form === (penguin ? "stage" : "normal"))
        );
      })
      .map(([key, move]) => ({ key, ...move })),
  owns: (f, move, name) =>
    isUniversalMove(name) ||
    (move.ownerCharacter === f.character &&
      (!move.form || move.form === mujica.formFor(f))),
  profileFor,
  ...MUJICA_ABILITY,
  tune: tuneMujica,
  transform: {
    move: "mujicaTransform",
    duration: mujica.STAGE_FORM.duration,
    energy: 50,
    damageMultiplier: mujica.STAGE_FORM.damageMultiplier,
    speedMultiplier: mujica.STAGE_FORM.speedMultiplier,
  },
});

export { BAND };
