import type { Platform } from "./Terrain";
export interface Area {
  owner: number;
  attack: string;
  x: number;
  y: number;
  warning: number;
  life: number;
  radius: number;
  fired?: boolean;
  platform?: Platform;
}
