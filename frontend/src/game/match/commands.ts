import {
  chainPrefix,
  firstJab,
  kitFor,
  MOVES,
  NORMAL_BUTTONS,
} from "../combatData";
import * as controls from "../controls";
import type { Match } from "../engine";
import type { Fighter } from "../objects/Fighter";
import type { Input } from "../objects/Input";

export function recordDirection(f: Fighter, input: Input): void {
  f.controlMs += 10;
  const horizontal = (Number(!!input.right) - Number(!!input.left)) * f.facing;
  const direction = 5 + horizontal + (input.crouch ? -3 : input.jump ? 3 : 0);
  f.motion = f.motion.filter((e) => f.controlMs - e.t <= 500);
  if (f.motion.at(-1)?.d !== direction)
    f.motion.push({ d: direction, t: f.controlMs });
}

export function motionMatches(f: Fighter, pattern: number[]): boolean {
  const history = f.motion.filter((e) => e.d !== 5 && f.controlMs - e.t <= 500);
  if (history.length < pattern.length || f.controlMs - history.at(-1)!.t > 150)
    return false;
  return pattern.every(
    (d, i) => history[history.length - pattern.length + i].d === d,
  );
}

export function resolveAttack(
  match: Match,
  f: Fighter,
  input: Input,
  pressed: (key: string) => boolean,
): string | null {
  if (input.unified || kitFor(f)) {
    const skill = controls.resolveSkill(f, input, pressed, !match.grounded(f));
    if (skill !== undefined) return skill;
  }
  const requested = [
    "super",
    "shield",
    "throw",
    "dive",
    "thrust",
    "rush",
    "rising",
    "spin",
    "special",
    "heal",
    "summon",
    "anonCry",
    "sonic",
    "wave",
    "penguinTransform",
    "penguinKick",
    "penguinCry",
    "penguinHey",
    "penguinLaugh",
    "penguinCall",
    "tomoriChorus",
    "tomoriEcho",
    "tomoriNote",
    ...NORMAL_BUTTONS.slice().reverse(),
  ].find(pressed);
  if (!requested) return null;
  if (requested === "anonCry") return f.character === 0 ? requested : null;
  if (requested === "light" && match.grounded(f) && !input.crouch) {
    if (f.attack === firstJab(f)) return chainPrefix(f) + "Jab2";
    if (MOVES[f.attack ?? ""]?.chain === 2) return chainPrefix(f) + "Jab3";
  }
  if (kitFor(f)) {
    if (requested === "light" || requested === "heavy")
      return kitFor(f)!.normalFor(
        f,
        requested,
        !match.grounded(f) ? "air" : input.crouch ? "crouch" : "standing",
      );
    if (requested === "throw") return requested;
    return null;
  }
  if (f.character === 4) {
    if (NORMAL_BUTTONS.includes(requested))
      return (
        "riki_" +
        (!match.grounded(f) ? "air_" : input.crouch ? "crouch_" : "") +
        requested
      );
    return (
      {
        wave: "rikiRoll",
        thrust: "rikiRush",
        shield: "rikiOverhead",
        sonic: "rikiShock",
        rising: "rikiRise",
        heal: "rikiCalibrate",
        special: "rikiEight",
        super: "rikiSuper",
        throw: "throw",
      }[requested] || null
    );
  }
  if (f.character === 3) {
    if (NORMAL_BUTTONS.includes(requested))
      return (
        "rana_" +
        (!match.grounded(f) ? "air_" : input.crouch ? "crouch_" : "") +
        requested
      );
    return (
      {
        wave: "ranaPick",
        sonic: "ranaChord",
        rush: "ranaParfait",
        thrust: "ranaRush",
        rising: "ranaRise",
        shield: "ranaSlide",
        dive: "ranaDive",
        special: "ranaSolo",
        heal: "ranaTune",
        super: "ranaSuper",
        throw: "throw",
      }[requested] || null
    );
  }
  if (requested === "heal")
    return f.character === 2
      ? "penguinTransform"
      : f.character === 1
        ? "heal"
        : null;
  if (requested === "summon") return f.character === 1 ? "summon" : null;
  if (f.character === 2) {
    if (requested === "penguinTransform") return requested;
    if (f.penguin) {
      if (NORMAL_BUTTONS.includes(requested))
        return (
          "penguin_" +
          (!match.grounded(f) ? "air_" : input.crouch ? "crouch_" : "") +
          requested
        );
      return (
        {
          wave: "penguinHey",
          sonic: "penguinLaugh",
          special: "penguinCall",
          super: "penguinSuper",
          shield: "penguinCry",
          thrust: "penguinKick",
          dive: "penguinKick",
        }[requested] ||
        ([
          "throw",
          "penguinKick",
          "penguinCry",
          "penguinHey",
          "penguinLaugh",
          "penguinCall",
        ].includes(requested)
          ? requested
          : null)
      );
    }
    return (
      {
        wave: "tomoriNote",
        sonic: "tomoriEcho",
        special: "tomoriChorus",
        super: "tomoriSuper",
        shield: "throw",
      }[requested] ||
      ([
        "light",
        "heavy",
        "throw",
        "tomoriNote",
        "tomoriEcho",
        "tomoriChorus",
      ].includes(requested)
        ? requested
        : null)
    );
  }
  if (f.character === 1 && requested === "sonic") return "summon";
  if (f.character === 1 && requested === "super") return "soyoSuper";
  if (f.character !== 0 && requested === "shield") return "throw"; // Preserve Soyo's U binding.
  if (f.character !== 0)
    return ["light", "heavy", "special", "wave", "throw"].includes(requested)
      ? requested
      : null;
  const index = NORMAL_BUTTONS.indexOf(requested);
  if (index < 0) return requested;
  if (!match.grounded(f) && input.crouch && requested === "heavyKick")
    return "dive";
  if (input.unified)
    return (
      (!match.grounded(f) ? "air_" : input.crouch ? "crouch_" : "") + requested
    );
  let command;
  if (
    index < 3 &&
    match.motionMatches(f, [2, 3, 6, 2, 3, 6]) &&
    f.energy >= 100
  )
    command = "super";
  else if (index < 3 && match.motionMatches(f, [6, 2, 3])) command = "rising";
  else if (index < 3 && match.motionMatches(f, [2, 3, 6]))
    command = ["waveLight", "wave", "waveHeavy"][index];
  else if (index >= 3 && match.motionMatches(f, [2, 1, 4])) command = "spin";
  else if (index >= 3 && match.motionMatches(f, [2, 3, 6])) command = "thrust";
  if (command) {
    f.motion = [];
    return command;
  }
  if (
    match.grounded(f) &&
    !input.crouch &&
    requested === "heavyKick" &&
    (input.right ? 1 : input.left ? -1 : 0) === f.facing
  )
    return "overhead";
  return (
    (!match.grounded(f) ? "air_" : input.crouch ? "crouch_" : "") + requested
  );
}

export function canCancel(
  match: Match,
  f: Fighter,
  name: string,
): boolean | null {
  if (name === "mujicaTransform") return false;
  const chain = MOVES[name]?.chain;
  if (
    match.grounded(f) &&
    chain &&
    ((chain === 2 && f.attack === firstJab(f)) ||
      (chain === 3 && MOVES[f.attack ?? ""]?.chain === 2))
  ) {
    return (
      f.attackMs >= (chain === 2 ? 120 : 130) &&
      f.attackMs <= (chain === 2 ? 280 : 300)
    );
  }
  if (
    !f.attack ||
    !f.contact ||
    (!f.hit && !f.hitMarks.length) ||
    f.cancelDepth >= (f.character === 0 ? 5 : 4)
  )
    return false;
  const current = MOVES[f.attack ?? ""],
    next = MOVES[name];
  if (
    !next ||
    f.attackMs < current.start + 20 ||
    f.attackMs > current.end + 150
  )
    return false;
  if (!match.grounded(f))
    return (
      current.stance === "air" &&
      ((((f.character === 0 && name === "dive") ||
        (f.character === 3 && name === "ranaDive")) &&
        match.airHeight(f) >= next.minHeight!) ||
        (f.penguin && name === "penguinKick"))
    );
  if (
    current.cancelAt &&
    (f.attackMs < current.cancelAt || f.lastHitAt < current.pulses!.at(-1)!.at)
  )
    return false;
  if (next.category === "super")
    return current.category === "normal" || current.category === "special";
  if (f.character === 0 && f.attack === "thrust" && name === "rush")
    return true;
  if (
    f.character === 4 &&
    (current.base || f.attack) === "rikiRush" &&
    name === "rikiRoll"
  )
    return true;
  if (
    f.character === 4 &&
    ["rikiRoll", "rikiRollBoost"].includes(f.attack) &&
    name === "rikiEight"
  )
    return true;
  return (
    current.category === "normal" &&
    (next.category === "special" ||
      (next.category === "normal" && next.strength! > current.strength!))
  );
}
