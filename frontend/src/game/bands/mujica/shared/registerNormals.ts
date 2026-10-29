import type { Move } from "../../../objects/Move";
export function registerNormals(
  MOVES: Record<string, Move>,
  character: number,
  form: "normal" | "stage",
  names: readonly [string, string],
  reachBonus = 0,
): void {
  const formIndex = form === "stage" ? 1 : 0;

  const prefix = `mujica_${character}_${form}`,
    owner = { ownerCharacter: character, form };
  for (const [stanceIndex, stance] of (
    ["standing", "crouch", "air"] as const
  ).entries())
    for (const [i, button] of ["light", "heavy"].entries()) {
      MOVES[`${prefix}_${stance === "standing" ? "" : stance + "_"}${button}`] =
        {
          ...owner,
          name:
            (stance === "standing"
              ? ""
              : stance === "crouch"
                ? "低位·"
                : "空中·") + names[i],
          command:
            (stance === "standing"
              ? ""
              : stance === "crouch"
                ? "↓＋"
                : "空中＋") + (i ? "K" : "J"),
          category: "normal",
          stance,
          visualSlot:
            stance === "standing"
              ? i
                ? "heavy"
                : "jab-1"
              : stance + "-" + button,
          normalIndex: stanceIndex * 6 + (i ? 2 : 0),
          strength: i ? 3 : 1,
          duration: i ? 500 : 300,
          start: i ? 160 : 80,
          end: i ? 240 : 130,
          damage: (i ? 16 : 8) - (stanceIndex ? 1 : 0),
          reach: (i ? 145 : 110) + (formIndex ? 12 : 0) + reachBonus,
          vertical: stance === "crouch" && i ? 170 : 100,
          level:
            stance === "air"
              ? "high"
              : stance === "crouch" && !i
                ? "low"
                : "mid",
          stun: i ? 340 : 270,
          push: i ? 230 : 180,
          jab: !i && stance === "standing",
        };
    }
  for (const chain of [2, 3])
    MOVES[prefix + "Jab" + chain] = {
      ...MOVES[prefix + "_light"],
      name: names[0] + "·" + (chain === 2 ? "二段" : "终拍"),
      internal: true,
      chain,
      visualSlot: "jab-" + chain,
      duration: chain === 2 ? 320 : 450,
      start: chain === 2 ? 80 : 130,
      end: chain === 2 ? 150 : 200,
      normalIndex: chain - 1,
      strength: chain,
      damage: chain === 2 ? 10 : 17,
      reach: chain === 2 ? 150 : 175,
      stun: chain === 2 ? 300 : 480,
      push: chain === 2 ? 180 : 350,
      launch: chain === 3 ? 350 : 0,
    };
}
