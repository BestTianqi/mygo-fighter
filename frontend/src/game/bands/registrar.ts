import type { BandId } from "../objects/BandId";
import type { Move } from "../objects/Move";

export interface MoveRegistrarOptions {
  band: BandId;
  form: string;
  reach?: number;
  vertical?: number;
}

const COSTS: Record<string, number> = { u: 20, i: 25, o: 30, super: 100 };
const COMMANDS: Record<string, string> = { u: "U", i: "I", o: "O", super: "P" };

/**
 * Standard key scheme for a new band: `<band>_<character>_<form>_<slot>`.
 * Bands with legacy key names pass their own `movesFor`/registration instead.
 */
export function createMoveRegistrar(
  MOVES: Record<string, Move>,
  { band, form, reach = 170, vertical = 160 }: MoveRegistrarOptions,
) {
  return function add(
    id: number,
    slot: "u" | "i" | "o" | "super",
    name: string,
    extra: Partial<Move> = {},
  ) {
    const key = `${band}_${id}_${form}_${slot}`;
    MOVES[key] = {
      ownerCharacter: id,
      form,
      slot,
      visualSlot: slot === "super" ? "super" : "skill-" + slot,
      name,
      command: COMMANDS[slot],
      category: "special",
      ground: true,
      cost: COSTS[slot],
      duration: 600,
      start: 160,
      end: 240,
      damage: slot === "o" ? 22 : 16,
      stun: 320,
      push: 150,
      reach,
      vertical,
      ...extra,
    };
    return key;
  };
}
