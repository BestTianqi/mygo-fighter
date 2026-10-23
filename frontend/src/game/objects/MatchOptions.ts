import type { Terrain } from "./Terrain";
export type Mode = "cpu" | "duel" | "practice";
export type Format = "1v1" | "3v3";
export interface MatchOptions {
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
