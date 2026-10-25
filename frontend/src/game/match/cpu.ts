import {
  isMujica,
  kitFor,
  MAX_HEALTH,
  MOVES,
  NORMAL_BUTTONS,
  profileFor,
} from "../combatData";
import * as controls from "../controls";
import type { Match } from "../engine";
import type { Input } from "../objects/Input";
import { clamp } from "./combatMath";

/** CPU decisions use the match's seeded random source, shared by browser and JVM. */
export function aiInput(match: Match): Input {
  const a = match.fighters[1],
    b = match.fighters[0];
  const d = Math.abs(a.x - b.x),
    toward = b.x > a.x ? 1 : -1;
  const input: Input = {};
  if (d > 95) input[toward > 0 ? "right" : "left"] = true;
  if (match.grounded(a)) match.aiGoal = match.nextPlatform(a, b);
  if (match.aiGoal >= 0 && !a.attack && !a.stun && !a.knockdown) {
    const platform = match.options.terrain!.platforms[match.aiGoal];
    if (match.grounded(a)) {
      const travel = match.jumpTime(a, platform.height) * profileFor(a).speed;
      const launch = clamp(
        a.x,
        platform.left + 18 - travel + 8,
        platform.right - 18 + travel - 8,
      );
      input.left = launch < a.x - 3;
      input.right = launch > a.x + 3;
      if (!input.left && !input.right) input.jump = true;
    }
    return input;
  }
  if (match.grounded(a) && b.y + 35 < a.y && !a.attack) {
    const platform = (match.options.terrain?.platforms || []).find(
      (p) => a.x >= p.left && a.x <= p.right && Math.abs(a.y - p.height) < 0.1,
    );
    if (platform && b.x >= platform.left && b.x <= platform.right)
      return { crouch: true, jump: true };
  }
  match.aiThink -= 10;
  if (match.aiThink > 0) return input;
  const level = match.options.difficulty;
  match.aiThink = [440, 260, 150][level] + match.random() * 160;
  if (a.stun || a.attack || a.knockdown) return input;
  if (kitFor(a)) {
    const scheme = controls.schemeFor(a);
    if (match.grounded(a)) {
      const ranged = MOVES[scheme.variants.down1];
      if (
        a.character >= 10 &&
        ranged?.projectile &&
        a.energy >= ranged.cost! &&
        d >= 260 &&
        d <= ranged.maxReach! &&
        Math.abs(a.y - b.y) < 100 &&
        match.random() < 0.6
      )
        return { unified: true, crouch: true, skill1: true };
      if (
        isMujica(a.character) &&
        !a.stageForm &&
        a.energy >= 75 &&
        match.elapsed > 8000 &&
        match.random() < 0.35
      )
        return { unified: true, transform: true };
      if (
        a.energy === 100 &&
        d <= 420 &&
        Math.abs(a.y - b.y) <= 300 &&
        match.random() < 0.45
      )
        return { unified: true, super: true };
      const legal = scheme.base
        .map((key, index) => ({ key, index, move: MOVES[key] }))
        .filter(
          ({ key, move }) =>
            a.energy >= move.cost! &&
            !a.moveCooldowns[key] &&
            (!move.delayedArea ||
              !match.areas.some(
                (area) => area.owner === 1 && area.attack === key,
              )),
        );
      if (legal.length && d < 720 && match.random() < 0.72)
        return {
          unified: true,
          ["skill" +
          (legal[Math.floor(match.random() * legal.length)].index + 1)]: true,
        };
      if (b.attack && d < 200 && match.random() < 0.4)
        return { guard: true, crouch: b.crouch };
    }
    if (d < 180)
      return {
        unified: true,
        [match.random() < 0.65 ? "light" : "heavy"]: true,
        crouch: match.random() < 0.2,
      };
    if (d > 200 && match.random() < 0.2) input.jump = true;
    return input;
  }
  if (
    a.character === 2 &&
    !a.penguin &&
    a.hp <= MAX_HEALTH * 0.7 &&
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
    a.hp <= MAX_HEALTH * 0.65 &&
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
    if (a.energy >= 60 && d < 190) return { special: true };
    if (a.energy >= 20 && d < 190 && b.crouch) return { shield: true };
    if (a.energy >= 20 && d < 170) return { wave: true };
    if (a.energy >= 15 && d > 170 && d < 400) return { thrust: true };
    if (a.energy >= 30 && d > 350 && d < 650) return { sonic: true };
    if (
      a.energy >= 25 &&
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
      if (a.energy >= 25 && d > 320 && d < 760) return { rush: true };
      if (a.energy >= 60 && d > 180 && d < 600) return { special: true };
      if (a.energy >= 15 && d > 150 && d < 320) return { thrust: true };
      if (a.energy >= 20 && d < 140 && b.guard && !b.crouch)
        return { shield: true };
      if (a.energy < 40 && !a.tuneCooldown && d > 400 && !b.attack)
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
