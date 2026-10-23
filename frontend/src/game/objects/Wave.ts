import type { Move } from "./Move";
import type { Platform } from "./Terrain";
export interface Wave {
  x: number;
  y: number;
  vx: number;
  owner: number;
  attack: string;
  life: number;
  age: number;
  radial?: boolean;
  radius?: number;
  previousRadius?: number;
  hitTargets?: number[];
  hitMinions?: string[];
  impact?: Partial<Move>;
  rx?: number;
  ry?: number;
  originX?: number;
  originY?: number;
  maxReach?: number;
  maxVertical?: number;
  vy?: number;
  gravity?: number;
  groundShock?: boolean;
  platform?: Platform;
}
