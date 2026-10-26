import { MOVES, bandFor, profileFor } from "../combatData";
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
  return band.ai?.(match, 1, input) ?? input;
}
