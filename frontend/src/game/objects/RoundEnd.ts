import type { Finisher } from "./Finisher";

export interface RoundEnd {
  winner: number;
  finisher: Finisher | null;
  fighters: {
    character: number;
    penguin: boolean;
    stageForm: boolean;
    attack: string | null;
    attackMs: number;
    y: number;
    landY: number;
  }[];
}
