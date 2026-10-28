import { bandFor, MOVES, NORMAL_BUTTONS } from "../combatData";
import * as controls from "../controls";
import type { Match } from "../engine";
import type { Fighter } from "../objects/Fighter";
import type { Input } from "../objects/Input";
import { moveEnabled } from "../battleRules";

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
  const name = resolveRequestedAttack(match, f, input, pressed);
  return name && moveEnabled(match.options.rules, MOVES[name]) ? name : null;
}

function resolveRequestedAttack(
  match: Match,
  f: Fighter,
  input: Input,
  pressed: (key: string) => boolean,
): string | null {
  const band = bandFor(f.character);
  if (input.unified || band.unified) {
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
  return band.command?.(match, f, requested, input) ?? null;
}

export function canCancel(
  match: Match,
  f: Fighter,
  name: string,
): boolean | null {
  const band = bandFor(f.character);
  if (band.transform && name === band.transform.move) return false;
  const chain = MOVES[name]?.chain;
  if (
    match.grounded(f) &&
    chain &&
    ((chain === 2 && f.attack === band.normalFor(f, "light")) ||
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
    f.cancelDepth >= band.cancelDepth(f)
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
      (((band.airCancel?.(f, name) ?? false) &&
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
  if (band.extraCancel?.(match, f, name)) return true;
  return (
    current.category === "normal" &&
    (next.category === "special" ||
      (next.category === "normal" && next.strength! > current.strength!))
  );
}
