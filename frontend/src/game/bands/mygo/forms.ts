import type { FighterIdentity } from "../../objects/Fighter";
import type { Scheme } from "../../objects/Scheme";

/** MyGO keeps one form; skill slots are per character, penguin is a variant. */
const SCHEMES: Scheme[] = [
  {
    base: ["shield", "wave", "special"],
    super: "super",
    variants: {
      down1: "rising",
      forward1: "thrust",
      back1: "anonCry",
      down2: "sonic",
      back2: "waveLight",
      forward2: "waveHeavy",
      down3: "rush",
      back3: "spin",
      airDown3: "dive",
    },
  },
  {
    base: ["summon", "wave", "special"],
    super: "soyoSuper",
    variants: { down2: "heal", forward2: "soyoCutline" },
  },
  {
    base: ["tomoriEcho", "tomoriNote", "tomoriChorus"],
    super: "tomoriSuper",
    transform: "penguinTransform",
    variants: {},
  },
  {
    base: ["ranaRush", "ranaParfait", "ranaSolo"],
    super: "ranaSuper",
    variants: {
      down1: "ranaRise",
      forward1: "ranaSlide",
      down2: "ranaTune",
      forward2: "ranaChord",
      down3: "ranaPick",
      airDown3: "ranaDive",
    },
  },
  {
    base: ["rikiRoll", "rikiShock", "rikiEight"],
    super: "rikiSuper",
    variants: {
      down1: "rikiOverhead",
      forward1: "rikiRush",
      down2: "rikiCalibrate",
      forward2: "rikiRise",
    },
  },
];

const PENGUIN_SCHEME: Scheme = {
  base: ["penguinCry", "penguinHey", "penguinCall"],
  super: "penguinSuper",
  variants: {
    forward1: "penguinKick",
    down2: "penguinLaugh",
    airDown3: "penguinKick",
  },
};

const formFor = () => "base";

const schemeFor = (f: FighterIdentity) =>
  f.character === 2 && f.penguin ? PENGUIN_SCHEME : SCHEMES[f.character];

const chainPrefix = (f: FighterIdentity) =>
  f.penguin
    ? "penguin"
    : ["anon", "soyo", "tomori", "rana", "riki"][f.character];

const firstJab = (f: FighterIdentity) =>
  f.penguin
    ? "penguin_light"
    : f.character === 3
      ? "rana_light"
      : f.character === 4
        ? "riki_light"
        : "light";

export {
  SCHEMES,
  PENGUIN_SCHEME,
  chainPrefix,
  firstJab,
  formFor,
  schemeFor,
};
