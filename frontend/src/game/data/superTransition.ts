import type { Move } from "../objects/Move";

/** Time before the original audio/video clock starts, in shared simulation ms. */
export const SUPER_BLACKOUT_MS = 320;

export function hasSuperCutin(timing: Move["cinematic"]): boolean {
  return (timing?.leadInMs ?? 0) >= 1000;
}

export function usesSuperBackground(timing: Move["cinematic"]): boolean {
  return hasSuperCutin(timing) || !!timing?.arenaVideo;
}
