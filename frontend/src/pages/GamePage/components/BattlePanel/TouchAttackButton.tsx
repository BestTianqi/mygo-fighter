import { useEffect, useRef, useState } from "react";
import { KEYS1 } from "../../../../game/controls";
import type { TouchInput } from "../../runtime/input/InputController";
import type { TouchActionArtwork } from "./objects/TouchActionArtwork";
import { TouchActionIcon } from "./TouchActionIcon";

const HOLD_MS = 300;
type AttackGesture = "idle" | "pending" | "heavy";

/** A tap sends one J pulse; a hold sends K once and never also sends J. */
export function TouchAttackButton({
  input,
  light,
  heavy,
  disabled,
  interactionKey,
}: {
  input: TouchInput;
  light: TouchActionArtwork;
  heavy: TouchActionArtwork;
  disabled: boolean;
  interactionKey: string;
}) {
  const [phase, setPhase] = useState<AttackGesture>("idle");
  const gesture = useRef<AttackGesture>("idle");
  const pointers = useRef(new Set<number>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAt = useRef(0);

  function finish(commit: boolean, updateView = true) {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    if (gesture.current === "heavy") input.release(KEYS1.heavy);
    else if (commit && gesture.current === "pending" && !disabled) {
      // A busy frame can delay the timer; duration still decides the gesture.
      const code =
        performance.now() - startedAt.current >= HOLD_MS
          ? KEYS1.heavy
          : KEYS1.light;
      input.press(code, true);
      input.release(code);
    }
    pointers.current.clear();
    gesture.current = "idle";
    if (updateView) setPhase("idle");
  }
  useEffect(() => {
    finish(false);
    const cancel = () => finish(false);
    const hidden = () => {
      if (document.hidden) cancel();
    };
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", hidden);
      finish(false, false);
    };
  }, [input, interactionKey]);
  useEffect(() => {
    if (disabled) finish(false);
  }, [disabled, input]);

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label="普攻与重击"
      aria-description="轻点普攻，按住300毫秒重击"
      aria-keyshortcuts="J K"
      aria-pressed={phase !== "idle"}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        pointers.current.add(event.pointerId);
        if (gesture.current !== "idle") return;
        gesture.current = "pending";
        startedAt.current = performance.now();
        setPhase("pending");
        timer.current = setTimeout(() => {
          timer.current = null;
          if (gesture.current !== "pending" || !pointers.current.size) return;
          gesture.current = "heavy";
          setPhase("heavy");
          input.press(KEYS1.heavy, true);
        }, HOLD_MS);
      }}
      onPointerUp={(event) => {
        if (!pointers.current.delete(event.pointerId)) return;
        if (!pointers.current.size) finish(true);
      }}
      onPointerCancel={() => finish(false)}
      onLostPointerCapture={(event) => {
        if (!pointers.current.delete(event.pointerId)) return;
        if (!pointers.current.size) finish(false);
      }}
      className={`pointer-events-auto absolute left-[77%] top-[78.64%] aspect-square w-[44%] -translate-x-1/2 -translate-y-1/2 touch-none overflow-hidden rounded-full border-2 bg-[radial-gradient(ellipse_at_center,#9b466a,#121a30)] shadow-[0_3px_12px_#0009,inset_0_0_12px_#ffffff20] outline-none transition-[scale,filter,box-shadow] select-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-35 disabled:grayscale [-webkit-touch-callout:none] ${
        phase === "heavy"
          ? "border-amber-200 brightness-125 ring-2 ring-amber-200/60"
          : phase === "pending"
            ? "border-pink-100 brightness-110"
            : "border-pink-200/85"
      }`}
    >
      <TouchActionIcon artwork={phase === "heavy" ? heavy : light} />
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        className={`pointer-events-none absolute inset-0 size-full -rotate-90 ${phase === "idle" ? "opacity-0" : "opacity-100"}`}
      >
        <circle
          cx="50"
          cy="50"
          r="46"
          pathLength="100"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray="100"
          strokeDashoffset={phase === "idle" ? 100 : 0}
          className={`text-amber-200 ${phase === "pending" ? "transition-[stroke-dashoffset] duration-300 ease-linear" : "duration-0"}`}
        />
      </svg>
    </button>
  );
}
