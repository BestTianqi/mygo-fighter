import type { Fighter } from "./objects/Fighter";
import type { Move } from "./objects/Move";

const clamp = (t: number) => Math.max(0, Math.min(1, t));
const smooth = (t: number) => {
  const p = clamp(t);
  return p * p * (3 - 2 * p);
};
const styles = [
  ["thrust", 13],
  ["thrust", 9],
  ["thrust", 10],
  ["sweep", 15],
  ["down", 17],
  ["sweep", 11],
  ["thrust", 10],
  ["sweep", 14],
  ["sweep", 10],
  ["down", 17],
  ["thrust", 12],
  ["sweep", 14],
  ["down", 13],
  ["sweep", 14],
  ["sweep", 12],
] as const;

export function isHeavyAttack(move: Move | undefined): boolean {
  return (
    !!move &&
    move.category === "normal" &&
    move.strength === 3 &&
    !move.jab &&
    !move.chain
  );
}

/** Keep authored poses and all three phases, including Anon's airborne heavies. */
export function heavyPose(f: Fighter, move: Move): string | null {
  const phase =
    f.attackMs < move.start
      ? "windup"
      : f.attackMs <= move.end
        ? "impact"
        : "recover";
  if (f.character >= 5) return `${move.visualSlot}-${phase}`;
  const stance = move.stance ?? "standing";
  if (phase !== "impact") {
    if (stance === "air") return phase === "windup" ? "jump-rise" : "jump-fall";
    if (stance === "crouch")
      return f.character === 0 ? `crouch-${phase}` : "guard-crouch";
    if (phase === "windup" && f.penguin) return "call-windup";
    if (phase === "windup" && f.character === 4) return "super-windup";
    return `normal-${phase}`;
  }
  if (f.character === 0) return null; // The normal atlas owns fist/kick impact drawings.
  if (f.character === 1) return "palm-heavy";
  if (f.character === 2) {
    if (!f.penguin) return "mic-heavy";
    const kick = (move.normalIndex ?? 2) % 6 >= 3;
    return stance === "standing"
      ? `${kick ? "kick" : "flipper"}-heavy`
      : `${stance}-${kick ? "kick" : "flipper"}`;
  }
  return `${stance}-${(move.normalIndex ?? 2) % 6 >= 3 ? "heavyKick" : "heavy"}`;
}

/** Presentation follows attackMs, so hitstop and LAN snapshots retain exact timing. */
export function heavyMotion(
  f: Fighter,
  move: Move | undefined,
  reduced = false,
) {
  if (
    reduced ||
    !move ||
    !isHeavyAttack(move) ||
    !f.attack ||
    f.stun ||
    f.knockdown ||
    f.dashMs ||
    f.attackMs < 0 ||
    f.attackMs >= move.duration
  )
    return null;
  const [style, weight] = styles[f.character];
  const kick = (move.normalIndex ?? 0) % 6 >= 3 || f.attack === "overhead";
  const kind = f.penguin && !kick ? "penguin" : kick ? "kick" : style;
  const stanceWeight =
    move.stance === "crouch" ? 0.65 : move.stance === "air" ? 0.75 : 1;
  const strength =
    weight *
    stanceWeight *
    (f.stageForm ? (f.character === 8 ? 1.3 : 1.12) : 1);
  const t = f.attackMs;
  const strikeMs = Math.min(35, (move.end - move.start) / 2);
  let lean: number, lift: number, width: number;
  if (t < move.start) {
    const p = smooth(t / move.start);
    lean = -strength * 0.42 * p;
    lift = -2.5 * p * stanceWeight;
    width = 1 + 0.012 * p;
  } else if (t < move.start + strikeMs) {
    const p = smooth((t - move.start) / strikeMs);
    lean = strength * (-0.42 + 1.42 * p);
    lift = (-2.5 + 3.5 * p) * stanceWeight;
    width = 1.012 - 0.018 * p;
  } else if (t <= move.end) {
    const p = smooth(
      (t - move.start - strikeMs) /
        Math.max(1, move.end - move.start - strikeMs),
    );
    lean = strength * (1 - 0.35 * p);
    lift = (1 - p) * stanceWeight;
    width = 0.994 + 0.006 * p;
  } else {
    const p = smooth((t - move.end) / (move.duration - move.end));
    lean = strength * (0.65 * (1 - p) - 0.12 * Math.sin(Math.PI * p));
    lift = -Math.sin(Math.PI * p) * stanceWeight;
    width = 1;
  }
  const swing = clamp((t - move.start) / (move.end - move.start + 60));
  return {
    lean,
    lift,
    width,
    kind,
    swing,
    opacity: Math.sin(swing * Math.PI) * 0.85,
  };
}
