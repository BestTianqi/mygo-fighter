import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { InputController } from "../functions/InputController";

/** One captured finger slides between directions; the other hand can attack independently. */
export function TouchStick({ input }: { input: InputController }) {
  const pointer = useRef<number | null>(null);
  const held = useRef(new Set<string>());
  const [position, setPosition] = useState({ x: 0, y: 0 });
  function release() {
    for (const code of held.current) input.release(code);
    held.current.clear();
    pointer.current = null;
    setPosition({ x: 0, y: 0 });
  }
  useEffect(() => {
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("blur", release);
      for (const code of held.current) input.release(code);
    };
  }, [input]);
  function move(event: PointerEvent<HTMLButtonElement>) {
    if (pointer.current !== event.pointerId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const radius = bounds.width / 2;
    let x = (event.clientX - bounds.left - radius) / radius;
    let y = (event.clientY - bounds.top - radius) / radius;
    const length = Math.max(1, Math.hypot(x, y));
    x /= length;
    y /= length;
    setPosition({ x: x * radius * 0.45, y: y * radius * 0.45 });
    const next = new Set<string>();
    if (x < -0.28) next.add("KeyA");
    if (x > 0.28) next.add("KeyD");
    if (y < -0.4) next.add("KeyW");
    if (y > 0.4) next.add("KeyS");
    for (const code of held.current) if (!next.has(code)) input.release(code);
    for (const code of next)
      if (!held.current.has(code)) input.press(code, true);
    held.current = next;
  }
  return (
    <button
      type="button"
      aria-label="方向摇杆：左右移动，上推跳跃，下推蹲下"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        if (pointer.current !== null) return;
        event.preventDefault();
        pointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        move(event);
      }}
      onPointerMove={move}
      onPointerUp={(event) => {
        if (event.pointerId === pointer.current) release();
      }}
      onPointerCancel={(event) => {
        if (event.pointerId === pointer.current) release();
      }}
      onLostPointerCapture={(event) => {
        if (event.pointerId === pointer.current) release();
      }}
      className="relative size-[clamp(96px,26vw,148px)] shrink-0 touch-none rounded-full bg-slate-950/45 shadow-[inset_0_0_28px_#ffffff15] backdrop-blur-sm text-white/70 select-none [-webkit-touch-callout:none] landscape:size-[clamp(96px,32dvh,148px)]"
    >
      <span className="absolute inset-x-0 top-1 text-[9px]">↑ 跳跃</span>
      <span className="absolute left-2 top-1/2 -translate-y-1/2">‹</span>
      <span className="absolute right-2 top-1/2 -translate-y-1/2">›</span>
      <span className="absolute inset-x-0 bottom-1 text-[9px]">蹲下 ↓</span>
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 -ml-[22%] -mt-[22%] size-[44%] rounded-full bg-cyan-100/30 shadow-[0_0_24px_#67e8f933]"
        style={{ transform: `translate(${position.x}px,${position.y}px)` }}
      />
    </button>
  );
}
