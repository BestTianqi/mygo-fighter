import { FEEL } from "../../data/rules";
import type { Move } from "../../objects/Move";

/**
 * Jab timings are authored once for every MyGO normal. This runs before the
 * shared launch/push scaling, so the jab flags and reach feed the chain moves
 * exactly as they did when the pass was a single function.
 */
export function registerMygoJabs(MOVES: Record<string, Move>): void {
  for (const key of ["light", "rana_light", "penguin_light", "riki_light"])
    Object.assign(MOVES[key], {
      duration: 300,
      start: 80,
      end: 130,
      reach: 45 * FEEL.scale,
      stun: 270,
      push: 50 * FEEL.scale,
      jab: true,
    });
  MOVES.throw.reach = 40 * FEEL.scale;
}

/** Creates the internal Jab2/Jab3 follow-ups from the already-scaled normals. */
export function registerMygoChains(MOVES: Record<string, Move>): void {
  for (const [prefix, source] of [
    ["anon", MOVES.light],
    ["soyo", MOVES.light],
    ["tomori", MOVES.light],
    ["rana", MOVES.rana_light],
    ["penguin", MOVES.penguin_light],
    ["riki", MOVES.riki_light],
  ] as [string, Move][]) {
    for (const chain of [2, 3])
      MOVES[prefix + "Jab" + chain] = {
        ...source,
        internal: true,
        chain,
        name:
          (chain === 2 ? "二段·" : "三段·") +
          (
            {
              anon: ["侧踢", "破拍上勾拳"],
              soyo: ["横掌", "双掌上挑"],
              tomori: ["贴身肘击", "麦克风上挑"],
              rana: ["琴身撞击", "琴锋上挑"],
              penguin: ["蹬脚", "企鹅顶撞"],
              riki: ["交叉双棒", "重拍上挑"],
            } as Record<string, string[]>
          )[prefix][chain - 2],
        duration: chain === 2 ? 320 : 450,
        start: chain === 2 ? 80 : 130,
        end: chain === 2 ? 150 : 200,
        jab: true,
        reach: (chain === 2 ? 47 : 51) * FEEL.scale,
        normalIndex:
          chain === 2 && prefix === "anon"
            ? 4
            : chain === 2 && prefix === "penguin"
              ? 3
              : chain - 1,
        strength: chain,
        damage: chain === 2 ? 10 : 17,
        stun: chain === 2 ? 300 : 480,
        push: (chain === 2 ? 65 : 145) * FEEL.scale,
        launch: chain === 3 ? 220 * FEEL.scale : 0,
        anonOnly: prefix === "anon",
        soyoOnly: prefix === "soyo",
        tomoriOnly: prefix === "tomori" || prefix === "penguin",
        ranaOnly: prefix === "rana",
        rikiOnly: prefix === "riki",
        penguinOnly: prefix === "penguin",
      };
  }
}
