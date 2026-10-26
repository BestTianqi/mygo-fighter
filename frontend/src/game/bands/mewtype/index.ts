import * as mewtype from "../../mewtype";
import type { Band } from "../../objects/Band";
import { defineBand } from "../contract";
import { isUniversalMove } from "../shared/universalMoves";
import { MEWTYPE_ABILITY } from "./ability";
import { tuneMewtype } from "./tune";

const BAND: Band = defineBand({
  id: "mewtype",
  label: "夢限大 MEWTYPE",
  characters: mewtype.CHARACTERS,
  moves: mewtype.MOVES,
  forms: ["virtual"],
  formFor: mewtype.formFor,
  prefixFor: mewtype.prefixFor,
  normalFor: mewtype.normalFor,
  schemeFor: mewtype.schemeFor,
  movesFor: (all, character) =>
    Object.entries(all)
      .filter(([key, move]) => {
        if (move.internal) return false;
        return (
          key === "throw" ||
          (move.ownerCharacter === character && move.form === "virtual")
        );
      })
      .map(([key, move]) => ({ key, ...move })),
  owns: (f, move, name) =>
    isUniversalMove(name) ||
    (move.ownerCharacter === f.character &&
      (!move.form || move.form === "virtual")),
  ...MEWTYPE_ABILITY,
  tune: tuneMewtype,
});

export { BAND };
