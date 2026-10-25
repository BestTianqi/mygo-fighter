import type { Move } from "../objects/Move";
import { isMujica } from "./characters";
export function listMoves(
  MOVES: Record<string, Move>,
  character: number,
  penguin = false,
) {
  return Object.entries(MOVES)
    .filter(([key, move]) => {
      if (move.internal) return false;
      if (character >= 10)
        return (
          key === "throw" ||
          (move.ownerCharacter === character && move.form === "virtual")
        );
      if (isMujica(character))
        return (
          key === "throw" ||
          key === "mujicaTransform" ||
          (move.ownerCharacter === character &&
            move.form === (penguin ? "stage" : "normal"))
        );
      if (
        (move.ownerCharacter !== undefined &&
          move.ownerCharacter !== character) ||
        move.mujicaOnly
      )
        return false;
      if (character === 0)
        return (
          !move.soyoOnly && !move.tomoriOnly && !move.ranaOnly && !move.rikiOnly
        );
      if (character === 2)
        return penguin
          ? move.penguinOnly || key === "throw"
          : !move.penguinOnly &&
              (["light", "heavy", "throw"].includes(key) || move.tomoriOnly);
      if (character === 3) return move.ranaOnly || key === "throw";
      if (character === 4) return move.rikiOnly || key === "throw";
      return (
        ["light", "heavy", "special", "wave", "throw"].includes(key) ||
        (character === 1 &&
          ["summon", "heal", "soyoSuper", "soyoCutline"].includes(key))
      );
    })
    .map(([key, move]) => ({
      key,
      ...move,
      name:
        character === 1
          ? (
              {
                special: "回响终章",
                light: "轻掌·试探",
                heavy: "双掌·推拍",
              } as Record<string, string>
            )[key] || move.name
          : character === 2
            ? (
                {
                  light: "轻击·试探",
                  heavy: "重击·前行",
                  throw: penguin ? "鳍抱·摔投" : move.name,
                } as Record<string, string>
              )[key] || move.name
            : move.name,
      command:
        character !== 0 && key === "wave"
          ? "I"
          : character !== 0 && key === "throw"
            ? penguin || character >= 3
              ? "B（后投：← + B）"
              : "U（后投：← + U）"
            : move.command,
    }));
}
