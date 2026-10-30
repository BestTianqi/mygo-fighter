import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Assets } from "../../../../assets/objects/Assets";
import { KEYS1, schemeFor } from "../../../../game/controls";
import type { BattleRules } from "../../../../game/objects/BattleRules";
import type { FighterIdentity } from "../../../../game/objects/Fighter";
import type { TouchInput } from "../../runtime/input/InputController";
import { touchActionArtworkFor } from "./functions/touchActionArtworkFor";
import type { TouchAction } from "./objects/TouchAction";
import { TouchActionIcon } from "./TouchActionIcon";
import { TouchAttackButton } from "./TouchAttackButton";
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
  input: TouchInput;
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
    const hidden = () => {
      if (document.hidden) release();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", hidden);
      input.release(code);
    };
  }, [input, code]);
  useEffect(() => {
    if (disabled) release();
  }, [disabled, input, code]);
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
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
      className={`pointer-events-auto absolute aspect-square touch-none overflow-hidden rounded-full bg-panel/90 outline-none backdrop-blur-sm transition-[scale,filter,box-shadow] select-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-35 disabled:grayscale [-webkit-touch-callout:none] ${
        pressed ? "brightness-150" : "brightness-100"
      } ${className}`}
    >
      {children}
    </button>
  );
}

// The three skills arc around J/K; P stays on the right and H keeps its own slot.
const actions: {
  action: Exclude<TouchAction, "light" | "heavy" | "blink">;
  label: string;
  position: string;
}[] = [
  {
    action: "skill1",
    label: "技能一",
    position: "left-[13.5%] top-[65%] w-[24%]",
  },
  {
    action: "skill2",
    label: "技能二",
    position: "left-[23.5%] top-[37.27%] w-[24%]",
  },
  {
    action: "skill3",
    label: "技能三",
    position: "left-[53%] top-[27.27%] w-[24%]",
  },
  {
    action: "super",
    label: "大招",
    position: "left-[85.5%] top-[44.55%] w-[28%]",
  },
  {
    action: "transform",
    label: "变身",
    position: "left-[82.5%] top-[10.91%] w-[22%]",
  },
];

export function TouchControls({
  assets,
  input,
  fighter,
  rules,
  interactionKey = "",
}: {
  assets: Assets;
  input: TouchInput;
  fighter: FighterIdentity;
  rules?: BattleRules;
  interactionKey?: string;
}) {
  const art = useMemo(() => {
    const forAction = (action: TouchAction) =>
      touchActionArtworkFor(assets, fighter, action);
    return {
      light: forAction("light"),
      heavy: forAction("heavy"),
      blink: forAction("blink"),
      skill1: forAction("skill1"),
      skill2: forAction("skill2"),
      skill3: forAction("skill3"),
      super: forAction("super"),
      transform: forAction("transform"),
    };
  }, [assets, fighter.character, !!fighter.penguin, !!fighter.stageForm]);
  const canTransform = !!schemeFor(fighter).transform;
  const gestureKey = `${fighter.character}:${!!fighter.penguin}:${!!fighter.stageForm}:${interactionKey}`;
  return (
    <div
      className="pointer-events-none relative grid w-full grid-cols-[minmax(96px,1fr)_clamp(200px,55vw,250px)] items-end gap-2 touch-none select-none [@media(orientation:landscape)_and_(max-height:500px)]:grid-cols-[minmax(96px,1fr)_200px]"
      role="group"
      aria-label="触屏操作"
    >
      <TouchStick input={input} />
      <TouchKey
        code={KEYS1.blink}
        label="瞬移"
        input={input}
        className="bottom-0 left-[calc(clamp(96px,26vw,160px)+0.5rem)] w-11 landscape:left-[calc(clamp(96px,36dvh,160px)+0.5rem)]"
      >
        <TouchActionIcon artwork={art.blink} />
      </TouchKey>
      <div className="relative aspect-[10/11] w-full" aria-label="攻击与技能">
        <TouchAttackButton
          input={input}
          light={art.light}
          heavy={art.heavy}
          disabled={!!rules?.disableNormals}
          interactionKey={gestureKey}
        />
        {actions
          .filter(({ action }) => action !== "transform" || canTransform)
          .map(({ action, label, position }) => (
            <TouchKey
              key={action}
              code={KEYS1[action]}
              label={label}
              input={input}
              disabled={
                (action === "super" && rules?.disableSupers) ||
                (action === "transform" && rules?.disableTransform)
              }
              className={`-translate-x-1/2 -translate-y-1/2 ${position}`}
            >
              <TouchActionIcon artwork={art[action]} />
            </TouchKey>
          ))}
      </div>
    </div>
  );
}
