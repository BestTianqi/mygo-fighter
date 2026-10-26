import type { Band } from "../objects/Band";
import type { Character } from "../objects/Character";
import { BAND as mewtype } from "./mewtype";
import { BAND as mujica } from "./mujica";
import { BAND as mygo } from "./mygo";
import { validateBands } from "./validation";

/**
 * The only registry a new band must touch: add its module here. Bands are sorted
 * by character id, so a band may occupy any id range, not just the tail.
 */
const REGISTERED: Band[] = [mygo, mujica, mewtype];

export const BANDS: Band[] = validateBands(REGISTERED);

const BY_CHARACTER: (Band | undefined)[] = [];
for (const band of BANDS)
  for (const character of band.characters)
    BY_CHARACTER[character.id!] = band;

/** Every registered character id resolves to a band; anything else is a bug. */
export function bandFor(character: number): Band {
  const band = BY_CHARACTER[character];
  if (!band) throw new RangeError(`Unknown character id: ${character}`);
  return band;
}

/** Flat character list in id order; shared scaling is applied in data/roster. */
export const CHARACTERS: Character[] = BANDS.flatMap((band) => band.characters);

export { defineBand } from "./contract";
export { validateBands };
