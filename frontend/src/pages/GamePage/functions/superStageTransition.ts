import { MOVES } from "../../../game/combatData";
import {
  hasSuperCutin,
  SUPER_BLACKOUT_MS,
  usesSuperBackground,
} from "../../../game/data/superTransition";
import type { GameView } from "../objects/GameView";

const DARK_AT_MS = 140;
const VIDEO_REVEAL_MS = 130;
const STAGE_RETURN_MS = 190;

const clamp = (n: number) => Math.max(0, Math.min(1, n));

/** A newer long cast takes precedence. On the same tick, prefer the longer intro. */
export function longSuperVideoOwner(
  casts: GameView["superCasts"],
  cutins: GameView["cutins"],
) {
  let owner = null;
  let lead = 0;
  for (const cast of casts) {
    if (!cast || !cutins[cast.side]?.video) continue;
    const timing = MOVES[cast.attack]?.cinematic;
    if (!timing || !hasSuperCutin(timing)) continue;
    const leadIn = timing.leadInMs;
    if (
      !owner ||
      cast.id > owner.id ||
      (cast.id === owner.id && leadIn > lead)
    ) {
      owner = cast;
      lead = leadIn;
    }
  }
  return owner;
}

/** Project the same cast clock in the canvas renderer and the video layer. */
export function superStageTransition(
  casts: GameView["superCasts"],
  cutins: GameView["cutins"],
  phase: GameView["phase"],
) {
  const hasVideo = cutins.some((media, side) => {
    const cast = casts[side];
    return (
      !!media?.video &&
      (!cast || usesSuperBackground(MOVES[cast.attack]?.cinematic))
    );
  });
  const background = { showVideo: hasVideo, stageOpacity: 1, blackOpacity: 0 };
  if (!hasVideo || phase !== "fighting") return background;

  const owner = longSuperVideoOwner(casts, cutins);
  if (!owner) return background;
  const timing = MOVES[owner.attack].cinematic!;
  const mediaAge = owner.elapsedMs + (timing.mediaDelayMs ?? 0);
  const beforeCombatMs = mediaAge - timing.leadInMs;
  const age = mediaAge + SUPER_BLACKOUT_MS;
  if (age < DARK_AT_MS) {
    return {
      showVideo: false,
      stageOpacity: 1,
      blackOpacity: clamp(age / DARK_AT_MS),
    };
  }
  return {
    showVideo: true,
    stageOpacity: Math.sqrt(clamp(beforeCombatMs / STAGE_RETURN_MS)),
    blackOpacity: 1 - clamp((age - DARK_AT_MS) / VIDEO_REVEAL_MS),
  };
}
