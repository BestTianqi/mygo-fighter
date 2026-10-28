import { useEffect, useState } from "react";
import {
  DEFAULT_BATTLE_RULES,
  maxBanCount,
  teamSizeFor,
} from "../../../game/battleRules";
import type { BattleRules } from "../../../game/objects/BattleRules";
import type { Format } from "../../../game/objects/MatchOptions";

const toggles = [
  ["disableSupers", "禁用大招", "关闭 P 大招"],
  ["infiniteEnergy", "无限能量", "技能始终拥有足够能量"],
  ["disableNormals", "禁用普攻", "关闭 J / K 普通攻击"],
  ["disableTransform", "禁用变身", "关闭 H 变身"],
  ["noCooldowns", "无冷却", "取消技能冷却，保留出招与后摇"],
] as const;
const fieldClass =
  "min-h-11 rounded-none bg-[#30251a]/6 px-3 py-2 text-sm text-[#211f1a] focus-visible:outline-2 focus-visible:outline-cyan-200 disabled:opacity-60";

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
  const [health, setHealth] = useState(String(rules.maxHealth));
  useEffect(() => setHealth(String(rules.maxHealth)), [rules.maxHealth]);
  const maxBans = practice ? 0 : maxBanCount(teamSizeFor(format), rosterSize);
  const enabled = toggles
    .filter(([key]) => rules[key])
    .map(([, label]) => label);
  return (
    <details className="mt-3 bg-[#30251a]/4 px-3 py-1 text-[#211f1a]">
      <summary className="min-h-11 cursor-pointer py-2 text-xs focus-visible:outline-2 focus-visible:outline-cyan-200">
        <strong className="mr-3 font-semibold">自定义对战规则</strong>
        <span className="leading-6 text-[#80786d]">
          生命 {rules.maxHealth} · 每方禁用 {rules.banCount} 名
          {enabled.length ? ` · ${enabled.join(" · ")}` : " · 标准技能"}
        </span>
        {readOnly && <span className="ml-3 text-[#946b2a]">房主设置</span>}
      </summary>
      <fieldset disabled={disabled || readOnly} className="pb-3">
        <legend className="sr-only">自定义对战规则</legend>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[10px] text-[#80786d]">快捷预设</span>
          {[
            { label: "默认", rules: { ...DEFAULT_BATTLE_RULES } },
            {
              label: "仅技能",
              rules: {
                ...DEFAULT_BATTLE_RULES,
                disableNormals: true,
                infiniteEnergy: true,
              },
            },
            {
              label: "无限火力",
              rules: {
                ...DEFAULT_BATTLE_RULES,
                infiniteEnergy: true,
                noCooldowns: true,
              },
            },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange(preset.rules)}
              className="min-h-11 px-3 text-xs text-[#8f354e] hover:bg-[#a44761]/8 disabled:cursor-default disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-cyan-200"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs text-[#80786d]">
            每名角色生命值 · 50–2000
            <input
              type="number"
              min={50}
              max={2000}
              step={1}
              value={health}
              className={fieldClass}
              onChange={(event) => setHealth(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              onBlur={() => {
                const value = Number(health);
                const next =
                  health.trim() && Number.isFinite(value)
                    ? Math.max(50, Math.min(2000, Math.round(value)))
                    : rules.maxHealth;
                setHealth(String(next));
                if (next !== rules.maxHealth) onChange({ maxHealth: next });
              }}
            />
          </label>
          <label className="grid gap-1 text-xs text-[#80786d]">
            每方禁用角色数{practice ? " · 练习模式不禁选" : " · 随阵容人数调整"}
            <select
              className={fieldClass}
              disabled={practice}
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
        </div>
        <div className="mt-3 grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
          {toggles.map(([key, label, hint]) => (
            <label
              key={key}
              className="flex min-h-14 cursor-pointer items-center gap-3 text-xs"
            >
              <input
                type="checkbox"
                checked={rules[key]}
                onChange={(event) => onChange({ [key]: event.target.checked })}
                className="size-4 accent-[#a44761]"
              />
              <span>
                {label}
                <small className="mt-1 block text-[10px] text-[#80786d]">
                  {hint}
                </small>
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-[10px] leading-5 text-[#80786d]">
          {rules.banCount > 0
            ? "双方轮流禁用角色，再轮流选择互不重复的阵容。更改禁用人数会重新禁选。"
            : "每队角色不可重复，双方可选择相同角色。"}
          {readOnly ? "规则由房主调整。" : ""}
        </p>
      </fieldset>
    </details>
  );
}
