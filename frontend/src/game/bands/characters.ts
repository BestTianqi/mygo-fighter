import type { BandId } from "../objects/BandId";
import type { Character } from "../objects/Character";

/** Minimal per-character input; the house defaults fill the rest. */
export type CharacterSpec = Pick<
  Character,
  "name" | "shortName" | "en" | "color" | "role" | "archetype" | "skill"
> &
  Partial<Character> & { id: number; key: string };

const HOUSE_DEFAULTS = {
  specialType: "标准",
  speed: 345,
  jump: 620,
  lightReach: 115,
  heavyReach: 155,
  heavyDamage: 16,
  specialReach: 190,
} as const;

/**
 * Fills the shared house profile so a new band's roster only declares what makes
 * its characters distinct. Bands with their own tuning can pass overrides.
 */
export function bandCharacters(
  id: BandId,
  specs: CharacterSpec[],
): Character[] {
  return specs.map((spec) => {
    const character: Character = {
      ...HOUSE_DEFAULTS,
      description: `${spec.name}使用${spec.skill}。`,
      ...spec,
    };
    // Identity fields stay authoritative even if an override object spreads last.
    character.id = spec.id;
    character.key = spec.key;
    character.bandId = id;
    character.band = spec.band ?? id;
    return character;
  });
}
