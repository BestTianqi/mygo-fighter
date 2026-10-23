export interface Platform {
  left: number;
  right: number;
  height: number;
}
export interface Terrain {
  material?: string;
  colors?: string[];
  ground?: { x: number; y: number }[];
  hills?: (Platform & { peak: number })[];
  platforms: Platform[];
}
