export interface RoundEnd {
  winner: number;
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
