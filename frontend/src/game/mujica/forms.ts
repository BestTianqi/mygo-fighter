import type { FighterIdentity } from "../objects/Fighter";
import type { Scheme } from "../objects/Scheme";
import { withBackSkills } from "../bands/shared/backSkills";
const formFor = (f: FighterIdentity) => (f.stageForm ? "stage" : "normal");
const prefixFor = (f: FighterIdentity) => `mujica_${f.character}_${formFor(f)}`;
const normalFor = (f: FighterIdentity, button: string, stance = "standing") =>
  `${prefixFor(f)}_${stance === "standing" ? "" : stance + "_"}${button}`;
const schemeFor = (f: FighterIdentity): Scheme =>
  withBackSkills(
    {
      base: ["u", "i", "o"].map((k) => `${prefixFor(f)}_${k}`),
      super: `${prefixFor(f)}_super`,
      transform: f.stageForm ? undefined : "mujicaTransform",
      variants:
        f.character === 5 && formFor(f) === "stage"
          ? { down1: "mujica_5_stage_schedule" }
          : f.character === 6 && formFor(f) === "normal"
            ? { down1: "mujica_6_normal_customer" }
            : f.character === 7 && formFor(f) === "stage"
              ? { down1: "mujica_7_stage_crescent" }
              : f.character === 8 && formFor(f) === "stage"
                ? {
                    down1: "mujica_8_stage_toddler",
                    down2: "mujica_8_stage_burger",
                  }
                : f.character === 9 && formFor(f) === "stage"
                  ? { down1: "mujica_9_stage_smile" }
                  : {},
    },
    prefixFor(f),
  );
const STAGE_FORM = Object.freeze({
  duration: 20000,
  damageMultiplier: 1.2,
  speedMultiplier: 1.1,
  normalRangeMultiplier: 1.1,
});
export { formFor, normalFor, prefixFor, schemeFor, STAGE_FORM };
