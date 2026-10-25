export interface Move {
  projectileRadiusY?: number;
  beatEligible?: boolean;
  name: string;
  category:
    | "normal"
    | "special"
    | "super"
    | "throw"
    | "utility"
    | "movement"
    | "transformation"
    | "defense";
  stance?: "standing" | "crouch" | "air";
  strength?: number;
  normalIndex?: number;
  command?: string;
  duration: number;
  start: number;
  end: number;
  damage: number;
  reach?: number;
  stun?: number;
  push?: number;
  level?: string;
  vertical?: number;
  knockdown?: number;
  jab?: boolean;
  tomoriOnly?: boolean;
  nativeOnly?: boolean;
  ground?: boolean;
  cost?: number;
  lifetime?: number;
  penguinOnly?: boolean;
  penguinAirAction?: boolean;
  counter?: boolean;
  internal?: boolean;
  projectile?: boolean;
  chip?: number;
  speed?: number;
  radiusX?: number;
  radiusY?: number;
  height?: number;
  omni?: boolean;
  movement?: number;
  movementEnd?: number;
  pulses?: Pulse[];
  shots?: number[];
  ownerCharacter?: number;
  invuln?: number;
  hitstop?: number;
  radial?: boolean;
  fixedDamage?: boolean;
  anonOnly?: boolean;
  artIndex?: number;
  maxReach?: number;
  cancelAt?: number;
  airOnly?: boolean;
  minHeight?: number;
  durability?: number;
  soyoOnly?: boolean;
  healing?: number;
  recast?: number;
  callGap?: number;
  minion?: boolean;
  hardStun?: number;
  expansion?: number;
  waveDuration?: number;
  launch?: number;
  ranaOnly?: boolean;
  spawnOffset?: number;
  projectileVy?: number;
  projectileGravity?: number;
  energyGain?: number;
  // Internal follow-up projectiles share their parent skill's hit count.
  resonanceHits?: number;
  penguinNormal?: boolean;
  rikiOnly?: boolean;
  dashSpeed?: number;
  groundShock?: boolean;
  hitRecovery?: number;
  boosted?: boolean;
  base?: string;
  pull?: boolean | number;
  follow?: boolean;
  form?: string;
  visualSlot?: string;
  chain?: number;
  mujicaOnly?: boolean;
  slot?: string;
  counterDamage?: number;
  counterAttack?: string;
  customerService?: boolean;
  delayedArea?: boolean;
  warning?: number;
  areaRadius?: number;
  mortis?: string;
  nyamu?: "reveal" | "sticks" | "encore" | "smile";
  umiri?: "bass" | "hook" | "toss" | "schedule";
  uika?: "denial" | "pursuit" | "cage" | "crescent";
  nonoka?: "hug" | "search" | "tuna" | "bite" | "comfort" | "eater";
  yuno?: "bass" | "release" | "seaside" | "wave" | "band" | "world";
  ritsu?: "meat" | "polite" | "steak" | "wave" | "hungry";
  miyako?: "draft" | "stamp" | "marathon" | "ink";
  sakiko?: "ascension";
  arale?: "star" | "resolve" | "action" | "voice" | "dream";
  hop?: number;
  crawl?: boolean;
  crawlSpeed?: number;
  forwardCrawl?: boolean;
  targetArea?: boolean;
  targetLock?: boolean;
  damageReduction?: number;
}
export interface Pulse {
  at: number;
  damage: number;
  reach?: number;
  stun?: number;
  push?: number;
  launch?: number;
  pull?: number;
  chip?: number;
  knockdown?: number;
  glyph?: string;
}
