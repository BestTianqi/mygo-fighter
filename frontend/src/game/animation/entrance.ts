import type { Match } from "../engine";

export const ENTRANCE_TIMING = Object.freeze({
  performance: 2100,
  ready: 650,
  total: 2750,
});

interface EntranceProfile {
  title: string;
  style: string;
  poses: [string, string, string];
  distance: number;
  hop: number;
  flourish: number;
}

const profile = (
  title: string,
  style: string,
  poses: EntranceProfile["poses"],
  distance: number,
  hop = 0,
  flourish = 0.025,
): EntranceProfile => ({ title, style, poses, distance, hop, flourish });

/** Existing full-body drawings remain intact; each character has a distinct sequence. */
export const ENTRANCES: Readonly<Record<number, EntranceProfile>> = {
  0: profile(
    "闪亮登场",
    "sparkle",
    ["normal-windup", "victory", "normal-recover"],
    185,
    0,
    0.045,
  ),
  1: profile(
    "从容整装",
    "petals",
    ["heal-prepare", "heal-channel", "victory"],
    125,
    0,
    0.018,
  ),
  2: profile(
    "深呼吸",
    "breath",
    ["echo-windup", "note-release", "normal-recover"],
    105,
    0,
    0.012,
  ),
  3: profile(
    "拨弦试音",
    "cat",
    ["tune-windup", "pick-release", "tune-release"],
    170,
    42,
    0.035,
  ),
  4: profile(
    "鼓棒预备",
    "sticks",
    ["calibrate-windup", "roll-release", "calibrate-release"],
    160,
    0,
    0.03,
  ),
  5: profile(
    "低音试弦",
    "bass",
    ["skill-u-windup", "skill-u-impact", "skill-u-recover"],
    135,
    0,
    0.015,
  ),
  6: profile(
    "优雅落键",
    "keys",
    ["skill-i-windup", "skill-i-impact", "super-recover"],
    120,
    0,
    0.022,
  ),
  7: profile(
    "轻声致意",
    "guitar",
    ["guard-standing", "skill-u-windup", "victory"],
    140,
    0,
    0.028,
  ),
  8: profile(
    "安静调弦",
    "strings",
    ["skill-o-windup", "skill-o-recover", "guard-standing"],
    95,
    0,
    0.012,
  ),
  9: profile(
    "镜头准备",
    "camera",
    ["victory", "skill-i-windup", "skill-i-recover"],
    180,
    0,
    0.055,
  ),
  10: profile(
    "星光招呼",
    "stars",
    ["skill-u-windup", "victory", "skill-u-recover"],
    165,
    32,
    0.04,
  ),
  11: profile(
    "礼貌登台",
    "bow",
    ["guard-standing", "skill-i-windup", "skill-i-recover"],
    130,
    0,
    0.065,
  ),
  12: profile(
    "落笔就位",
    "ink",
    ["skill-u-windup", "skill-u-impact", "super-recover"],
    150,
    0,
    0.03,
  ),
  13: profile(
    "贝斯暖场",
    "waves",
    ["skill-o-windup", "skill-u-impact", "skill-o-recover"],
    155,
    0,
    0.022,
  ),
  14: profile(
    "元气登场",
    "hearts",
    ["victory", "skill-o-windup", "skill-o-recover"],
    180,
    36,
    0.045,
  ),
  15: profile(
    "开机入镜",
    "film",
    ["skill-u-windup", "skill-u-impact", "skill-i-recover"],
    145,
    0,
    0.025,
  ),
};

const fallback = profile(
  "登台就位",
  "stars",
  ["idle", "guard-standing", "idle"],
  120,
);

export interface EntranceFrame {
  character: number;
  title: string;
  style: string;
  age: number;
  progress: number;
  animation: string;
  offsetX: number;
  offsetY: number;
  tilt: number;
  alpha: number;
  scaleX: number;
  scaleY: number;
}

/** Pure projection of the shared ready clock: pause/reconnect cannot restart it. */
export function entranceFor(
  match: Pick<Match, "phase" | "phaseMs" | "fighters" | "entrySides">,
  side: number,
  reducedMotion = false,
): EntranceFrame | null {
  const age = ENTRANCE_TIMING.total - match.phaseMs;
  if (
    match.phase !== "ready" ||
    !match.entrySides[side] ||
    age < 0 ||
    age >= ENTRANCE_TIMING.performance
  )
    return null;
  const f = match.fighters[side],
    entry = ENTRANCES[f.character] ?? fallback;
  const approach = Math.min(1, age / 620);
  const gesture = Math.max(0, Math.min(1, (age - 620) / 1230));
  const accent = Math.sin(gesture * Math.PI);
  const pose = age < 1020 ? 0 : age < 1440 ? 1 : 2;
  const animation = reducedMotion
    ? entry.poses[0]
    : age < 620
      ? entry.hop > 0
        ? age < 290
          ? "jump-rise"
          : age < 500
            ? "jump-fall"
            : "landing"
        : Math.floor(age / 140) % 2
          ? "walk-pass"
          : "walk-contact"
      : age >= 1850
        ? "idle"
        : entry.poses[pose];
  return {
    character: f.character,
    title: entry.title,
    style: entry.style,
    age,
    progress: age / ENTRANCE_TIMING.performance,
    animation,
    offsetX: reducedMotion
      ? 0
      : -f.facing * entry.distance * (1 - approach) ** 3,
    offsetY: reducedMotion ? 0 : entry.hop * Math.sin(approach * Math.PI),
    tilt: reducedMotion
      ? 0
      : entry.flourish *
        accent *
        (entry.style === "bow" ? 1 : Math.sin(gesture * Math.PI * 2)),
    alpha: reducedMotion ? 1 : Math.min(1, age / 140),
    scaleX: reducedMotion ? 1 : 1 + accent * 0.012,
    scaleY: reducedMotion
      ? 1
      : 1 - accent * (entry.style === "bow" ? 0.045 : 0.012),
  };
}
