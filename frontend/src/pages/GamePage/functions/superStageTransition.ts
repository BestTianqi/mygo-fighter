import { MOVES } from "../../../game/combatData";
import { SUPER_BLACKOUT_MS } from "../../../game/data/superTransition";
import type { GameView } from "../objects/GameView";

const DARK_AT_MS = 140;
const VIDEO_REVEAL_MS = 130;
const STAGE_RETURN_MS = 190;

const clamp = (n: number) => Math.max(0, Math.min(1, n));

/** Project the same cast clock in the canvas renderer and the video layer. */
export function superStageTransition(
  casts: GameView["superCasts"],
  cutins: GameView["cutins"],
  phase: GameView["phase"],
) {
  const hasVideo = cutins.some((media) => !!media?.video);
  const background = { showVideo: hasVideo, stageOpacity: 1, blackOpacity: 0 };
  if (!hasVideo || phase !== "fighting") return background;

  const castId = Math.max(-1, ...casts.map((cast) => cast?.id ?? -1));
  const current = casts.filter((cast) => cast?.id === castId);
  if (!current.some((cast) => cast && cutins[cast.side]?.video))
    return background;

  let beforeCombatMs = Infinity;
  let leadInMs = 0;
  for (const cast of current) {
    if (!cast) continue;
    const timing = MOVES[cast.attack].cinematic!;
    beforeCombatMs = Math.min(
      beforeCombatMs,
      cast.elapsedMs + (timing.mediaDelayMs ?? 0) - timing.leadInMs,
    );
    leadInMs = Math.max(leadInMs, timing.leadInMs);
  }
  const age = beforeCombatMs + leadInMs + SUPER_BLACKOUT_MS;
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
