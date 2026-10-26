import { useEffect, useRef, useState, type ReactNode } from "react";
import { schemeFor } from "../../../game/controls";
import type { FighterIdentity } from "../../../game/objects/Fighter";
import type { InputController } from "../functions/InputController";

function TouchKey({
  code,
  label,
  input,
  className = "",
  children,
}: {
  code: string;
  label: string;
  input: InputController;
  className?: string;
  children: ReactNode;
}) {
  const [pressed, setPressed] = useState(false);
  const pointers = useRef(new Set<number>());
  const release = () => {
    pointers.current.clear();
    setPressed(false);
    input.release(code);
  };
  useEffect(() => () => input.release(code), [input, code]);
  return (
    <button
      type="button"
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
      onLostPointerCapture={release}
      className={`flex touch-none items-center justify-center border font-semibold transition-colors select-none [-webkit-touch-callout:none] ${
        pressed
          ? "border-pink-100 bg-pink-200 text-slate-950"
          : "border-white/20 bg-slate-900/70 text-slate-100"
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

/** Big, translucent pads anchored to both thumbs. Keys stay square from 320px to tablets. */
const key =
  "size-[min(3.5rem,12.5vw)] landscape:size-[min(3.5rem,13.5vh)] rounded-2xl text-[11px] leading-tight";

export function TouchControls({
  input,
  fighter,
}: {
  input: InputController;
  fighter: FighterIdentity;
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
        <div className="grid grid-cols-3 gap-1.5 max-[360px]:gap-1">
          <TouchKey
            code="KeyW"
            label="跳跃"
            input={input}
            className={`${key} col-start-2 row-start-1 text-lg`}
          >
            ↑
          </TouchKey>
          <TouchKey
            code="KeyA"
            label="向左"
            input={input}
            className={`${key} col-start-1 row-start-2 text-lg`}
          >
            ←
          </TouchKey>
          <TouchKey
            code="KeyS"
            label="蹲下"
            input={input}
            className={`${key} col-start-2 row-start-2 text-lg`}
          >
            ↓
          </TouchKey>
          <TouchKey
            code="KeyD"
            label="向右"
            input={input}
            className={`${key} col-start-3 row-start-2 text-lg`}
          >
            →
          </TouchKey>
        </div>
        <div className="grid grid-cols-4 gap-1.5 max-[360px]:gap-1">
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
              className={`${key}${code === "KeyJ" ? " border-pink-200/70" : ""}`}
            >
              {label}
            </TouchKey>
          ))}
        </div>
      </div>
    </div>
  );
}
