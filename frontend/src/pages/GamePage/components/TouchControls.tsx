import { useEffect, useRef, useState, type ReactNode } from "react";
import { schemeFor } from "../../../game/controls";
import type { FighterIdentity } from "../../../game/objects/Fighter";
import type { BattleRules } from "../../../game/objects/BattleRules";
import type { InputController } from "../functions/InputController";
import { TouchStick } from "./TouchStick";

function TouchKey({
  code,
  label,
  input,
  className = "",
  children,
  disabled = false,
}: {
  code: string;
  label: string;
  input: InputController;
  className?: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  const [pressed, setPressed] = useState(false);
  const pointers = useRef(new Set<number>());
  const release = () => {
    pointers.current.clear();
    setPressed(false);
    input.release(code);
  };
  useEffect(() => {
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("blur", release);
      input.release(code);
    };
  }, [input, code]);
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        pointers.current.add(event.pointerId);
        setPressed(true);
        input.press(code, true);
      }}
      onPointerUp={(event) => {
        pointers.current.delete(event.pointerId);
        if (pointers.current.size === 0) release();
      }}
      onPointerCancel={release}
      onLostPointerCapture={(event) => {
        pointers.current.delete(event.pointerId);
        if (pointers.current.size === 0) release();
      }}
      className={`flex touch-none items-center justify-center font-semibold backdrop-blur-sm transition-colors select-none disabled:opacity-30 [-webkit-touch-callout:none] ${
        pressed
          ? "bg-pink-200 text-slate-950"
          : "bg-slate-900/50 text-slate-100"
      } ${className}`}
    >
      {children}
    </button>
  );
}

const actions: [string, string][] = [
  ["KeyU", "技能一"],
  ["KeyI", "技能二"],
  ["KeyO", "技能三"],
  ["KeyP", "大招"],
  ["KeyJ", "普攻"],
  ["KeyK", "重击"],
  ["KeyL", "瞬移"],
];

/** Square action pads stay reachable beside the thumb stick, from phones to tablets. */
const key =
  "size-[clamp(48px,12vw,76px)] landscape:size-[clamp(48px,16dvh,76px)] rounded-none text-[11px] leading-tight shadow-lg sm:text-xs";

export function TouchControls({
  input,
  fighter,
  rules,
}: {
  input: InputController;
  fighter: FighterIdentity;
  rules?: BattleRules;
}) {
  return (
    <div className="w-full touch-none select-none">
      <p className="mb-1.5 text-center text-[10px] text-slate-400 landscape:hidden">
        横屏游玩画面更大
      </p>
      <div
        className="flex w-full items-end justify-between gap-2"
        role="group"
        aria-label="触屏操作"
      >
        <TouchStick input={input} />
        <div className="grid grid-cols-4 gap-1.5 max-[380px]:grid-cols-3 max-[360px]:gap-1 sm:gap-2">
          {[
            ...actions,
            ...(schemeFor(fighter).transform
              ? ([["KeyH", "变身"]] as [string, string][])
              : []),
          ].map(([code, label]) => (
            <TouchKey
              key={code}
              code={code}
              label={label}
              input={input}
              disabled={
                (code === "KeyP" && rules?.disableSupers) ||
                ((code === "KeyJ" || code === "KeyK") &&
                  rules?.disableNormals) ||
                (code === "KeyH" && rules?.disableTransform)
              }
              className={`${key} ${code === "KeyJ" ? "bg-pink-500/35" : code === "KeyP" ? "bg-amber-500/25 text-amber-100" : ""}`}
            >
              {code === "KeyP" ? "✦ 大招" : label}
            </TouchKey>
          ))}
        </div>
      </div>
    </div>
  );
}
