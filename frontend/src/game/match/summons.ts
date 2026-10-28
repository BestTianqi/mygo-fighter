import { MOVES, ROSTER, WORLD } from "../combatData";
import type { Match } from "../engine";
import type { Minion } from "../objects/Minion";
import type { Move } from "../objects/Move";
import { clamp, outgoingMultiplier } from "./combatMath";

export function hitMinion(
  match: Match,
  side: number,
  unit: Minion,
  attack: string,
  impact: Partial<Move> = {},
): void {
  const owner = 1 - side,
    group = match.fighters[owner].summons;
  const move = { ...MOVES[attack], ...impact };
  if (!group?.units.includes(unit) || unit.hp <= 0 || move.category === "throw")
    return;
  const baseDamage =
    attack === "heavy"
      ? ROSTER[match.fighters[side].character].heavyDamage
      : move.damage;
  const damage =
    Math.round(
      baseDamage *
        outgoingMultiplier(match.fighters[side], attack) *
        match.options.rules.damageMultiplier *
        10,
    ) / 10;
  if (!(damage > 0)) return;
  unit.hp = Math.max(0, Math.round((unit.hp - damage) * 10) / 10);
  match.events.push({
    type: "minionHit",
    side,
    owner,
    unit: unit.id,
    damage,
    hp: unit.hp,
    defeated: unit.hp === 0,
    x: unit.x,
    y: unit.y + 40,
  });
  if (unit.hp === 0) {
    group.units = group.units.filter((p) => p !== unit);
    if (!group.units.length) match.fighters[owner].summons = null;
  }
}

export function updateSummons(match: Match): void {
  for (let side = 0; side < 2; side++) {
    const f = match.fighters[side],
      target = match.fighters[1 - side],
      group = f.summons;
    if (!group) continue;
    if (group.bornAt !== match.elapsed) group.ms -= 10;
    if (group.ms <= 0 || f.hp <= 0) {
      f.summons = null;
      continue;
    }
    for (const p of group.units) {
      if (
        !p.called &&
        MOVES.summon.lifetime! - group.ms >= p.id * MOVES.summon.callGap!
      ) {
        p.called = true;
        match.events.push({
          type: "minionCall",
          side,
          unit: p.id,
          x: p.x,
          y: p.y,
        });
      }
      if (group.bornAt === match.elapsed) continue;
      p.hitMs = Math.max(0, p.hitMs - 10);
      const anchorX = clamp(
          f.x + (p.id - 1) * 52,
          WORLD.left + 32,
          WORLD.right - 32,
        ),
        anchorY = Math.max(f.y, match.floorHeight(anchorX)) + 8;
      if (p.phase === "follow") {
        p.cooldown -= 10;
        if (p.cooldown <= 0 && target.hp > 0) {
          p.phase = "charge";
          p.phaseMs = 800;
        }
      }
      const charging = p.phase === "charge";
      const direction = target.x >= p.x ? 1 : -1;
      const goalX = charging ? target.x - direction * 26 : anchorX;
      const goalY = charging ? target.y + 10 : anchorY;
      p.facing = charging ? direction : f.facing;
      p.x = clamp(
        p.x + clamp(goalX - p.x, charging ? -6 : -5, charging ? 6 : 5),
        WORLD.left + 20,
        WORLD.right - 20,
      );
      p.y += clamp(goalY - p.y, -4.2, 4.2);
      if (charging) {
        p.phaseMs -= 10;
        if (
          Math.abs(target.x - p.x) < 40 &&
          Math.abs(target.y + 10 - p.y) < 60 &&
          !target.knockdown &&
          !match.invulnerable(target) &&
          target.hp > 0
        ) {
          match.hit(side, "tensoraHit", p.x, p.y + 40);
          match.events.push({
            type: "minionStrike",
            side,
            unit: p.id,
            x: p.x,
            y: p.y + 40,
          });
          p.hitMs = 180;
          p.phase = "return";
          p.cooldown = 950;
        } else if (p.phaseMs <= 0) {
          p.phase = "return";
          p.cooldown = 950;
        }
      } else if (
        p.phase === "return" &&
        Math.abs(p.x - anchorX) < 16 &&
        Math.abs(p.y - anchorY) < 16
      )
        p.phase = "follow";
    }
  }
}
