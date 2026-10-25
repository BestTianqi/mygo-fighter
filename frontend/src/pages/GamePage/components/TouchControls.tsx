import { useEffect, useState } from "react";
import { schemeFor } from "../../../game/controls";
import type { FighterIdentity } from "../../../game/objects/Fighter";
import type { InputController } from "../functions/InputController";
function TouchKey({
  code,
  label,
  input,
  wide = false,
}: {
  code: string;
  label: string;
  input: InputController;
  wide?: boolean;
}) {
  const [pressed, setPressed] = useState(false);
  useEffect(() => () => input.release(code), [input, code]);
  const release = () => {
    setPressed(false);
    input.release(code);
  };
  return (
    <button
      aria-label={label}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setPressed(true);
        input.press(code, true);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      className={`${wide ? "col-span-2" : ""} min-h-11 min-w-0 touch-none rounded-xl border border-white/15 px-2 text-[10px] select-none sm:text-xs ${pressed ? "bg-pink-200 text-slate-950" : "bg-slate-800/80 text-slate-200"}`}
    >
      {label}
    </button>
  );
}
export function TouchControls({
  input,
  fighter,
}: {
  input: InputController;
  fighter: FighterIdentity;
}) {
  return (
    <div
      className="mt-5 hidden touch-none flex-col justify-between gap-4 min-[600px]:flex-row [@media(pointer:coarse)]:flex"
      aria-label="触屏操作"
    >
      <div className="grid grid-cols-3 gap-1.5 self-center">
        <span />
        <TouchKey code="KeyW" label="↑ 跳跃" input={input} />
        <span />
        <TouchKey code="KeyA" label="←" input={input} />
        <TouchKey code="KeyS" label="↓" input={input} />
        <TouchKey code="KeyD" label="→" input={input} />
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {[
          ["KeyJ", "J 攻击"],
          ["KeyK", "K 重击"],
          ["KeyL", "L 瞬移"],
          ["KeyP", "P 大招"],
          ["KeyU", "U 技能"],
          ["KeyI", "I 技能"],
          ["KeyO", "O 技能"],
          ...(schemeFor(fighter).transform ? [["KeyH", "H 变身"]] : []),
        ].map(([code, label]) => (
          <TouchKey key={code} code={code} label={label} input={input} />
        ))}
      </div>
    </div>
  );
}
