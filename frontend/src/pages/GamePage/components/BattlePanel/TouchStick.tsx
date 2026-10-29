import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { TouchInput } from "../../runtime/input/InputController";

/** One captured finger slides between directions; the other hand can attack independently. */
export function TouchStick({ input }: { input: TouchInput }) {
  const stick = useRef<HTMLButtonElement>(null);
  const pointer = useRef<number | null>(null);
  const held = useRef(new Set<string>());
  const [position, setPosition] = useState({ x: 0, y: 0, crouching: false });
  function release() {
    for (const code of held.current) input.release(code);
    held.current.clear();
    pointer.current = null;
    setPosition({ x: 0, y: 0, crouching: false });
  }
  useEffect(() => {
    const element = stick.current;
    // React touch listeners can be passive; claim only gestures starting on the stick.
    const preventGesture = (event: TouchEvent) => {
      if (event.cancelable) event.preventDefault();
    };
    const touchEvents = ["touchstart", "touchmove", "touchend"] as const;
    for (const type of touchEvents)
      element?.addEventListener(type, preventGesture, { passive: false });
    window.addEventListener("blur", release);
    return () => {
      for (const type of touchEvents)
        element?.removeEventListener(type, preventGesture);
      window.removeEventListener("blur", release);
      for (const code of held.current) input.release(code);
    };
  }, [input]);
  function move(event: PointerEvent<HTMLButtonElement>) {
    if (pointer.current !== event.pointerId) return;
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const radius = bounds.width / 2;
    let x = (event.clientX - bounds.left - radius) / radius;
    let y = (event.clientY - bounds.top - radius) / radius;
    const length = Math.max(1, Math.hypot(x, y));
    x /= length;
    y /= length;
    const next = new Set<string>();
    if (x < -0.28) next.add("KeyA");
    if (x > 0.28) next.add("KeyD");
    if (y < -0.4) next.add("KeyW");
    // A short downward motion crouches; hysteresis avoids jitter near neutral.
    if (y >= (held.current.has("KeyS") ? 0.16 : 0.25)) next.add("KeyS");
    setPosition({
      x: x * radius * 0.45,
      y: y * radius * 0.45,
      crouching: next.has("KeyS"),
    });
    for (const code of held.current) if (!next.has(code)) input.release(code);
    for (const code of next)
      if (!held.current.has(code)) input.press(code, true);
    held.current = next;
  }
  return (
    <button
      ref={stick}
      type="button"
      aria-label="方向摇杆：左右移动，上推跳跃，下推或按住下方蹲下"
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
      className="relative mb-6 ml-[clamp(0.75rem,4vw,3.5rem)] size-[clamp(112px,32vw,184px)] shrink-0 touch-none overflow-hidden rounded-full bg-slate-950/45 shadow-[inset_0_0_28px_#ffffff15] backdrop-blur-sm text-white/70 select-none [-webkit-touch-callout:none] sm:mb-8 landscape:size-[clamp(112px,38dvh,184px)]"
    >
      <span className="absolute inset-x-0 top-1 text-[9px]">↑ 跳跃</span>
      <span className="absolute left-2 top-1/2 -translate-y-1/2">‹</span>
      <span className="absolute right-2 top-1/2 -translate-y-1/2">›</span>
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 -ml-[22%] -mt-[22%] size-[44%] rounded-full bg-cyan-100/30 shadow-[0_0_24px_#67e8f933]"
        style={{ transform: `translate(${position.x}px,${position.y}px)` }}
      />
      <span
        className={`absolute inset-x-0 bottom-0 grid h-1/3 min-h-9 place-items-center text-[10px] ${position.crouching ? "bg-pink-300/20 text-pink-100" : "bg-white/5 text-white/80"}`}
      >
        按住蹲下
      </span>
    </button>
  );
}
