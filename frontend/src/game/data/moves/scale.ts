import type { Move } from "../../objects/Move";
import { FEEL, verticalScale } from "../rules";

/**
 * Scales authored launch/push/pulse values shared by every band. Runs after the
 * band data is merged and before chains or tuning read those numbers.
 */
export function scaleSharedMovement(MOVES: Record<string, Move>): void {
  for (const move of Object.values(MOVES)) {
    if (move.launch) move.launch *= verticalScale;
    if (!move.jab && move.push) move.push *= FEEL.scale / 2;
    if (move.pulses)
      for (const pulse of move.pulses)
        if (pulse.push) pulse.push *= FEEL.scale / 2;
  }
}
