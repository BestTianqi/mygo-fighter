import type { Move } from "../../../../objects/Move";
import { registerBackSkills as registerBackSkillTemplate } from "../../../shared/backSkills";
import type { ChainSpec } from "../../shared/registerChains";
export function registerMoves(MOVES: Record<string, Move>): void {
  Object.assign(MOVES, {
    heal: {
      name: "归心·自愈",
      command: "G / Delete（2P）",
      category: "support",
      soyoOnly: true,
      ground: true,
      duration: 1200,
      start: 700,
      end: 710,
      damage: 0,
      cost: 35,
      healing: 24,
      recast: 12000,
    },
    soyoCutline: {
      name: "剪切线",
      command: "前 + I / 2P 前 + 小键盘5",
      category: "special",
      ownerCharacter: 1,
      soyoOnly: true,
      ground: true,
      duration: 760,
      start: 180,
      end: 440,
      cost: 25,
      damage: 20,
      reach: 360,
      vertical: 105,
      stun: 280,
      push: 0,
      chip: 1,
      pulses: [
        { at: 180, damage: 9, push: 0 },
        { at: 360, damage: 11, stun: 380, push: 280 },
      ],
    },
    summon: {
      name: "小天素罗召唤",
      command: "T / 小键盘 Enter（2P）",
      category: "special",
      soyoOnly: true,
      ground: true,
      duration: 600,
      start: 220,
      end: 240,
      damage: 4,
      cost: 50,
      lifetime: 10000,
      callGap: 1000,
    },
    tensoraHit: {
      name: "小天素罗突袭",
      category: "special",
      internal: true,
      minion: true,
      damage: 4,
      chip: 1,
      stun: 110,
      push: 45,
    },
    soyoSuper: {
      name: "为什么要演奏春日影",
      command: "P / 2P 小键盘−",
      category: "super",
      soyoOnly: true,
      ground: true,
      cost: 100,
      duration: 2800,
      start: 850,
      end: 850,
      damage: 20,
      push: 0,
      hitstop: 0,
      hardStun: 2000,
      reach: 620,
      expansion: 450,
      waveDuration: 700,
      invuln: 850,
    },
  });
}
export function registerBackSkills(moves: Record<string, Move>): void {
  registerBackSkillTemplate(moves, 1, "soyo", ["wave", "wave", "wave"], {
    soyoOnly: true,
  });
}

export const CHAIN = {
  prefix: "soyo",
  source: "light",
  names: ["横掌", "双掌上挑"],
  secondNormalIndex: 1,
  ownership: { soyoOnly: true },
} satisfies ChainSpec;
