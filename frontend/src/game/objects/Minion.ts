export interface Minion {
  id: number;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  facing: number;
  phase: "follow" | "charge" | "return";
  phaseMs: number;
  cooldown: number;
  hitMs: number;
  called: boolean;
  dropMs?: number;
}
