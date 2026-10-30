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
      className="pointer-events-auto relative mb-4 aspect-square w-[clamp(96px,26vw,160px)] max-w-full justify-self-start touch-none overflow-hidden rounded-none bg-void/45 backdrop-blur-sm select-none [-webkit-touch-callout:none] landscape:w-[clamp(96px,36dvh,160px)]"
    >
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 -ml-[22%] -mt-[22%] size-[44%] rounded-none bg-silver/30"
        style={{ transform: `translate(${position.x}px,${position.y}px)` }}
      />
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 bottom-0 h-1/3 min-h-9 ${position.crouching ? "bg-ember/20" : "bg-panel/5"}`}
      />
    </button>
  );
}
