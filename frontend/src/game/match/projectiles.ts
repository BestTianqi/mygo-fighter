import { MOVES, WORLD } from "../combatData";
import type { Match } from "../engine";
import type { Fighter } from "../objects/Fighter";
import type { Minion } from "../objects/Minion";
import { hurtbox, ringTouches, sweptContact } from "./collision";
import type { Move } from "../objects/Move";

export function spawnWave(
  match: Match,
  side: number,
  attack = "wave",
  impact?: Partial<Move>,
): void {
  const f = match.fighters[side],
    sonic = attack === "sonic",
    move = MOVES[attack];
  if (move.radial) {
    match.waves.push({
      radial: true,
      x: f.x,
      y: f.y + move.height!,
      vx: 0,
      owner: side,
      attack,
      life: move.lifetime!,
      age: 0,
      radius: 0,
      previousRadius: 0,
      hitTargets: [],
      hitMinions: [],
      ...(impact ? { impact } : {}),
    });
    return;
  }
  match.waves.push({
    x: f.x + f.facing * (move.spawnOffset || 45),
    y: f.y + (move.height || (sonic ? 110 : 75)),
    vx: f.facing * move.speed!,
    owner: side,
    life: move.lifetime || 2200,
    age: 0,
    rx: move.radiusX || (sonic ? 22 : 15),
    ry: move.radiusY || (sonic ? 48 : 20),
    attack,
    ...(impact ? { impact } : {}),
    ...(move.homing ? { homing: true, vy: 0 } : {}),
    ...(move.ownerCharacter !== undefined
      ? {
          originX: f.x,
          originY: f.y,
          maxReach:
            move.maxReach || (move.category === "super" ? 420 : undefined),
          // Snapshots are JSON: Infinity would become null and reject airborne hits.
          maxVertical:
            move.category === "super" && !move.homing
              ? 360
              : WORLD.top - WORLD.bottom,
        }
      : {}),
    ...(move.projectileGravity
      ? { vy: move.projectileVy, gravity: move.projectileGravity }
      : {}),
    ...(move.groundShock
      ? {
          groundShock: true,
          platform: (match.options.terrain?.platforms || []).find(
            (p) =>
              f.x >= p.left && f.x <= p.right && Math.abs(p.height - f.y) < 0.1,
          ),
        }
      : {}),
  });
}

export function updateWaves(match: Match): void {
  const starts = match.waves.map((w) => ({ x: w.x, y: w.y, rangeEnd: false }));
  for (const [index, w] of match.waves.entries()) {
    if (w.radial) {
      w.age += 10;
      w.previousRadius = w.radius;
      w.radius = Math.min(
        MOVES[w.attack ?? ""].reach!,
        (w.age * MOVES[w.attack ?? ""].speed!) / 1000,
      );
      continue;
    }
    if (w.homing) {
      const target = match.fighters[match.targetSide(w.owner)],
        desired = Math.atan2(target.y + 80 - w.y, target.x - w.x),
        heading = Math.atan2(w.vy ?? 0, w.vx),
        delta = Math.atan2(
          Math.sin(desired - heading),
          Math.cos(desired - heading),
        ),
        turn = Math.max(-0.08, Math.min(0.08, delta)),
        speed = MOVES[w.attack].speed!;
      w.vx = Math.cos(heading + turn) * speed;
      w.vy = Math.sin(heading + turn) * speed;
      w.y += w.vy * 0.01;
    }
    w.x += w.vx * 0.01;
    w.age += 10;
    if (w.groundShock) {
      if (w.platform && (w.x < w.platform.left || w.x > w.platform.right))
        w.life = 0;
      w.y = (w.platform ? w.platform.height : match.floorHeight(w.x)) + 40;
    }
    if (w.gravity) {
      w.y += w.vy! * 0.01;
      w.vy! -= w.gravity * 0.01;
    }
    if (w.maxReach && Math.abs(w.x - w.originX!) >= w.maxReach) {
      // Keep the last sweep up to the range limit, including an opponent's leading edge.
      const start = starts[index];
      const end = w.originX! + Math.sign(w.x - w.originX!) * w.maxReach;
      const fraction =
        w.x === start.x
          ? 0
          : Math.max(0, Math.min(1, (end - start.x) / (w.x - start.x)));
      w.x = start.x + (w.x - start.x) * fraction;
      w.y = start.y + (w.y - start.y) * fraction;
      start.rangeEnd = true;
    }
    if (w.attack === "sonic") {
      const growth = Math.min(1, w.age / 420);
      w.rx = 22 + growth * 38;
      w.ry = 48 + growth * 82;
    }
    if (w.life > 0 && w.y <= match.floorHeight(w.x)) {
      w.life = 0;
      match.events.push({ type: "terrainHit", x: w.x, y: w.y });
    }
  }
  for (let i = 0; i < match.waves.length; i++)
    for (let j = i + 1; j < match.waves.length; j++) {
      const a = match.waves[i],
        b = match.waves[j];
      if (
        !a.radial &&
        !b.radial &&
        a.life > 0 &&
        b.life > 0 &&
        a.owner !== b.owner &&
        Math.abs(a.x - b.x) < a.rx! + b.rx! &&
        Math.abs(a.y - b.y) < a.ry! + b.ry!
      ) {
        a.life = b.life = 0;
        match.events.push({ type: "clash", x: (a.x + b.x) / 2, y: a.y });
      }
    }
  for (const [index, w] of match.waves.entries()) {
    const start = starts[index];
    if (w.life <= 0) continue;
    const contacts: {
      body: Fighter | Minion;
      time: number;
      side: number;
      minion: boolean;
    }[] = [];
    for (const targetSide of match.enemySides(w.owner)) {
      const target = match.fighters[targetSide];
      if (w.radial) {
        if (
          !w.hitTargets!.includes(targetSide) &&
          !target.knockdown &&
          !match.invulnerable(target) &&
          ringTouches(hurtbox(target), w.x, w.y, w.radius!, w.previousRadius!)
        ) {
          w.hitTargets!.push(targetSide);
          match.hit(w.owner, w.attack, w.x, w.y, w.impact, targetSide);
        }
        const group = target.summons;
        for (const unit of [...(group?.units || [])]) {
          const mark = targetSide + ":" + group!.bornAt + ":" + unit.id;
          if (
            !w.hitMinions!.includes(mark) &&
            ringTouches(hurtbox(unit), w.x, w.y, w.radius!, w.previousRadius!)
          ) {
            w.hitMinions!.push(mark);
            match.hitMinion(w.owner, unit, w.attack, w.impact);
          }
        }
        continue;
      }
      const contact = (body: Fighter | Minion, minion: boolean) => {
        const box = hurtbox(body);
        if (w.maxVertical !== undefined && w.originY !== undefined) {
          box.bottom = Math.max(box.bottom, w.originY - w.maxVertical);
          box.top = Math.min(box.top, w.originY + w.maxVertical);
          if (box.bottom >= box.top) return;
        }
        const time = sweptContact(
          box,
          start.x,
          start.y,
          w.x,
          w.y,
          w.rx!,
          w.ry!,
        );
        if (Number.isFinite(time))
          contacts.push({ body, time, side: targetSide, minion });
      };
      if (!match.invulnerable(target)) contact(target, false);
      for (const unit of target.summons?.units ?? []) contact(unit, true);
    }
    if (w.radial) continue;
    contacts.sort((a, b) => a.time - b.time);
    const first = contacts[0];
    if (first) {
      if (!first.minion)
        match.hit(
          w.owner,
          w.attack || "wave",
          start.x + (w.x - start.x) * first.time,
          start.y + (w.y - start.y) * first.time,
          { ...w.impact, projectileRadiusY: w.ry },
          first.side,
        );
      else
        match.hitMinion(
          w.owner,
          first.body as Minion,
          w.attack || "wave",
          w.impact,
        );
      w.life = 0;
    }
  }
  for (const [index, w] of match.waves.entries()) {
    w.life = starts[index].rangeEnd ? 0 : w.life - 10;
    if (w.life <= 0 && w.attack === "ranaParfait")
      match.events.push({
        type: "parfaitSplash",
        side: w.owner,
        x: w.x,
        y: w.y,
      });
  }
  match.waves = match.waves.filter(
    (w) => w.life > 0 && w.x > WORLD.left - 50 && w.x < WORLD.right + 50,
  );
}
