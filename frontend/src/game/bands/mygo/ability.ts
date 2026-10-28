import { NORMAL_BUTTONS, verticalScale } from "../../data/rules";
import { moveCatalog } from "../shared/catalog";
import type { Band } from "../../objects/Band";
import type { Match } from "../../engine";
import type { Fighter, FighterIdentity } from "../../objects/Fighter";
import type { Input } from "../../objects/Input";
import { chainPrefix, firstJab } from "./forms";

const sideOf = (match: Match, f: Fighter) => (match.fighters[0] === f ? 0 : 1);

/**
 * MyGO's command table: each character has a hand-written button mapping.
 * This is the classic (unified: false) play style, so it lives with the band.
 */
export function mygoCommand(
  match: Match,
  f: Fighter,
  requested: string,
  input: Input,
): string | null {
  const MOVES = moveCatalog();
  if (requested === "anonCry") return f.character === 0 ? requested : null;
  if (requested === "light" && match.grounded(f) && !input.crouch) {
    if (f.attack === firstJab(f)) return chainPrefix(f) + "Jab2";
    if (MOVES[f.attack ?? ""]?.chain === 2) return chainPrefix(f) + "Jab3";
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

/** In unified mode MyGO keeps one extra command: forward + heavy is overhead. */
export function mygoSkill(
  f: Fighter,
  input: Input,
  pressed: (key: string) => boolean,
  airborne: boolean,
): string | undefined {
  const heavyInput = input.pressDirections?.heavy || input;
  return f.character === 0 &&
    !airborne &&
    !heavyInput.crouch &&
    pressed("heavy") &&
    (Number(!!heavyInput.right) - Number(!!heavyInput.left)) * f.facing > 0
    ? "overhead"
    : undefined;
}

export const mygoStanceLocked = (f: FighterIdentity) =>
  !!f.penguin || (f.character !== 1 && f.character !== 2);

export const mygoCancelDepth = (f: FighterIdentity) =>
  f.character === 0 ? 5 : 4;

export const mygoAirCancel = (f: Fighter, name: string) =>
  (f.character === 0 && name === "dive") ||
  (f.character === 3 && name === "ranaDive");

export const mygoExtraCancel = (_match: Match, f: Fighter, name: string) => {
  const MOVES = moveCatalog();
  const current = MOVES[f.attack ?? ""];
  return (
    (f.character === 0 && f.attack === "thrust" && name === "rush") ||
    (f.character === 4 &&
      (current.base || f.attack) === "rikiRush" &&
      name === "rikiRoll") ||
    (f.character === 4 &&
      ["rikiRoll", "rikiRollBoost"].includes(f.attack ?? "") &&
      name === "rikiEight")
  );
};

/** Riki's four-beat counter upgrades the next attack before it is charged. */
export function mygoBeforeStart(
  match: Match,
  f: Fighter,
  name: string,
): string | null {
  const MOVES = moveCatalog();
  if (f.character === 4 && f.beats === 4 && MOVES[name + "Boost"]) {
    f.beats = 0;
    match.events.push({
      type: "beatBoost",
      side: sideOf(match, f),
      attack: name + "Boost",
    });
    return name + "Boost";
  }
  return null;
}

/** MyGO skill startup movement, ported from the shared buffer start path. */
export function mygoOnStart(
  match: Match,
  f: Fighter,
  move: Parameters<NonNullable<Band["onStart"]>>[2],
  name: string,
  ground: boolean,
): void {
  const side = sideOf(match, f);
  if (name === "dive" || name === "ranaDive") {
    f.vy = -570 * verticalScale;
    f.vx = f.facing * 360;
  }
  if (name === "penguinKick") {
    f.airUsed = true;
    f.vy = ground ? 340 * verticalScale : Math.max(140 * verticalScale, f.vy);
    f.y += 0.01;
    f.vx = f.facing * 400;
  }
  if (name === "rising") {
    f.vy = 610 * verticalScale;
    f.y += 0.01;
    f.vx = f.facing * 130;
  }
  if (name === "ranaRise") {
    f.vy = 620 * verticalScale;
    f.y += 0.01;
    f.vx = f.facing * 130;
  }
  if (name === "rikiRise" || name === "rikiRiseBoost") {
    f.vy = 400 * verticalScale;
    f.y += 0.01;
    f.vx = f.facing * (move.follow ? 200 : 80);
  }
  if (name === "spin" && ground) {
    f.vy = 260 * verticalScale;
    f.y += 0.01;
    f.vx = f.facing * 230;
  }
  if (name === "super") {
    f.vx = 0;
    match.freeze = 240;
  }
  if (name === "ranaSuper") {
    f.vx = 0;
    match.freeze = 130;
  }
  if (name === "soyoSuper") {
    f.vx = 0;
    f.attackCrouch = f.crouch = false;
    match.freeze = 130;
    match.soyoSuperId = (match.soyoSuperId || 0) + 1;
    f.soyoSuper = {
      id: match.soyoSuperId,
      ms: move.duration,
      released: false,
      radius: 0,
      x: f.x,
      y: f.y + 100,
      bornAt: match.elapsed,
      hitTargets: [],
    };
  }
  if (name === "rikiSuper") {
    f.vx = 0;
    match.freeze = 130;
  }
  if (name === "rikiCalibrate") {
    f.calibrateCooldown = move.recast!;
    f.attackCrouch = f.crouch = false;
  }
  if (name === "ranaTune") {
    f.tuneCooldown = move.recast!;
    f.attackCrouch = f.crouch = false;
  }
  if (name === "heal") {
    f.healCooldown = move.recast!;
    f.attackCrouch = f.crouch = false;
  }
  if (name === "penguinTransform") {
    f.penguin = { ms: move.lifetime! };
    f.attack = null;
    f.cooldown = 0;
    match.events.push({ type: "penguinStart", side });
  }
}

/** MyGO's per-character CPU tactics, after the shared navigation logic. */
export function mygoAi(match: Match, side: number, input: Input): Input {
  const MOVES = moveCatalog();
  const a = match.fighters[side],
    b = match.fighters[1 - side];
  const d = Math.abs(a.x - b.x),
    level = match.options.difficulty;
  if (
    a.character === 2 &&
    !a.penguin &&
    a.hp <= match.options.rules.maxHealth * 0.7 &&
    a.energy >= 50 &&
    match.grounded(a) &&
    d > 120
  )
    return { heal: true };
  if (
    a.character === 2 &&
    a.energy === 100 &&
    match.grounded(a) &&
    (a.penguin
      ? Math.hypot(a.x - b.x, a.y - b.y) <= MOVES.penguinSuper.reach!
      : d < 420 && Math.abs(a.y - b.y) <= 300)
  )
    return { super: true };
  if (a.penguin && match.grounded(a)) {
    if (b.attack && d < 170 && a.energy >= 15) return { shield: true };
    if (d < 180 && a.energy >= 20) return { sonic: true };
    if (d > 180 && d < 430 && a.energy >= 40) return { special: true };
    if (d >= 180 && d < 220 && a.energy >= 10) return { wave: true };
    if (d > 145 && d < 370 && a.energy >= 10) return { thrust: true };
  }
  if (a.character === 2 && !a.penguin && match.grounded(a)) {
    if (a.energy >= 60 && d > 180 && d < 650) return { special: true };
    if (a.energy >= 30 && d > 150 && d < 550) return { sonic: true };
  }
  if (
    a.character === 1 &&
    a.hp <= match.options.rules.maxHealth * 0.65 &&
    !a.healCooldown &&
    match.grounded(a) &&
    a.energy >= MOVES.heal.cost! &&
    d > 240 &&
    !b.attack
  )
    return { heal: true };
  if (
    a.character === 1 &&
    a.energy === 100 &&
    match.grounded(a) &&
    d < 340 &&
    Math.abs(a.y - b.y) < 300
  )
    return { super: true };
  if (
    a.character === 1 &&
    !a.summons &&
    match.grounded(a) &&
    a.energy >= 50 &&
    d > 90
  ) {
    input.sonic = true;
    return input;
  }
  if (
    a.character === 1 &&
    match.grounded(a) &&
    a.energy >= MOVES.soyoCutline.cost! &&
    d > 160 &&
    d <= MOVES.soyoCutline.reach! &&
    Math.abs(a.y - b.y) <= MOVES.soyoCutline.vertical!
  ) {
    return { unified: true, left: b.x < a.x, right: b.x > a.x, skill2: true };
  }
  if (
    a.character === 0 &&
    a.energy === 100 &&
    d < 340 &&
    match.random() > 0.35
  ) {
    input.super = true;
    return input;
  }
  if (a.character === 4 && match.grounded(a)) {
    if (a.energy === 100 && d < 300) return { super: true };
    if (a.energy >= 25 && b.y > a.y + 30 && d < 170) return { rising: true };
    if (a.energy >= MOVES.rikiEight.cost! && d < 190) return { special: true };
    if (a.energy >= 20 && d < 190 && b.crouch) return { shield: true };
    if (a.energy >= 20 && d < 170) return { wave: true };
    if (a.energy >= 15 && d > 170 && d < 400) return { thrust: true };
    if (a.energy >= MOVES.rikiShock.cost! && d > 350 && d < 780)
      return { sonic: true };
    if (
      a.energy >= MOVES.rikiCalibrate.cost! &&
      a.beats < 4 &&
      !a.calibrateCooldown &&
      d > 650 &&
      !b.attack
    )
      return { heal: true };
  }
  if (a.character === 3) {
    if (match.airHeight(a) >= 70 && !a.airUsed && a.energy >= 15 && d < 220)
      return { dive: true };
    if (match.grounded(a)) {
      if (a.energy === 100 && d < 260) return { super: true };
      if (a.energy >= 25 && b.y > a.y + 35 && d < 140) return { rising: true };
      if (a.energy >= MOVES.ranaSolo.cost! && d > 300 && d < 900)
        return { special: true };
      if (a.energy >= MOVES.ranaParfait.cost! && d > 320 && d < 850)
        return { rush: true };
      if (a.energy >= 15 && d > 150 && d < 320) return { thrust: true };
      if (a.energy >= 20 && d < 140 && b.guard && !b.crouch)
        return { shield: true };
      if (a.energy < 40 && !a.tuneCooldown && d > 650 && !b.attack)
        return { heal: true };
    }
  }
  if (b.attack && d < 170 && match.random() < [0.2, 0.55, 0.8][level]) {
    input.guard = true;
    input.crouch = b.crouch;
    match.aiGuard = 260;
    return input;
  }
  if (a.character === 0) {
    if (
      match.airHeight(a) >= 70 &&
      !a.airUsed &&
      a.energy >= 15 &&
      d < 230 &&
      match.random() > 0.35
    ) {
      input.dive = true;
      return input;
    }
    if (
      match.grounded(a) &&
      d > 155 &&
      d < 300 &&
      a.energy >= 15 &&
      match.random() > 0.55
    ) {
      input.thrust = true;
      return input;
    }
    if (
      match.grounded(a) &&
      d < 145 &&
      a.energy >= 25 &&
      match.random() > 0.6
    ) {
      input.rush = true;
      return input;
    }
    if (
      match.grounded(a) &&
      d > 250 &&
      a.energy >= 30 &&
      match.random() > 0.65
    ) {
      input.sonic = true;
      return input;
    }
  }
  if (d < 65 && b.guard && match.random() > 0.45) input.throw = true;
  else if (d < 130) {
    if (a.energy >= 60 && match.random() > 0.45) input.special = true;
    else
      input[
        (a.character === 0 || a.character >= 3 || a.penguin
          ? NORMAL_BUTTONS[Math.floor(match.random() * 6)]
          : match.random() > 0.38
            ? "light"
            : "heavy") as keyof Pick<Input, "light" | "heavy">
      ] = true;
  } else if (d > 190 && a.energy >= 20 && match.random() > 0.45)
    input.wave = true;
  else if (d > 180 && match.random() > 0.76) input.jump = true;
  return input;
}

export function mygoExtraBindings(f: FighterIdentity) {
  return f.character === 0
    ? [{ move: "overhead", key: "前＋K", key2: "前＋2" }]
    : [];
}

export const MYGO_ABILITY = {
  command: mygoCommand,
  skill: mygoSkill,
  stanceLocked: mygoStanceLocked,
  cancelDepth: mygoCancelDepth,
  airCancel: mygoAirCancel,
  extraCancel: mygoExtraCancel,
  beforeStart: mygoBeforeStart,
  onStart: mygoOnStart,
  extraBindings: mygoExtraBindings,
  ai: mygoAi,
};
