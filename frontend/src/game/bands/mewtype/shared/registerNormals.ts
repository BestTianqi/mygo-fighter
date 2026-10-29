import type { Move } from "../../../objects/Move";
import { normalFor, prefixFor } from "../forms";
export function registerNormals(
  MOVES: Record<string, Move>,
  character: number,
  names: readonly [string, string, string, string],
): void {
  const prefix = prefixFor({ character: character });
  for (const [stanceIndex, stance] of (
    ["standing", "crouch", "air"] as const
  ).entries())
    for (const [i, button] of ["light", "heavy"].entries()) {
      MOVES[normalFor({ character: character }, button, stance)] = {
        ownerCharacter: character,
        form: "virtual",
        name:
          (stance === "standing"
            ? ""
            : stance === "crouch"
              ? "低位·"
              : "空中·") + names[i ? 3 : 0],
        command:
          (stance === "standing"
            ? ""
            : stance === "crouch"
              ? "↓＋"
              : "空中＋") + (i ? "K" : "J"),
        visualSlot:
          stance === "standing"
            ? i
              ? "heavy"
              : "jab-1"
            : stance + "-" + button,
        category: "normal",
        stance,
        normalIndex: stanceIndex * 6 + (i ? 2 : 0),
        strength: i ? 3 : 1,
        duration: i ? 500 : 300,
        start: i ? 160 : 80,
        end: i ? 240 : 130,
        damage: (i ? 16 : 8) - (stanceIndex ? 1 : 0),
        reach: i ? 155 : 115,
        vertical: stance === "crouch" && i ? 170 : 105,
        level:
          stance === "air" ? "high" : stance === "crouch" && !i ? "low" : "mid",
        stun: i ? 340 : 270,
        push: i ? 220 : 160,
        jab: !i && stance === "standing",
      };
    }
  for (const chain of [2, 3])
    MOVES[prefix + "Jab" + chain] = {
      ...MOVES[prefix + "_light"],
      internal: true,
      chain,
      name: names[chain - 1],
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
