import { NORMAL_BUTTONS, NORMAL_KEYS } from "../../../data/rules";
import type { Move } from "../../../objects/Move";

export function registerBaseNormals(MOVES: Record<string, Move>): void {
  const normalSpecs: [
    string,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ][] = [
    ["轻拳·起音", 300, 80, 140, 8, 94, 180, 120],
    ["中拳·切分", 390, 120, 180, 11, 115, 240, 150],
    ["重拳·重拍", 520, 170, 240, 16, 126, 300, 210],
    ["轻脚·前奏", 270, 70, 120, 6, 105, 160, 110],
    ["中脚·延音", 420, 130, 200, 12, 145, 260, 180],
    ["重脚·回旋", 590, 210, 280, 18, 175, 350, 250],
  ];
  for (const [stanceIndex, stance] of (
    ["standing", "crouch", "air"] as const
  ).entries()) {
    normalSpecs.forEach(
      ([name, duration, start, end, damage, reach, stun, push], index) => {
        const key =
          (stance === "standing" ? "" : stance + "_") + NORMAL_BUTTONS[index];
        MOVES[key] = {
          name:
            (stance === "crouch" ? "蹲" : stance === "air" ? "空中" : "") +
            name,
          category: "normal",
          stance,
          strength: (index % 3) + 1,
          normalIndex: stanceIndex * 6 + index,
          command:
            (stance === "crouch" ? "↓ + " : stance === "air" ? "跳跃 + " : "") +
            NORMAL_KEYS[index],
          duration,
          start,
          end,
          damage: damage - (stance === "standing" ? 0 : 1),
          reach,
          stun,
          push,
          level:
            stance === "air"
              ? "high"
              : stance === "crouch" && index !== 2
                ? "low"
                : "mid",
          vertical: stance === "crouch" && index === 2 ? 175 : 95,
          knockdown: stance === "crouch" && index === 5 ? 650 : 0,
        };
      },
    );
  }
}
