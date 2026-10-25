import type { FighterIdentity } from "../objects/Fighter";
import type { Scheme } from "../objects/Scheme";
const formFor = () => "virtual";
const prefixFor = (f: FighterIdentity) => `mewtype_${f.character}_virtual`;
const normalFor = (f: FighterIdentity, button: string, stance = "standing") =>
  `${prefixFor(f)}_${stance === "standing" ? "" : stance + "_"}${button}`;
const schemeFor = (f: FighterIdentity): Scheme => ({
  base: ["u", "i", "o"].map((slot) => `${prefixFor(f)}_${slot}`),
  super: `${prefixFor(f)}_super`,
  variants: {
    down1: `${prefixFor(f)}_wave`,
    ...(f.character === 13 ? { down2: `${prefixFor(f)}_guard` } : {}),
    ...(f.character === 14 ? { down2: `${prefixFor(f)}_comfort` } : {}),
  },
});
export { formFor, normalFor, prefixFor, schemeFor };
