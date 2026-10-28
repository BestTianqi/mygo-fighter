import { DEFAULT_BATTLE_RULES } from "../../../game/battleRules";
import type { BattleRules } from "../../../game/objects/BattleRules";

export const BATTLE_RULE_PRESETS: {
  label: string;
  hint: string;
  rules: BattleRules;
}[] = [
  {
    label: "默认",
    hint: "200 生命 · 60 秒 · 标准规则",
    rules: { ...DEFAULT_BATTLE_RULES },
  },
  {
    label: "仅技能",
    hint: "禁用普攻 · 无限能量",
    rules: {
      ...DEFAULT_BATTLE_RULES,
      disableNormals: true,
      infiniteEnergy: true,
    },
  },
  {
    label: "无限火力",
    hint: "无限能量 · 无冷却 · 无限时间",
    rules: {
      ...DEFAULT_BATTLE_RULES,
      infiniteEnergy: true,
      noCooldowns: true,
      infiniteTime: true,
    },
  },
  {
    label: "一击决胜",
    hint: "30 秒 · 命中即决胜，仍可防守",
    rules: { ...DEFAULT_BATTLE_RULES, oneHitKO: true, roundSeconds: 30 },
  },
  {
    label: "月面乱斗",
    hint: "低重力 · 无限跳跃 · 1.25× 移速 · 无限时间",
    rules: {
      ...DEFAULT_BATTLE_RULES,
      infiniteTime: true,
      lowGravity: true,
      infiniteJumps: true,
      speedMultiplier: 1.25,
    },
  },
  {
    label: "吸血拉锯",
    hint: "500 生命 · 180 秒 · 1.5× 伤害 · 初始能量 50",
    rules: {
      ...DEFAULT_BATTLE_RULES,
      vampire: true,
      maxHealth: 500,
      damageMultiplier: 1.5,
      roundSeconds: 180,
      initialEnergy: 50,
    },
  },
];
