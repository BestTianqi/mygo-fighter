import type { Terrain } from "./Terrain";
import type { BattleRules } from "./BattleRules";
export type Mode = "cpu" | "duel" | "practice";
export type Format =
  | "1v1"
  | "2v2"
  | "3v3"
  | "4v4"
  | "5v5"
  | "6v6"
  | "7v7"
  | "8v8";
export interface MatchOptions {
  rules?: Partial<BattleRules>;
  mode?: Mode;
  format?: Format;
  difficulty?: number;
  characters?: number[];
  seed?: number;
  teams?: number[][];
  terrain?: Terrain | null;
  dummy?: "idle" | "guard" | "crouch";
}
export interface MatchConfig {
  rules?: BattleRules;
  mode: Mode;
  format: Format;
  characters: number[];
  teams?: number[][];
  seed?: number;
  settings: {
    arena: number;
    difficulty: number;
    sound: boolean;
    terrain: boolean;
    dummy: "idle" | "guard" | "crouch";
  };
}
