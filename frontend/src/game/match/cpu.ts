import { MOVES, bandFor } from "../combatData";
import * as controls from "../controls";
import type { Match } from "../engine";
import type { Input } from "../objects/Input";
import { clamp, movementSpeed } from "./combatMath";
import { moveEnabled } from "../battleRules";
import { cpuDifficulty } from "../cpuDifficulty";
import { advancedInput } from "./cpuTactics";

/** CPU decisions use the match's seeded random source, shared by browser and JVM. */
export function aiInput(match: Match, side = 1): Input {
  if (!match.active(side) || !match.enemySides(side).length) return {};
  const input = chooseInput(match, side);
  const f = match.fighters[side];
  const pressed = (key: string) => !!input[key as keyof Input];
  const rules = match.options.rules;
  if (rules.disableGuard) {
    input.guard = false;
    match.aiGuard = 0;
  }
  if (!rules.disableNormals && !rules.disableSupers && !rules.disableTransform)
    return input;
  // If a character tactic requests a banned action, choose a usable basic
  // skill instead. This also covers MyGO's legacy per-character commands.
  if (match.resolveAttack({ ...f, motion: [...f.motion] }, input, pressed))
    return input;
  const action = Object.keys(input).some(
    (key) =>
      ![
        "left",
        "right",
        "jump",
        "crouch",
        "guard",
        "dash",
        "blink",
        "unified",
      ].includes(key) && pressed(key),
  );
  if (!action || !match.grounded(f)) return input;
  const scheme = controls.schemeFor(f);
  const available = scheme.base.findIndex((key) => {
    const move = MOVES[key];
    return (
      moveEnabled(rules, move) &&
      !move.airOnly &&
      f.energy >= (move.cost ?? 0) &&
      (rules.noCooldowns || !f.moveCooldowns[key])
    );
  });
  return available >= 0
    ? { unified: true, ["skill" + (available + 1)]: true }
    : {
        left: input.left,
        right: input.right,
        jump: input.jump,
        guard: input.guard,
      };
}

function chooseInput(match: Match, side: number): Input {
  const a = match.fighters[side],
    b = match.fighters[match.targetSide(side)];
  const d = Math.abs(a.x - b.x),
    toward = b.x > a.x ? 1 : -1;
  const input: Input = {};
  if (d > 95) input[toward > 0 ? "right" : "left"] = true;
  if (match.grounded(a)) match.aiGoal = match.nextPlatform(a, b);
  if (match.aiGoal >= 0 && !a.attack && !a.stun && !a.knockdown) {
    const platform = match.options.terrain!.platforms[match.aiGoal];
    if (match.grounded(a)) {
      const travel =
        match.jumpTime(a, platform.height) * movementSpeed(match, a);
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
    if (platform) {
      if (b.x >= platform.left && b.x <= platform.right)
        return { crouch: true, jump: true };
      // A wide upper deck can catch a high jump toward a lower opponent.
      // Keep walking off its edge even inside the normal attack distance.
      return { left: toward < 0, right: toward > 0 };
    }
  }
  match.aiThink -= 10;
  const difficulty = cpuDifficulty(match.options.difficulty);
  if (match.aiThink > 0)
    return difficulty.id >= 3 && match.aiGuard > 0
      ? { guard: true, crouch: a.crouch }
      : input;
  match.aiThink = difficulty.reaction + match.random() * difficulty.jitter;
  if (difficulty.id >= 3) return advancedInput(match, side, input, difficulty);
  if (a.stun || a.attack || a.knockdown) return input;
  const band = bandFor(a.character);
  if (band.unified) {
    const scheme = controls.schemeFor(a);
    if (match.grounded(a)) {
      const ranged = MOVES[scheme.variants.down1];
      if (
        ranged?.projectile &&
        a.energy >= ranged.cost! &&
        d >= 260 &&
        d <= ranged.maxReach! &&
        Math.abs(a.y - b.y) < 100 &&
        match.random() < 0.6
      )
        return { unified: true, crouch: true, skill1: true };
      if (
        band.transform &&
        !match.options.rules.disableTransform &&
        !a.stageForm &&
        a.energy >= 75 &&
        match.elapsed > 8000 &&
        match.random() < 0.35
      )
        return { unified: true, transform: true };
      if (
        a.energy === 100 &&
        !match.options.rules.disableSupers &&
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
            (match.options.rules.noCooldowns || !a.moveCooldowns[key]) &&
            (!move.delayedArea ||
              !match.areas.some(
                (area) => area.owner === side && area.attack === key,
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
    if (d < 180 && !match.options.rules.disableNormals)
      return {
        unified: true,
        [match.random() < 0.65 ? "light" : "heavy"]: true,
        crouch: match.random() < 0.2,
      };
    if (d > 200 && match.random() < 0.2) input.jump = true;
    return input;
  }
  return band.ai?.(match, side, input) ?? input;
}
