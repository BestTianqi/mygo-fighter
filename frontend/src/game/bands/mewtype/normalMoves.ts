import type { Move } from "../../objects/Move";
import { normalFor, prefixFor } from "./forms";
import { CHARACTERS } from "./roster";

export function registerNormalMoves(MOVES: Record<string, Move>): void {
  const normalNames: Record<number, string[]> = {
    10: ["扩音点拍", "抬肘应援", "高音上挑", "扩音重唱"],
    11: ["蓝熊探弦", "蓝熊肘击", "熊爪上勾", "琴身重拍"],
    12: ["笔尖点墨", "翻页横挥", "分镜挑笔", "分镜侧踢"],
    13: ["指尖切拍", "搓盘回旋", "推盘升拍", "唱片重落"],
    14: ["兔爪轻拨", "跃兔直拳", "琴颈上挑", "兔耳重扫"],
    15: ["指尖试探", "转身横掌", "镜头上挑", "退场重踢"],
  };
  for (const c of CHARACTERS) {
    const prefix = prefixFor({ character: c.id! });
    for (const [stanceIndex, stance] of (
      ["standing", "crouch", "air"] as const
    ).entries())
      for (const [i, button] of ["light", "heavy"].entries()) {
        MOVES[normalFor({ character: c.id! }, button, stance)] = {
          ownerCharacter: c.id,
          form: "virtual",
          name:
            (stance === "standing"
              ? ""
              : stance === "crouch"
                ? "低位·"
                : "空中·") + normalNames[c.id!][i ? 3 : 0],
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
            stance === "air"
              ? "high"
              : stance === "crouch" && !i
                ? "low"
                : "mid",
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
        name: normalNames[c.id!][chain - 1],
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
}
