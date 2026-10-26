import type {
  Band,
  BandTransform,
  BindingRow,
  MoveRow,
  Stance,
} from "../objects/Band";
import { BAND_LABEL, type BandId } from "../objects/BandId";
import type { Character } from "../objects/Character";
import type { FighterIdentity } from "../objects/Fighter";
import type { Move } from "../objects/Move";
import type { Scheme } from "../objects/Scheme";
import { isUniversalMove } from "./shared/universalMoves";

/** Declarative input for a band module; everything else falls back to defaults. */
export interface BandSpec {
  id: BandId;
  label?: string;
  characters: Character[];
  moves: Record<string, Move>;
  forms?: string[];
  unified?: boolean;
  formFor?: (f: FighterIdentity) => string;
  prefixFor?: (f: FighterIdentity) => string;
  normalFor?: (f: FighterIdentity, button: string, stance?: Stance) => string;
  schemeFor?: (f: FighterIdentity) => Scheme;
  movesFor?: (
    all: Record<string, Move>,
    character: number,
    penguin?: boolean,
  ) => MoveRow[];
  owns?: (f: FighterIdentity, move: Move, name: string) => boolean;
  profileFor?: (f: FighterIdentity) => Character;
  stanceLocked?: (f: FighterIdentity) => boolean;
  cancelDepth?: (f: FighterIdentity) => number;
  command?: NonNullable<Band["command"]>;
  skill?: NonNullable<Band["skill"]>;
  airCancel?: NonNullable<Band["airCancel"]>;
  extraCancel?: NonNullable<Band["extraCancel"]>;
  beforeStart?: NonNullable<Band["beforeStart"]>;
  onStart?: NonNullable<Band["onStart"]>;
  ai?: NonNullable<Band["ai"]>;
  extraBindings?: (f: FighterIdentity) => BindingRow[];
  tune?: Band["tune"];
  transform?: BandTransform;
  presentation?: Band["presentation"];
}

const characterIndex = (characters: Character[], character: number) => {
  const found = characters.find((entry) => entry.id === character);
  if (!found) throw new RangeError(`Character ${character} is not in this band`);
  return found;
};

/**
 * Builds a band, filling in the standard move-key scheme and ownership rules.
 * A band without special mechanics only needs `id`, `characters` and `moves`.
 */
export function defineBand(spec: BandSpec): Band {
  if (!spec.characters.length)
    throw new Error(`Band ${spec.id} must declare at least one character`);
  const characters = [...spec.characters].sort(
    (a, b) => (a.id ?? 0) - (b.id ?? 0),
  );
  characters.forEach((character, index) => {
    if (character.id === undefined)
      throw new Error(
        `Band ${spec.id} character ${index} requires an explicit id`,
      );
    if (index > 0 && character.id !== characters[index - 1].id! + 1)
      throw new Error(`Band ${spec.id} character ids must be consecutive`);
    character.bandId = spec.id;
    character.band ??= spec.id;
  });
  const forms = spec.forms?.length ? [...spec.forms] : ["base"];
  const formFor =
    spec.formFor ?? ((f: FighterIdentity) => band_form(forms, f, spec.id));
  const prefixFor =
    spec.prefixFor ??
    ((f: FighterIdentity) => `${spec.id}_${f.character}_${formFor(f)}`);
  const normalFor =
    spec.normalFor ??
    ((f: FighterIdentity, button: string, stance: Stance = "standing") =>
      `${prefixFor(f)}_${stance === "standing" ? "" : stance + "_"}${button}`);
  const schemeFor =
    spec.schemeFor ??
    ((f: FighterIdentity): Scheme => ({
      base: ["u", "i", "o"].map((slot) => `${prefixFor(f)}_${slot}`),
      super: `${prefixFor(f)}_super`,
      variants: {},
    }));
  const movesFor =
    spec.movesFor ??
    ((all: Record<string, Move>, character: number): MoveRow[] =>
      Object.entries(all)
        .filter(
          ([key, move]) =>
            !move.internal &&
            (isUniversalMove(key) ||
              (move.ownerCharacter === character &&
                (!move.form || move.form === formFor({ character })))),
        )
        .map(([key, move]) => ({ key, ...move })));
  const owns =
    spec.owns ??
    ((f: FighterIdentity, move: Move, name: string) => {
      const owned =
        move.ownerCharacter === f.character || isUniversalMove(name);
      return owned && (!move.form || move.form === formFor(f));
    });
  const profileFor =
    spec.profileFor ??
    ((f: FighterIdentity) => characterIndex(characters, f.character));

  return {
    id: spec.id,
    label: spec.label ?? BAND_LABEL[spec.id] ?? spec.id,
    characters,
    moves: spec.moves,
    forms,
    unified: spec.unified ?? false,
    formFor,
    prefixFor,
    normalFor,
    schemeFor,
    movesFor,
    owns,
    profileFor,
    stanceLocked: spec.stanceLocked ?? (() => true),
    cancelDepth: spec.cancelDepth ?? (() => 4),
    ...(spec.command ? { command: spec.command } : {}),
    ...(spec.skill ? { skill: spec.skill } : {}),
    ...(spec.airCancel ? { airCancel: spec.airCancel } : {}),
    ...(spec.extraCancel ? { extraCancel: spec.extraCancel } : {}),
    ...(spec.beforeStart ? { beforeStart: spec.beforeStart } : {}),
    ...(spec.onStart ? { onStart: spec.onStart } : {}),
    ...(spec.ai ? { ai: spec.ai } : {}),
    ...(spec.extraBindings ? { extraBindings: spec.extraBindings } : {}),
    ...(spec.tune ? { tune: spec.tune } : {}),
    ...(spec.transform ? { transform: spec.transform } : {}),
    ...(spec.presentation ? { presentation: spec.presentation } : {}),
  };
}

/** Default single-form behaviour: the declared form, or the penguin variant. */
function band_form(forms: string[], _f: FighterIdentity, id: BandId) {
  if (forms.length !== 1)
    throw new Error(
      `Band ${id} declares ${forms.length} forms but has no formFor selector`,
    );
  return forms[0];
}
