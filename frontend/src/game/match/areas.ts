import { MOVES } from "../combatData";
import type { Match } from "../engine";
import type { Fighter } from "../objects/Fighter";

export function updateBindings(match: Match): void {
  for (const source of match.fighters) {
    const lock = source.binding;
    if (!lock) continue;
    const target = match.fighters[lock.target];
    if (
      source.hp <= 0 ||
      target.hp <= 0 ||
      !MOVES[source.attack ?? ""]?.targetLock ||
      match.phase !== "fighting"
    ) {
      source.binding = null;
      continue;
    }
    // Reapply after physics and impacts as well as before inputs. Airborne targets,
    // terrain landings, body separation and projectile pushes cannot break the seal.
    target.x = lock.x;
    target.y = lock.y;
    target.vx = target.vy = target.pushVx = 0;
    target.attack = null;
    target.binding = null;
    target.guard = target.crouch = target.launched = false;
    target.buffer = null;
    target.bufferMs = target.jumpBufferMs = target.dashBufferMs = 0;
    target.blinkBuffer = false;
    target.dashMs = target.dashInvuln = target.wakeInvuln = 0;
    target.knockdown = target.landingRecovery = target.coyoteMs = 0;
    target.motion = [];
    // A short refreshed timer releases promptly if the caster is defeated.
    target.hardStun = Math.max(target.hardStun, 30);
    target.stun = Math.max(target.stun, target.hardStun);
  }
}

export function updateSoyoSupers(match: Match): void {
  const move = MOVES.soyoSuper,
    controls = [];
  // Release both casts before applying reactions, so simultaneous P casts trade.
  for (let side = 0; side < 2; side++) {
    const f = match.fighters[side],
      state = f.soyoSuper;
    if (!state) continue;
    if (f.hp <= 0 || (!state.released && f.attack !== "soyoSuper")) {
      f.soyoSuper = null;
      continue;
    }
    if (state.bornAt !== match.elapsed) state.ms -= 10;
    if (state.ms <= 0) {
      f.soyoSuper = null;
      continue;
    }
    const age = move.duration - state.ms - move.start;
    if (!state.released && age >= 0) {
      state.released = true;
      state.x = f.x;
      state.y = f.y + 100;
      f.attack = null;
      f.cooldown = 0;
      f.contact = false;
      f.cancelDepth = 0;
      match.events.push({
        type: "soyoSuperRelease",
        side,
        x: state.x,
        y: state.y,
      });
    }
    if (!state.released) continue;
    state.radius = move.reach! * Math.min(1, age / move.expansion!);
    const target = match.fighters[1 - side];
    if (
      age > move.waveDuration! ||
      state.hitTargets.includes(1 - side) ||
      target.hp <= 0 ||
      match.invulnerable(target)
    )
      continue;
    if (
      Math.hypot(target.x - state.x, target.y + 100 - state.y) <= state.radius
    ) {
      state.hitTargets.push(1 - side);
      controls.push(side);
    }
  }
  for (const side of controls) {
    const target = match.fighters[1 - side];
    target.hardStun = Math.max(target.hardStun, move.hardStun!);
    target.stun = Math.max(target.stun, target.hardStun);
    target.attack = target.buffer = null;
    target.cooldown =
      target.bufferMs =
      target.jumpBufferMs =
      target.dashBufferMs =
      target.coyoteMs =
        0;
    target.dashMs = 0;
    target.blinkBuffer = false;
    target.motion = [];
    target.guard = target.crouch = false;
    target.vx = 0;
    if (target.soyoSuper && !target.soyoSuper.released) target.soyoSuper = null;
    match.events.push({
      type: "hardControl",
      side,
      target: 1 - side,
      duration: move.hardStun,
      x: target.x,
      y: target.y + 100,
    });
  }
}

export function updateAreas(match: Match): void {
  for (const area of match.areas) {
    area.warning -= 10;
    area.life -= 10;
    if (area.warning > 0 || area.fired) continue;
    area.fired = true;
    const target = match.fighters[1 - area.owner],
      move = MOVES[area.attack ?? ""];
    match.events.push({
      type: "areaPulse",
      side: area.owner,
      attack: area.attack,
      x: area.x,
      y: area.y,
    });
    const connects = (
      body: Pick<Fighter, "x" | "y"> & {
        dropMs?: number;
      },
    ) => {
      const support = match.surfaceBelow(body.x, body.y, body.dropMs);
      const surface = area.platform
        ? area.platform.height
        : match.floorHeight(body.x);
      const sameSurface =
        Math.abs(support - surface) < 0.1 &&
        (!area.platform ||
          (body.x >= area.platform.left && body.x <= area.platform.right));
      return (
        sameSurface &&
        Math.abs(body.x - area.x) <= area.radius &&
        body.y >= surface - 0.1 &&
        body.y - surface <= move.vertical!
      );
    };
    if (connects(target) && !target.knockdown)
      match.hit(area.owner, area.attack, area.x, area.y + 80);
    for (const unit of [...(target.summons?.units || [])])
      if (connects(unit)) match.hitMinion(area.owner, unit, area.attack);
  }
  match.areas = match.areas.filter((area) => area.life > 0);
}
