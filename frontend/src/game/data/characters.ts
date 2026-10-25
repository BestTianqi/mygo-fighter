import * as mewtype from "../mewtype";
import * as mujica from "../mujica";
import type { FighterIdentity } from "../objects/Fighter";
import { ROSTER } from "./roster";
import { FEEL } from "./rules";
const isMujica = (character: number) => character >= 5 && character < 10;
const kitFor = (f: FighterIdentity) =>
  f.character >= 10 ? mewtype : isMujica(f.character) ? mujica : null;
const PENGUIN_PROFILE = {
  ...ROSTER[2],
  speed: (375 * FEEL.walk) / 345,
  jump: (640 * FEEL.jump) / 620,
};
const profileFor = (f: FighterIdentity) => {
  const profile =
    f.character === 2 && f.penguin ? PENGUIN_PROFILE : ROSTER[f.character];
  return isMujica(f.character) && f.stageForm
    ? { ...profile, speed: profile.speed * mujica.STAGE_FORM.speedMultiplier }
    : profile;
};
function chainPrefix(f: FighterIdentity) {
  return kitFor(f)
    ? kitFor(f)!.prefixFor(f)
    : f.penguin
      ? "penguin"
      : ["anon", "soyo", "tomori", "rana", "riki"][f.character];
}
function firstJab(f: FighterIdentity) {
  return kitFor(f)
    ? kitFor(f)!.normalFor(f, "light")
    : f.penguin
      ? "penguin_light"
      : f.character === 3
        ? "rana_light"
        : f.character === 4
          ? "riki_light"
          : "light";
}
export { chainPrefix, firstJab, isMujica, kitFor, profileFor };
