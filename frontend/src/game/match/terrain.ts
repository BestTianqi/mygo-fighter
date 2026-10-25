import { FEEL, MOVES, profileFor, WORLD } from "../combatData";
import type { Match } from "../engine";
import type { Fighter } from "../objects/Fighter";
import type { Terrain } from "../objects/Terrain";
import { clamp } from "./combatMath";

export function floorHeight(match: Match, x: number): number {
  const points = match.options.terrain?.ground;
  let base = 0;
  if (points?.length) {
    base = x <= points[0].x ? points[0].y : points.at(-1)!.y;
    for (let i = 1; i < points.length; i++)
      if (x > points[i - 1].x && x <= points[i].x) {
        const a = points[i - 1],
          b = points[i];
        base = a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
        break;
      }
  }
  return (
    base +
    Math.max(
      0,
      ...(match.options.terrain?.hills || []).map((p) =>
        x <= p.left || x >= p.right
          ? 0
          : x < p.peak
            ? ((x - p.left) / (p.peak - p.left)) * p.height
            : ((p.right - x) / (p.right - p.peak)) * p.height,
      ),
    )
  );
}

export function surfaceBelow(
  match: Match,
  x: number,
  y: number,
  dropMs = 0,
): number {
  let height = match.floorHeight(x);
  if (!dropMs)
    for (const p of match.options.terrain?.platforms || []) {
      if (x >= p.left && x <= p.right && p.height <= y + 0.1)
        height = Math.max(height, p.height);
    }
  return height;
}

export function grounded(match: Match, f: Fighter): boolean {
  return (
    f.vy <= 0 && Math.abs(f.y - match.surfaceBelow(f.x, f.y, f.dropMs)) < 0.1
  );
}

export function airHeight(match: Match, f: Fighter): number {
  return f.y - match.surfaceBelow(f.x, f.y, f.dropMs);
}

export function setTerrain(match: Match, terrain: Terrain | null): void {
  const onFloor = match.fighters.map(
    (f) => match.grounded(f) && Math.abs(f.y - match.floorHeight(f.x)) < 0.1,
  );
  match.options.terrain = terrain;
  match.aiGoal = -1;
  match.fighters.forEach((f, i) => {
    const floor = match.floorHeight(f.x);
    if (onFloor[i]) {
      f.y = floor;
      f.vy = 0;
    } else if (f.y < floor || (f.vy <= 0 && f.y <= floor + 0.1))
      match.land(f, floor);
  });
}

export function land(match: Match, f: Fighter, height: number): void {
  const speed = Math.max(0, -f.vy),
    heavy = speed > 180 * FEEL.scale && (f.stun > 0 || f.launched || f.hp <= 0);
  if (speed > 0)
    match.events.push({
      type: "landing",
      side: match.fighters.indexOf(f),
      x: f.x,
      y: height,
      heavy,
      speed,
    });
  if (heavy) {
    f.knockdown = 400;
    f.stun = 0;
    f.wakeInvuln = 770;
  }
  f.launched = false;
  f.y = height;
  f.vy = 0;
  if (!f.dashMs) f.vx = 0;
  f.airUsed = false;
  f.jumps = 2;
  f.dropMs = 0;
  if (f.attack && MOVES[f.attack ?? ""].stance === "air") {
    f.attack = null;
    f.cooldown = 60;
  }
  if (f.attack === "dive" || f.attack === "ranaDive") {
    f.attack = null;
    f.cooldown = f.landingRecovery = f.contact ? 100 : 240;
    f.contact = false;
  }
  if (f.attack === "penguinKick") {
    f.attack = null;
    f.cooldown = f.landingRecovery = f.contact ? 90 : 200;
    f.contact = false;
  }
}

export function jumpTime(f: Fighter, height: number): number {
  const speed = profileFor(f).jump,
    discriminant = speed * speed - 2 * FEEL.gravity * (height - f.y);
  return discriminant < 0
    ? -1
    : (speed + Math.sqrt(discriminant)) / FEEL.gravity;
}

export function nextPlatform(match: Match, a: Fighter, b: Fighter): number {
  const platforms = match.options.terrain?.platforms || [];
  const target = platforms.findIndex(
    (p) => b.x >= p.left && b.x <= p.right && Math.abs(b.y - p.height) < 0.1,
  );
  if (target < 0 || b.y <= a.y + 0.1) return -1;
  const support = platforms.findIndex(
    (p) => a.x >= p.left && a.x <= p.right && Math.abs(a.y - p.height) < 0.1,
  );
  const start = support < 0 ? platforms.length : support;
  const nodes = [
      ...platforms,
      { left: WORLD.left + 45, right: WORLD.right - 45, height: a.y },
    ],
    visited = new Set([start]);
  const queue = [{ index: start, first: -1 }],
    profile = profileFor(a);
  while (queue.length) {
    const { index, first } = queue.shift()!,
      from = nodes[index];
    for (let i = 0; i < platforms.length; i++) {
      const to = platforms[i];
      if (visited.has(i) || to.height <= from.height) continue;
      const time = match.jumpTime({ ...a, y: from.height }, to.height);
      const gap = Math.max(
        0,
        to.left + 18 - (from.right - 18),
        from.left + 18 - (to.right - 18),
      );
      if (time < 0 || time * profile.speed < gap + 8) continue;
      const hop = first < 0 ? i : first;
      if (i === target) return hop;
      visited.add(i);
      queue.push({ index: i, first: hop });
    }
  }
  return -1;
}

export function separate(match: Match): void {
  const [a, b] = match.fighters;
  if (Math.abs(a.y - b.y) > 34 * FEEL.scale || a.dashMs || b.dashMs) return;
  const dx = b.x - a.x,
    gap = Math.abs(dx);
  if (gap >= FEEL.bodyGap) return;
  const onFloor = match.fighters.map(
    (f) => match.grounded(f) && Math.abs(f.y - match.floorHeight(f.x)) < 0.1,
  );
  const crawlSupports = match.fighters.map((f) =>
    MOVES[f.attack ?? ""]?.crawl && match.grounded(f)
      ? (match.options.terrain?.platforms || []).find(
          (p) =>
            f.x >= p.left && f.x <= p.right && Math.abs(p.height - f.y) < 0.1,
        )
      : null,
  );
  const sign = dx >= 0 ? 1 : -1,
    push = (FEEL.bodyGap - gap) / 2;
  const left = WORLD.left + 45,
    right = WORLD.right - 45;
  a.x = clamp(a.x - sign * push, left, right);
  b.x = clamp(b.x + sign * push, left, right);
  if (a.x === left || a.x === right) b.x = a.x + sign * FEEL.bodyGap;
  if (b.x === left || b.x === right) a.x = b.x - sign * FEEL.bodyGap;
  match.fighters.forEach((f, i) => {
    if (crawlSupports[i])
      f.x = clamp(f.x, crawlSupports[i].left + 18, crawlSupports[i].right - 18);
    const floor = match.floorHeight(f.x);
    if (onFloor[i]) f.y = floor;
    else if (f.y < floor || (f.vy <= 0 && f.y <= floor + 0.1))
      match.land(f, floor);
  });
}
