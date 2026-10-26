import type { Fighter, FighterIdentity } from "./objects/Fighter";
import type { Input } from "./objects/Input";
import type { Scheme } from "./objects/Scheme";

import { bandFor } from "./bands";
import { resolveSchemeSkill } from "./bands/shared/skill";
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
  guard: "Space",
  dash: "ShiftLeft",
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
  guard: "Numpad0",
  dash: "Numpad9",
});
function schemeFor(f: FighterIdentity): Scheme {
  return bandFor(f.character).schemeFor(f);
}
function resolveSkill(
  f: Fighter,
  input: Input,
  pressed: (key: string) => boolean,
  airborne: boolean,
) {
  return resolveSchemeSkill(
    bandFor(f.character),
    f,
    input,
    pressed,
    airborne,
  );
}
function bindingList(f: FighterIdentity) {
  const band = bandFor(f.character),
    s = band.schemeFor(f),
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
  rows.push(...(band.extraBindings?.(f) ?? []));
  if (s.transform) rows.push({ move: s.transform, key: "H", key2: "7" });
  if (s.super) rows.push({ move: s.super, key: "P", key2: "8" });
  return rows;
}
export { KEYS1, KEYS2, schemeFor, resolveSkill, bindingList };
