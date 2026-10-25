import type { Move } from "../objects/Move";
export function createMoveRegistrar(MOVES: Record<string, Move>) {
  return function add(
    id: number,
    slot: "u" | "i" | "o" | "super",
    name: string,
    extra: Partial<Move> = {},
  ) {
    const key = `mewtype_${id}_virtual_${slot}`;
    MOVES[key] = {
      ownerCharacter: id,
      form: "virtual",
      slot,
      visualSlot: slot === "super" ? "super" : "skill-" + slot,
      name,
      command: { u: "U", i: "I", o: "O", super: "P" }[slot],
      category: "special",
      ground: true,
      cost: { u: 20, i: 25, o: 30, super: 100 }[slot],
      duration: 600,
      start: 160,
      end: 240,
      damage: slot === "o" ? 22 : 16,
      stun: 320,
      push: 150,
      reach: 190,
      vertical: 170,
      ...extra,
    };
    return key;
  };
}
