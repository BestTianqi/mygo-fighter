import strikeBoxes from "../data/strikeBoxes.json";
import { strikeForm, strikeIndex } from "../data/strikePose";
import type { Fighter } from "../objects/Fighter";
import type { Minion } from "../objects/Minion";
import type { Move } from "../objects/Move";
import { MOVES } from "../combatData";

export interface Box {
  left: number;
  right: number;
  bottom: number;
  top: number;
}
export type CombatBody = Fighter | Minion;

// Frame data is in foot-anchored world units: limb near/far/bottom/top, then torso center and height.
const contacts: Record<
  string,
  Partial<Record<"base" | "stage" | "penguin", number[][]>>
> = strikeBoxes;
function drawnStrike(f: Fighter, move: Move | undefined) {
  const index = strikeIndex(f, move);
  return index < 0
    ? undefined
    : contacts[f.character]?.[strikeForm(f)]?.[index];
}

export function hurtbox(body: CombatBody): Box {
  if ("character" in body) {
    const cel = drawnStrike(body, MOVES[body.attack ?? ""]);
    if (cel) {
      const width = body.penguin ? 45 : 32;
      return forwardBox(body, cel[4] - width, cel[4] + width, 0, cel[5]);
    }
  }
  let halfWidth: number, height: number;
  if ("phase" in body) {
    halfWidth = 24;
    height = 80;
  } else if (MOVES[body.attack ?? ""]?.crawl) {
    halfWidth = 55;
    height = 70;
  } else if (body.penguin) {
    halfWidth = 45;
    height = body.crouch ? 128 : 185;
  } else if (body.crouch || MOVES[body.attack ?? ""]?.stance === "crouch") {
    halfWidth = 36;
    height = 139;
  } else {
    halfWidth = 32;
    height = 224;
  }
  return {
    left: body.x - halfWidth,
    right: body.x + halfWidth,
    bottom: body.y,
    top: body.y + height,
  };
}
export function overlaps(a: Box, b: Box) {
  return (
    a.left < b.right && b.left < a.right && a.bottom < b.top && b.bottom < a.top
  );
}
export function ringTouches(
  box: Box,
  x: number,
  y: number,
  outer: number,
  inner = 0,
) {
  const dx = Math.max(box.left - x, 0, x - box.right),
    dy = Math.max(box.bottom - y, 0, y - box.top);
  if (dx * dx + dy * dy >= outer * outer) return false;
  if (!inner) return true;
  const farX = Math.max(x - box.left, box.right - x),
    farY = Math.max(y - box.bottom, box.top - y);
  return farX * farX + farY * farY > inner * inner;
}
export function forwardBox(
  source: Fighter,
  near: number,
  far: number,
  bottom: number,
  top: number,
): Box {
  const a = source.x + source.facing * near,
    b = source.x + source.facing * far;
  return {
    left: Math.min(a, b),
    right: Math.max(a, b),
    bottom: source.y + bottom,
    top: source.y + top,
  };
}

/** Time of first overlap during this simulation tick. A parallel edge merely touching misses. */
export function sweptContact(
  box: Box,
  x: number,
  y: number,
  toX: number,
  toY: number,
  rx: number,
  ry: number,
) {
  const dx = toX - x,
    dy = toY - y;
  const left = box.left - rx,
    right = box.right + rx,
    bottom = box.bottom - ry,
    top = box.top + ry;
  if ((!dx && (x <= left || x >= right)) || (!dy && (y <= bottom || y >= top)))
    return Infinity;
  const x0 = dx ? (left - x) / dx : -Infinity,
    x1 = dx ? (right - x) / dx : Infinity;
  const y0 = dy ? (bottom - y) / dy : -Infinity,
    y1 = dy ? (top - y) / dy : Infinity;
  const enter = Math.max(0, Math.min(x0, x1), Math.min(y0, y1));
  const leave = Math.min(1, Math.max(x0, x1), Math.max(y0, y1));
  return enter < leave ? enter : Infinity;
}

export function meleeContact(
  source: Fighter,
  target: CombatBody,
  move: Move,
  reach: number,
  vertical: number,
) {
  const body = hurtbox(target);
  // A separate effect (such as a transform burst) keeps its own geometry even if the caster is attacking.
  const cel =
    move === MOVES[source.attack ?? ""] ? drawnStrike(source, move) : undefined;
  if (cel) {
    const [near, far, bottom, top] = cel;
    return overlaps(body, forwardBox(source, near, far, bottom, top));
  }
  if (move.sakiko === "ascension" && source.attackTarget)
    return ringTouches(
      body,
      source.attackTarget.x,
      source.attackTarget.y + 100,
      move.areaRadius!,
    );
  if (move.targetArea && source.attackTarget) {
    const origin = source.attackTarget;
    if (move.targetLock)
      return overlaps(body, forwardBox(source, 0, reach, 0, vertical));
    return overlaps(body, {
      left: origin.x - move.areaRadius!,
      right: origin.x + move.areaRadius!,
      bottom: origin.y,
      top: origin.y + vertical,
    });
  }
  if (move.omni) return ringTouches(body, source.x, source.y + 100, reach);
  if (move.nonoka === "headbutt")
    return overlaps(
      body,
      forwardBox(source, 12, Math.min(100, reach), 87, 180),
    );
  if (move.category === "normal" || move.category === "throw") {
    const low =
      source.crouch || move.stance === "crouch" || move.level === "low";
    const center = low
      ? 49
      : move.category === "throw"
        ? 117
        : source.penguin
          ? 105
          : 138;
    const half = move.category === "throw" ? 45 : move.strength === 3 ? 42 : 28;
    return overlaps(
      body,
      forwardBox(source, 12, reach, center - half, center + half),
    );
  }
  return overlaps(body, forwardBox(source, 0, reach, 0, vertical));
}
