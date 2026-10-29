import type { Move } from "../../../objects/Move";
import { prefixFor } from "../forms";
import { missile } from "./createMoveRegistrar";
interface WaveSpec {
  name: string;
  damage: number;
  speed: number;
  radiusX: number;
  radiusY: number;
  maxReach: number;
  start: number;
  duration: number;
}
export function registerWave(
  MOVES: Record<string, Move>,
  id: number,
  spec: WaveSpec,
  effect: Partial<Move>,
): void {
  MOVES[`${prefixFor({ character: id })}_wave`] = {
    ...missile,
    ownerCharacter: id,
    form: "virtual",
    slot: "u",
    visualSlot: "skill-u",
    command: "↓＋U",
    category: "special",
    ground: true,
    cost: 20,
    height: 100,
    lifetime: 1500,
    chip: 2,
    stun: 320,
    push: 150,
    ...spec,
    ...effect,
    end: spec.start + 80,
  };
}
