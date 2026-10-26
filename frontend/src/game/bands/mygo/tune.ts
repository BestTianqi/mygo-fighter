import type { Move } from "../../objects/Move";
import {
  PENGUIN_SUPER_TUNING,
  penguinSuperPulses,
} from "../shared/derivedSupers";

/** Authored combat timings deliberately differ from recorded video durations. */
export function tuneMygo(MOVES: Record<string, Move>): void {
  Object.assign(MOVES.penguinSuper, {
    name: "春日影·企鹅演唱",
    duration: PENGUIN_SUPER_TUNING.duration,
    start: PENGUIN_SUPER_TUNING.start,
    end: PENGUIN_SUPER_TUNING.end,
    hitstop: PENGUIN_SUPER_TUNING.hitstop,
    shots: [...PENGUIN_SUPER_TUNING.shots],
    pulses: penguinSuperPulses(),
    speed: PENGUIN_SUPER_TUNING.speed,
    lifetime: PENGUIN_SUPER_TUNING.lifetime,
  });
}
