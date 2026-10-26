import type { BandId } from "./BandId";

export interface Character {
  name: string;
  shortName: string;
  en: string;
  skill: string;
  color: string;
  role: string;
  archetype: string;
  specialType: string;
  description: string;
  speed: number;
  jump: number;
  lightReach: number;
  heavyReach: number;
  heavyDamage: number;
  specialReach: number;
  specialVertical?: number;
  id?: number;
  stageName?: string;
  key?: string;
  /** Display band label; `bandId` is the code module that owns the character. */
  band?: string;
  bandId?: BandId;
}
