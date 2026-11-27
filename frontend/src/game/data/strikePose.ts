import type { Fighter, FighterIdentity } from "../objects/Fighter";
import type { Move } from "../objects/Move";

export const strikeForm = (f: FighterIdentity) =>
  f.penguin ? "penguin" : f.stageForm ? "stage" : "base";

/** Same slot drives the displayed contact cel and the simulation's authored boxes. */
export function strikeIndex(f: Fighter, move: Move | undefined) {
  if (
    !move ||
    f.stun ||
    f.knockdown ||
    f.attackMs < move.start ||
    f.attackMs > move.end
  )
    return -1;
  if (f.attack === "uppercut") return 3;
  if (f.attack === "dragonPunch") return 4;
  if (
    move.jab &&
    !f.attackCrouch &&
    (!move.stance || move.stance === "standing")
  )
    return (move.chain ?? 1) - 1;
  return -1;
}
