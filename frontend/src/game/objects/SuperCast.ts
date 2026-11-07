/** The shared simulation clock owns ultimate playback, including LAN replay. */
export interface SuperCast {
  id: number;
  side: number;
  character: number;
  attack: string;
  form: "normal" | "stage" | "penguin" | "virtual";
  elapsedMs: number;
  held: boolean;
}
export interface SuperIntro {
  elapsedMs: number;
  durationMs: number;
  sides: number[];
}
