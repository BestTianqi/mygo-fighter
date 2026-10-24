import type { Terrain } from "./Terrain";
export interface SpriteFrame {
  name?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  ax: number;
  ay: number;
  height?: number;
}
export interface Atlas {
  atlas: string;
  frames: SpriteFrame[];
}
export interface CharacterArt extends Atlas {
  portrait: string;
  actionFrames?: SpriteFrame[];
}
export interface Portrait {
  portrait: string;
  face: string;
  idle: Atlas;
}
export interface Stage {
  id: string;
  name: string;
  thumbnail: string;
  terrain: Terrain;
  category: string;
  layout: string;
  ambience: string;
}
export interface Presentation {
  label: string;
  voice?: string;
  duration?: number;
  video?: string;
  videoRef?: string;
  slot?: string | null;
  videoRate?: number;
}
export interface Assets {
  characters: CharacterArt[];
  backgrounds: string[];
  stages: Stage[];
  mujicaForms: Record<string, Record<string, Atlas>>;
  mewtypeForms: Record<string, Record<string, Atlas>>;
  mujicaMaskForms: Record<string, Atlas>;
  memeCrawlForms: Record<string, Atlas>;
  mygoPortraits?: Record<string, Portrait>;
  mujicaPortraits: Record<string, Record<string, Portrait>>;
  anonNormals: Atlas;
  milkDragon: Atlas;
  anonActions: Atlas;
  soyoActions: Atlas;
  soyoTensora: Atlas;
  tomoriActions: Atlas;
  penguin: Atlas;
  ranaParfaitActions: Atlas;
  sakikoCustomerActions: Atlas;
  jabActions: Atlas[];
  ranaParfait: { src: string; height: number };
  memeSkills: Record<
    string,
    {
      slots: Record<string, Presentation>;
      variants: Record<string, Presentation>;
    }
  >;
  memeVoices: Record<string, string>;
  penguinVoices: Record<string, string>;
  soyoVoices: Record<string, string>;
  summonVoices: Record<string, string>;
  transformMusic: Record<string, string>;
  soyoSuperVideo: string;
  soyoFinishArt: string;
  uikaFinishArt: string;
  finishArts?: Record<string, string>;
}
