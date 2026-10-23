export const actions = [
  "left",
  "right",
  "jump",
  "crouch",
  "light",
  "heavy",
  "blink",
  "skill1",
  "skill2",
  "skill3",
  "transform",
  "super",
] as const;
export type Action = (typeof actions)[number];
export type Direction = Partial<
  Record<"left" | "right" | "jump" | "crouch", boolean>
>;
export type Input = Partial<
  Record<
    | Action
    | "guard"
    | "dash"
    | "special"
    | "wave"
    | "throw"
    | "rising"
    | "overhead"
    | "sonic"
    | "thrust"
    | "rush"
    | "dive"
    | "spin"
    | "shield"
    | "summon"
    | "heal"
    | "soyoSuper"
    | "soyoCutline"
    | "tomoriNote"
    | "tomoriEcho"
    | "tomoriChorus"
    | "penguinTransform"
    | "penguinCry"
    | "penguinHey"
    | "penguinLaugh"
    | "penguinCall"
    | "penguinKick"
    | "penguinSuper"
    | "ranaRush"
    | "ranaParfait"
    | "ranaSolo"
    | "ranaPick"
    | "ranaRise"
    | "ranaSlide"
    | "ranaChord"
    | "ranaDive"
    | "ranaTune"
    | "ranaSuper"
    | "rikiRoll"
    | "rikiRush"
    | "rikiOverhead"
    | "rikiShock"
    | "rikiRise"
    | "rikiEight"
    | "rikiCalibrate"
    | "rikiSuper"
    | "waveLight"
    | "waveHeavy",
    boolean
  >
> & {
  unified?: boolean;
  touchLight?: boolean;
  pressIds?: Record<string, number>;
  pressDirections?: Record<string, Direction>;
};
