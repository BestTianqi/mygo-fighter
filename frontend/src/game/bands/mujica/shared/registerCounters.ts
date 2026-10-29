import type { Move } from "../../../objects/Move";
import { missile } from "./createMoveRegistrar";
export function registerCounters(MOVES: Record<string, Move>): void {
  for (const [key, move] of Object.entries(MOVES))
    if (move.counter && move.counterDamage) {
      move.counterAttack = key + "_counter";
      MOVES[move.counterAttack] = {
        ...missile,
        ownerCharacter: move.ownerCharacter,
        form: move.form,
        internal: true,
        duration: 0,
        start: 0,
        end: 0,
        name: move.name + "·反击",
        category: "special",
        ...(move.nyamu ? { nyamu: move.nyamu } : {}),
        ...(move.umiri ? { umiri: move.umiri } : {}),
        damage: move.counterDamage,
        chip: 0,
        stun: 340,
        push: 220,
        speed: 700,
        lifetime: 500,
      };
    }
}
