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
    label: "游击充能",
    hint: "每秒 10 能量 · 免费冲刺 · 1.25× 移速",
    rules: {
      ...DEFAULT_BATTLE_RULES,
      energyRegen: 10,
      freeDash: true,
      speedMultiplier: 1.25,
    },
  },
  {
    label: "再生拉锯",
    hint: "每秒回复 5 生命 · 300 生命 · 120 秒",
    rules: {
      ...DEFAULT_BATTLE_RULES,
      healthRegen: 5,
      maxHealth: 300,
      roundSeconds: 120,
    },
  },
  {
    label: "弹珠乱斗",
    hint: "3× 击退 · 低重力 · 免费冲刺 · 每秒 5 能量",
    rules: {
      ...DEFAULT_BATTLE_RULES,
      knockbackMultiplier: 3,
      lowGravity: true,
      freeDash: true,
      energyRegen: 5,
    },
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
