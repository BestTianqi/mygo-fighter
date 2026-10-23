import type { Fighter, FighterIdentity } from "./objects/Fighter";
import type { Input } from "./objects/Input";
import type { Scheme } from "./objects/Scheme";

import * as mujica from "./mujica";
import * as mewtype from "./mewtype";
const KEYS1 = Object.freeze({
  left: "KeyA",
  right: "KeyD",
  jump: "KeyW",
  crouch: "KeyS",
  light: "KeyJ",
  heavy: "KeyK",
  blink: "KeyL",
  skill1: "KeyU",
  skill2: "KeyI",
  skill3: "KeyO",
  transform: "KeyH",
  super: "KeyP",
});
const KEYS2 = Object.freeze({
  left: "ArrowLeft",
  right: "ArrowRight",
  jump: "ArrowUp",
  crouch: "ArrowDown",
  light: "Numpad1",
  heavy: "Numpad2",
  blink: "Numpad3",
  skill1: "Numpad4",
  skill2: "Numpad5",
  skill3: "Numpad6",
  transform: "Numpad7",
  super: "Numpad8",
});
const schemes: Scheme[] = [
  {
    base: ["shield", "wave", "special"],
    super: "super",
    variants: {
      down1: "rising",
      forward1: "thrust",
      back1: "anonCry",
      down2: "sonic",
      back2: "waveLight",
      forward2: "waveHeavy",
      down3: "rush",
      back3: "spin",
      airDown3: "dive",
    },
  },
  {
    base: ["summon", "wave", "special"],
    super: "soyoSuper",
    variants: { down2: "heal", forward2: "soyoCutline" },
  },
  {
    base: ["tomoriEcho", "tomoriNote", "tomoriChorus"],
    super: "tomoriSuper",
    transform: "penguinTransform",
    variants: {},
  },
  {
    base: ["ranaRush", "ranaParfait", "ranaSolo"],
    super: "ranaSuper",
    variants: {
      down1: "ranaRise",
      forward1: "ranaSlide",
      down2: "ranaTune",
      forward2: "ranaChord",
      down3: "ranaPick",
      airDown3: "ranaDive",
    },
  },
  {
    base: ["rikiRoll", "rikiShock", "rikiEight"],
    super: "rikiSuper",
    variants: {
      down1: "rikiOverhead",
      forward1: "rikiRush",
      down2: "rikiCalibrate",
      forward2: "rikiRise",
    },
  },
];
const penguin: Scheme = {
  base: ["penguinCry", "penguinHey", "penguinCall"],
  super: "penguinSuper",
  variants: {
    forward1: "penguinKick",
    down2: "penguinLaugh",
    airDown3: "penguinKick",
  },
};
function schemeFor(f: FighterIdentity): Scheme {
  return f.character >= 10
    ? mewtype.schemeFor(f)
    : f.character >= 5
      ? mujica.schemeFor(f)
      : f.character === 2 && f.penguin
        ? penguin
        : schemes[f.character];
}
function resolveSkill(
  f: Fighter,
  input: Input,
  pressed: (key: string) => boolean,
  airborne: boolean,
) {
  const scheme = schemeFor(f);
  if (pressed("super")) return scheme.super || null;
  if (pressed("transform") && scheme.transform)
    return (!f.penguin && scheme.transform) || null;
  for (let i = 1; i <= 3; i++)
    if (pressed("skill" + i)) {
      const gesture = input.pressDirections?.["skill" + i] || input;
      const horizontal =
        (Number(!!gesture.right) - Number(!!gesture.left)) * f.facing;
      const direction = gesture.crouch
        ? "down"
        : horizontal > 0
          ? "forward"
          : horizontal < 0
            ? "back"
            : "";
      if (airborne && direction === "down" && scheme.variants["airDown" + i])
        return scheme.variants["airDown" + i];
      if (scheme.variants[direction + i]) return scheme.variants[direction + i];
      if (
        (direction === "back" && i === 1) ||
        (direction === "forward" && i === 3)
      )
        return "throw";
      return scheme.base[i - 1];
    }
  const heavyInput = input.pressDirections?.heavy || input;
  if (
    f.character === 0 &&
    !airborne &&
    !heavyInput.crouch &&
    pressed("heavy") &&
    (Number(!!heavyInput.right) - Number(!!heavyInput.left)) * f.facing > 0
  )
    return "overhead";
  return undefined;
}
function bindingList(f: FighterIdentity) {
  const s = schemeFor(f),
    rows = s.base.map((move, i) => ({
      move,
      key: ["U", "I", "O"][i],
      key2: String(i + 4),
    }));
  const directions: Record<string, string> = {
    down: "↓",
    forward: "前",
    back: "后",
    airDown: "空中↓",
  };
  for (const [variant, move] of Object.entries(s.variants)) {
    const n = Number(variant.slice(-1));
    const prefix = directions[variant.slice(0, -1)];
    rows.push({
      move,
      key: prefix + "＋" + ["U", "I", "O"][n - 1],
      key2: prefix + "＋" + (n + 3),
    });
  }
  rows.push({
    move: "throw",
    key: s.variants.back1 ? "前＋O" : "后＋U / 前＋O",
    key2: s.variants.back1 ? "前＋6" : "后＋4 / 前＋6",
  });
  if (f.character === 0)
    rows.push({ move: "overhead", key: "前＋K", key2: "前＋2" });
  if (s.transform) rows.push({ move: s.transform, key: "H", key2: "7" });
  if (s.super) rows.push({ move: s.super, key: "P", key2: "8" });
  return rows;
}
export { KEYS1, KEYS2, schemeFor, resolveSkill, bindingList };
