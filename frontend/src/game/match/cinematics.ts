import { MOVES } from "../combatData";
import { SUPER_BLACKOUT_MS } from "../data/superTransition";
import type { Match } from "../engine";

/** Register after ownership/resource checks; failed commands never freeze the match. */
export function startSuperCast(
  match: Match,
  side: number,
  attack: string,
): void {
  const timing = MOVES[attack].cinematic;
  if (!timing) return;
  const f = match.fighters[side];
  match.superCasts[side] = {
    id: match.simulationTick,
    side,
    character: f.character,
    attack,
    form: f.penguin
      ? "penguin"
      : f.stageForm
        ? "stage"
        : MOVES[attack].form === "virtual"
          ? "virtual"
          : "normal",
    elapsedMs: 0 - (timing.mediaDelayMs ?? 0),
    held: !!timing.mediaDelayMs,
  };
  match.superIntro ??= { elapsedMs: 0, durationMs: 0, sides: [] };
  match.superIntro.sides.push(side);
  match.superIntro.durationMs = Math.max(
    match.superIntro.durationMs,
    SUPER_BLACKOUT_MS + timing.leadInMs,
  );
}

/** Same-tick casts share one frozen interval; their media starts are staggered. */
export function alignSuperIntro(match: Match): void {
  const intro = match.superIntro;
  if (!intro) return;
  for (const cast of match.superCasts) {
    if (!cast) continue;
    if (intro.sides.includes(cast.side)) {
      const timing = MOVES[cast.attack].cinematic!;
      cast.elapsedMs =
        -(intro.durationMs - timing.leadInMs) - (timing.mediaDelayMs ?? 0);
      cast.held = cast.elapsedMs < 0;
    } else cast.held = true;
  }
}

/** Presentation progresses while the world is stopped. User pause stops both via advance(). */
export function advanceSuperClocks(match: Match): boolean {
  const intro = match.superIntro;
  if (intro) {
    intro.elapsedMs += 10;
    for (const side of intro.sides) {
      const cast = match.superCasts[side];
      if (!cast) continue;
      cast.elapsedMs += 10;
      cast.held = cast.elapsedMs < 0;
    }
    if (intro.elapsedMs >= intro.durationMs) {
      match.superIntro = null;
      for (const cast of match.superCasts)
        if (cast) cast.held = cast.elapsedMs < 0;
    }
    return true;
  }
  for (const cast of match.superCasts)
    if (cast) {
      cast.elapsedMs += 10;
      cast.held = cast.elapsedMs < 0;
    }
  return false;
}

export function hasTimedSuper(match: Match): boolean {
  return match.fighters.some(
    (f, side) => match.active(side) && !!MOVES[f.attack ?? ""]?.cinematic,
  );
}
