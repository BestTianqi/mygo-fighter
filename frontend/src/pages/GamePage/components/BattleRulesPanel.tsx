import { useEffect, useState } from "react";
import {
  DAMAGE_MULTIPLIERS,
  SPEED_MULTIPLIERS,
  maxBanCount,
  teamSizeFor,
} from "../../../game/battleRules";
import type { BattleRules } from "../../../game/objects/BattleRules";
import type { Format } from "../../../game/objects/MatchOptions";
import { BATTLE_RULE_PRESETS } from "../functions/battleRulePresets";

const toggleGroups = [
  {
    title: "时间与能量",
    items: [
      ["infiniteTime", "无限时间", "不因时间结束而判胜，击倒仍可决胜"],
      ["infiniteEnergy", "无限能量", "技能始终拥有足够能量"],
    ],
  },
  {
    title: "招式限制",
    items: [
      ["disableNormals", "禁用普攻", "关闭 J / K 普通攻击"],
      ["disableSupers", "禁用大招", "关闭 P 大招"],
      ["disableTransform", "禁用变身", "关闭 H 变身"],
      ["disableGuard", "禁用防御", "关闭空格与后退防御，保留护盾与反击"],
    ],
  },
  {
    title: "趣味规则",
    items: [
      ["noCooldowns", "无冷却", "取消技能冷却，保留出招与后摇"],
      ["oneHitKO", "一击击倒", "未被防住的有效伤害直接击倒；护盾与招架仍有效"],
      ["vampire", "吸血", "回复实际伤害的 25%，与角色吸血效果取较高值"],
      ["lowGravity", "低重力", "重力降至 60%，跳跃更轻盈"],
      ["infiniteJumps", "无限跳跃", "空中可继续跳跃，不限制次数"],
    ],
  },
] as const;
const fieldClass =
  "min-h-11 w-full min-w-0 rounded-none bg-[#30251a]/6 px-3 py-2 text-sm text-[#211f1a] focus-visible:outline-2 focus-visible:outline-cyan-200 disabled:opacity-50";

function RuleNumberInput({
  label,
  value,
  min,
  max,
  disabled = false,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <label className="grid min-w-0 gap-1 text-xs text-[#80786d]">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step={1}
        value={draft}
        disabled={disabled}
        className={fieldClass}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        onBlur={() => {
          const next =
            draft.trim() && Number.isFinite(Number(draft))
              ? Math.max(min, Math.min(max, Math.round(Number(draft))))
              : value;
          setDraft(String(next));
          if (next !== value) onChange(next);
        }}
      />
    </label>
  );
}

export function BattleRulesPanel({
  rules,
  format,
  rosterSize,
  onChange,
  disabled = false,
  readOnly = false,
  practice = false,
}: {
  rules: BattleRules;
  format: Format;
  rosterSize: number;
  onChange: (changes: Partial<BattleRules>) => void;
  disabled?: boolean;
  readOnly?: boolean;
  practice?: boolean;
}) {
  const brawl = format === "3ffa";
  const maxBans =
    practice || brawl ? 0 : maxBanCount(teamSizeFor(format), rosterSize);
  const enabled = toggleGroups
    .flatMap((group) =>
      group.items.map(([key, label]) =>
        key !== "infiniteTime" && rules[key] ? label : null,
      ),
    )
    .filter((label) => label !== null);
  const summary = [
    `生命 ${rules.maxHealth}`,
    rules.infiniteTime ? "∞ 无限时间" : `${rules.roundSeconds} 秒`,
    `每方禁用 ${rules.banCount} 名`,
    ...(rules.damageMultiplier !== 1
      ? [`伤害 ${rules.damageMultiplier}×`]
      : []),
    ...(rules.speedMultiplier !== 1 ? [`移速 ${rules.speedMultiplier}×`] : []),
    ...(rules.initialEnergy > 0 && !rules.infiniteEnergy
      ? [`初始能量 ${rules.initialEnergy}`]
      : []),
    ...enabled.slice(0, 3),
    ...(enabled.length > 3 ? [`另 ${enabled.length - 3} 项`] : []),
  ];
  return (
    <details className="mt-3 bg-[#30251a]/4 px-3 py-1 text-[#211f1a]">
      <summary className="min-h-11 cursor-pointer py-2 text-xs focus-visible:outline-2 focus-visible:outline-cyan-200">
        <strong className="mr-3 font-semibold">自定义对战规则</strong>
        <span className="leading-6 text-[#80786d]">{summary.join(" · ")}</span>
        {readOnly && <span className="ml-3 text-[#946b2a]">房主设置</span>}
      </summary>
      <fieldset disabled={disabled || readOnly} className="min-w-0 pb-3">
        <legend className="sr-only">自定义对战规则</legend>
        <div className="mb-4">
          <p className="mb-2 text-[10px] text-[#80786d]">
            快捷预设 · 应用后仍可逐项调整
          </p>
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {BATTLE_RULE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChange({ ...preset.rules })}
                aria-label={preset.label}
                className="min-h-14 min-w-0 bg-[#f5f0e5]/70 px-3 py-2 text-left text-xs text-[#8f354e] hover:bg-[#a44761]/8 disabled:cursor-default disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-cyan-200"
              >
                <span className="font-semibold">{preset.label}</span>
                <small className="mt-1 block text-[10px] leading-4 text-[#80786d]">
                  {preset.hint}
                </small>
              </button>
            ))}
          </div>
        </div>
        <section aria-label="基础参数">
          <h3 className="mb-2 text-xs font-semibold text-[#946b2a]">
            基础参数
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <RuleNumberInput
              label="每名角色生命值 · 50–2000"
              value={rules.maxHealth}
              min={50}
              max={2000}
              onChange={(maxHealth) => onChange({ maxHealth })}
            />
            <label className="grid min-w-0 gap-1 text-xs text-[#80786d]">
              每方禁用角色数
              {practice
                ? " · 练习模式不禁选"
                : brawl
                  ? " · 混战自由选人"
                  : " · 随阵容人数调整"}
              <select
                className={fieldClass}
                disabled={practice || brawl}
                value={rules.banCount}
                onChange={(event) =>
                  onChange({ banCount: Number(event.target.value) })
                }
              >
                {Array.from({ length: maxBans + 1 }, (_, count) => (
                  <option key={count} value={count}>
                    {count === 0 ? "0 · 自由选人" : `${count} · 先禁后选`}
                  </option>
                ))}
              </select>
            </label>
            <RuleNumberInput
              label="回合时长 · 30–300 秒"
              value={rules.roundSeconds}
              min={30}
              max={300}
              disabled={rules.infiniteTime}
              onChange={(roundSeconds) => onChange({ roundSeconds })}
            />
            <RuleNumberInput
              label="初始能量 · 0–100"
              value={rules.initialEnergy}
              min={0}
              max={100}
              disabled={rules.infiniteEnergy}
              onChange={(initialEnergy) => onChange({ initialEnergy })}
            />
            <label className="grid min-w-0 gap-1 text-xs text-[#80786d]">
              伤害倍率
              <select
                className={fieldClass}
                value={rules.damageMultiplier}
                onChange={(event) =>
                  onChange({ damageMultiplier: Number(event.target.value) })
                }
              >
                {DAMAGE_MULTIPLIERS.map((multiplier) => (
                  <option key={multiplier} value={multiplier}>
                    {multiplier}×{multiplier === 1 ? " · 标准" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid min-w-0 gap-1 text-xs text-[#80786d]">
              移动速度倍率 · 不影响出招速度
              <select
                className={fieldClass}
                value={rules.speedMultiplier}
                onChange={(event) =>
                  onChange({ speedMultiplier: Number(event.target.value) })
                }
              >
                {SPEED_MULTIPLIERS.map((multiplier) => (
                  <option key={multiplier} value={multiplier}>
                    {multiplier}×{multiplier === 1 ? " · 标准" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
        {toggleGroups.map((group) => (
          <section key={group.title} className="mt-4" aria-label={group.title}>
            <h3 className="mb-1 text-xs font-semibold text-[#946b2a]">
              {group.title}
            </h3>
            <div className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map(([key, label, hint]) => (
                <label
                  key={key}
                  className="flex min-h-16 min-w-0 cursor-pointer items-center gap-3 py-2 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={rules[key]}
                    onChange={(event) =>
                      onChange({ [key]: event.target.checked })
                    }
                    className="size-4 shrink-0 accent-[#a44761]"
                  />
                  <span>
                    {label}
                    <small className="mt-1 block text-[10px] leading-4 text-[#80786d]">
                      {hint}
                    </small>
                  </span>
                </label>
              ))}
            </div>
          </section>
        ))}
        <p className="mt-3 text-[10px] leading-5 text-[#80786d]">
          {rules.banCount > 0
            ? "双方轮流禁用角色，再轮流选择互不重复的阵容。更改禁用人数会重新禁选。"
            : brawl
              ? "每队角色不可重复，三方可选择相同角色。击倒后 5 秒由下一名上场。"
              : "每队角色不可重复，双方可选择相同角色。"}
          {readOnly ? "规则由房主调整。" : "快捷预设会重置全部规则及禁用人数。"}
        </p>
      </fieldset>
    </details>
  );
}
