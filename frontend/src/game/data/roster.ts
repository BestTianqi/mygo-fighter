import { BANDS } from "../bands";
import type { Character } from "../objects/Character";
import { FEEL } from "./rules";

/** Shared roster assembly: bands only declare profiles; scaling applies here. */
const ROSTER: Character[] = BANDS.flatMap((band) => band.characters);
for (const profile of ROSTER) {
  profile.speed *= FEEL.walk / 345;
  profile.jump *= FEEL.jump / 620;
}

export { ROSTER };
