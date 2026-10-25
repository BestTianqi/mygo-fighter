import type { Move } from "../objects/Move";
export function createMoveRegistrar(MOVES: Record<string, Move>) {
  return function add(
    id: number,
    form: string,
    slot: string,
    name: string,
    extra: Partial<Move> = {},
  ) {
    const key = `mujica_${id}_${form}_${slot}`;
    MOVES[key] = {
      ownerCharacter: id,
      form,
      name,
      slot,
      visualSlot: slot === "super" ? "super" : "skill-" + slot,
      command: (
        { u: "U", i: "I", o: "O", super: "P" } as Record<string, string>
      )[slot],
      category: "special",
      ground: true,
      cost: ({ u: 20, i: 25, o: 30, super: 100 } as Record<string, number>)[
        slot
      ],
      duration: 600,
      start: 160,
      end: 240,
      damage: slot === "o" ? 22 : 16,
      stun: 320,
      push: 150,
      reach: 170,
      vertical: 160,
      ...extra,
    };
    return key;
  };
}

export const missile = {
  projectile: true,
  speed: 520,
  lifetime: 1100,
  height: 100,
  radiusX: 22,
  radiusY: 42,
};
