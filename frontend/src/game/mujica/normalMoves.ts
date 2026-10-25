import type { Move } from "../objects/Move";
import { STAGE_FORM } from "./forms";
import { CHARACTERS } from "./roster";

export function registerNormalMoves(MOVES: Record<string, Move>): void {
  const normalNames: Record<number, string[][]> = {
    5: [
      ["拨弦轻击", "琴颈重拍"],
      ["锚弦轻击", "沉锚重拍"],
    ],
    6: [
      ["琴键轻拍", "茶会重音"],
      ["黑键敲击", "傀儡重音"],
    ],
    7: [
      ["星屑轻拨", "和弦重击"],
      ["悲弦轻斩", "双月重斩"],
    ],
    8: [
      ["寡言轻拨", "琴身重击"],
      ["人偶轻切", "断线重斩"],
    ],
    9: [
      ["镜头轻拍", "开播重击"],
      ["绯红轻敲", "狂爱重拍"],
    ],
  };
  for (const c of CHARACTERS)
    for (const [formIndex, form] of ["normal", "stage"].entries()) {
      const prefix = `mujica_${c.id}_${form}`,
        owner = { ownerCharacter: c.id, form };
      for (const [stanceIndex, stance] of (
        ["standing", "crouch", "air"] as const
      ).entries())
        for (const [i, button] of ["light", "heavy"].entries()) {
          MOVES[
            `${prefix}_${stance === "standing" ? "" : stance + "_"}${button}`
          ] = {
            ...owner,
            name:
              (stance === "standing"
                ? ""
                : stance === "crouch"
                  ? "低位·"
                  : "空中·") + normalNames[c.id!][formIndex][i],
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
            reach:
              (i ? 145 : 110) +
              (formIndex ? 12 : 0) +
              (c.id === 5 || c.id === 8 ? 8 : 0),
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
          name:
            normalNames[c.id!][formIndex][0] +
            "·" +
            (chain === 2 ? "二段" : "终拍"),
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
  MOVES.mujicaTransform = {
    name: "登台变身",
    command: "H / 2P 小键盘7",
    category: "transformation",
    mujicaOnly: true,
    ground: true,
    cost: 50,
    duration: 0,
    start: 0,
    end: 0,
    damage: 10,
    fixedDamage: true,
    omni: true,
    reach: 220,
    vertical: 180,
    stun: 300,
    push: 150,
    chip: 2,
    hitstop: 80,
    lifetime: STAGE_FORM.duration,
  };
}
