const MAX_HEALTH = 200;
export const ENTRANCE_TIMING = Object.freeze({
  performance: 2100,
  ready: 650,
  total: 2750,
});
const ROUND_END_TIMING = Object.freeze({
  impact: 120,
  knockout: 700,
  art: 1900,
  settle: 600,
  total: 3200,
});
const WORLD = Object.freeze({
  left: -900,
  right: 1860,
  bottom: -180,
  top: 1120,
});
const FEEL = Object.freeze({
  scale: 235 / 54,
  walk: (1.82 * 60 * 235) / 54,
  airRatio: 1.38 / 1.82,
  jump: (275 * 235) / 54,
  airJumpRatio: 230 / 275,
  gravity: (760 * 235) / 54,
  dashSpeed: (5.15 * 60 * 235) / 54,
  dashDuration: 180,
  dashCooldown: 600,
  dashInvuln: 120,
  dashCost: 10,
  normalBuffer: 150,
  specialBuffer: 300,
  bodyGap: (20 * 235) / 54,
  normalReach: 200,
  heavyReachMultiplier: 1.2,
  normalHeightTolerance: 240,
  skillHeightTolerance: 280,
  superHeightTolerance: 360,
  projectileHeightTolerance: 260,
  groundDrag: (11 * 60 * 235) / 54,
  airDrag: (3 * 60 * 235) / 54,
  baseZoom: ((54 / 235) * 960) / 384,
});
const NORMAL_BUTTONS = [
  "light",
  "medium",
  "heavy",
  "lightKick",
  "mediumKick",
  "heavyKick",
];
const NORMAL_KEYS = ["J", "H", "K", "N", "M", ","];
const verticalScale = Math.sqrt(FEEL.gravity / 1600);
export {
  FEEL,
  MAX_HEALTH,
  NORMAL_BUTTONS,
  NORMAL_KEYS,
  ROUND_END_TIMING,
  WORLD,
  verticalScale,
};
