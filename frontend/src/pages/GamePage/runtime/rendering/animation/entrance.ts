import type { Match } from "../../../../../game/engine";
import { ENTRANCE_TIMING } from "../../../../../game/data/rules";

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
  localAge: number;
  progress: number;
  beat: "approach" | "plant" | "signature" | "stance";
  plant: number;
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
  match: Pick<
    Match,
    "phase" | "phaseMs" | "fighters" | "entrySides" | "floorHeight"
  >,
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
  // A slight reply beat makes the two entrances read as a face-off. A single
  // reserve enters immediately while the surviving fighter keeps their stance.
  const delay = side === 1 && match.entrySides.every(Boolean) ? 100 : 0;
  const localAge = Math.max(0, age - delay);
  const approach = Math.min(1, localAge / 500);
  const travel = approach * approach * (3 - 2 * approach);
  const plant =
    localAge >= 500 && localAge < 640
      ? Math.sin(((localAge - 500) / 140) * Math.PI)
      : 0;
  const beat =
    localAge < 500
      ? "approach"
      : localAge < 640
        ? "plant"
        : localAge < 1760
          ? "signature"
          : "stance";
  const gesture = Math.max(0, Math.min(1, (localAge - 640) / 1120));
  const accent = Math.sin(gesture * Math.PI);
  const pose = localAge < 970 ? 0 : localAge < 1320 ? 1 : 2;
  const animation = reducedMotion
    ? entry.poses[0]
    : beat === "approach"
      ? entry.hop > 0
        ? approach < 0.45
          ? "jump-rise"
          : "jump-fall"
        : Math.floor((travel * entry.distance) / 42) % 2
          ? "walk-pass"
          : "walk-contact"
      : beat === "plant"
        ? "landing"
        : beat === "stance"
          ? "guard-standing"
          : entry.poses[pose];
  const offsetX = reducedMotion ? 0 : -f.facing * entry.distance * (1 - travel);
  const groundOffset = reducedMotion
    ? 0
    : match.floorHeight(f.x + offsetX) - f.y;
  return {
    character: f.character,
    title: entry.title,
    style: entry.style,
    age,
    localAge,
    progress: age / ENTRANCE_TIMING.performance,
    beat,
    plant: reducedMotion ? 0 : plant,
    animation,
    offsetX,
    offsetY: reducedMotion
      ? 0
      : groundOffset + entry.hop * 4 * approach * (1 - approach),
    tilt: reducedMotion
      ? 0
      : entry.flourish *
        (beat === "approach"
          ? Math.sin(approach * Math.PI) * 0.5
          : accent *
            (entry.style === "bow" ? 1 : Math.sin(gesture * Math.PI * 2))),
    alpha: reducedMotion ? 1 : Math.max(0, Math.min(1, (age - delay) / 90)),
    scaleX: reducedMotion ? 1 : 1 + plant * 0.028,
    scaleY: reducedMotion
      ? 1
      : 1 - plant * 0.05 - accent * (entry.style === "bow" ? 0.025 : 0.006),
  };
}

/** Presentation cues use the same paused clock in local play and LAN replay. */
export function openingFor(
  match: Pick<Match, "phase" | "phaseMs" | "inputTick">,
): { kind: "round" | "versus" | "ready" | "fight"; progress: number } | null {
  if (match.phase === "fighting" && match.inputTick < 32)
    return { kind: "fight", progress: match.inputTick / 32 };
  if (match.phase !== "ready") return null;
  const age = ENTRANCE_TIMING.total - match.phaseMs;
  if (age < 0) return null;
  if (age < 420) return { kind: "round", progress: age / 420 };
  if (age < 1800) return { kind: "versus", progress: (age - 420) / 1380 };
  if (age < ENTRANCE_TIMING.performance) return null;
  return {
    kind: "ready",
    progress: Math.min(
      1,
      (age - ENTRANCE_TIMING.performance) / ENTRANCE_TIMING.ready,
    ),
  };
}
