import { FEEL, MOVES, profileFor, WORLD } from "../combatData";
import type { Match } from "../engine";
import type { Input } from "../objects/Input";
import { clamp, gravityFor } from "./combatMath";

interface MovementFrame {
  ground: boolean;
  onFloor: boolean;
  oldY: number;
  direction: number;
  plantedGuard: boolean;
}

/** Resolve jumps, dashes and attack locomotion before integrating position. */
export function updateMovement(
  match: Match,
  side: number,
  input: Input,
  { ground, onFloor, oldY, direction, plantedGuard }: MovementFrame,
): void {
  // A buffered action can transform the fighter before this movement step.
  const f = match.fighters[side],
    other = match.fighters[match.targetSide(side)],
    profile = profileFor(f);
  const speed = profile.speed * match.options.rules.speedMultiplier;
  if (
    f.jumpBufferMs &&
    (ground ||
      f.coyoteMs ||
      f.jumps > 0 ||
      match.options.rules.infiniteJumps) &&
    !f.attack &&
    !f.dashMs &&
    !plantedGuard
  ) {
    const groundJump = ground || f.coyoteMs > 0;
    f.guard = f.crouch = false;
    f.jumpBufferMs = f.coyoteMs = f.dashMs = 0;
    if (ground && input.crouch && !onFloor) {
      f.dropMs = 220;
      f.vy = -80;
      f.y -= 0.2;
    } else {
      f.vy = profile.jump * (groundJump ? 1 : FEEL.airJumpRatio);
      if (!match.options.rules.infiniteJumps) f.jumps--;
      f.airUsed = false;
      f.y += 0.01;
      f.vx = direction * speed * (ground ? 1 : FEEL.airRatio);
      if (side > 0 && match.options.mode === "cpu" && match.aiGoal >= 0) {
        const p = match.options.terrain!.platforms[match.aiGoal],
          time = match.jumpTime({ ...f, y: oldY }, p.height);
        f.vx = clamp(
          (clamp(other.x, p.left + 18, p.right - 18) - f.x) / time,
          -speed,
          speed,
        );
      }
    }
  }
  const trace = f.motion;
  const doubleTap =
    direction &&
    trace.length >= 3 &&
    trace.at(-1)!.t === f.controlMs &&
    trace.at(-1)!.d === (direction === f.facing ? 6 : 4) &&
    trace.at(-2)!.d === 5 &&
    trace.at(-3)!.d === trace.at(-1)!.d &&
    f.controlMs - trace.at(-3)!.t <= 240;
  if (doubleTap && !input.unified) {
    f.blinkBuffer = false;
    f.dashBufferMs = FEEL.specialBuffer;
    f.dashDirection = direction;
  }
  if (
    f.dashBufferMs &&
    !f.attack &&
    !plantedGuard &&
    !f.dashCooldown &&
    f.energy >= FEEL.dashCost
  ) {
    if (!match.options.rules.infiniteEnergy) f.energy -= FEEL.dashCost;
    f.guard = false;
    f.dashMs = FEEL.dashDuration;
    f.dashCooldown = FEEL.dashCooldown;
    f.dashInvuln = FEEL.dashInvuln;
    const fromX = f.x,
      fromY = f.y,
      blink = f.blinkBuffer;
    if (blink) {
      f.x = clamp(
        f.x +
          (f.dashDirection *
            FEEL.dashSpeed *
            match.options.rules.speedMultiplier *
            FEEL.dashDuration) /
            1000,
        WORLD.left + 45,
        WORLD.right - 45,
      );
      f.vx = 0;
      f.dashMs = 10;
    } else
      f.vx =
        f.dashDirection * FEEL.dashSpeed * match.options.rules.speedMultiplier;
    f.dashBufferMs = 0;
    f.blinkBuffer = false;
    f.motion = [];
    match.events.push({
      type: blink ? "blink" : "dash",
      side,
      direction: f.dashDirection,
      fromX,
      fromY,
    });
  }
  if (ground && f.vy <= 0 && !f.dropMs && !f.dashMs) {
    f.vx = !f.attack && !plantedGuard && !f.crouch ? direction * speed : 0;
    if (
      f.attack === "special" &&
      f.character === 0 &&
      f.attackMs >= 120 &&
      f.attackMs < 200
    )
      f.vx = f.facing * 420;
    if (f.attack === "thrust" && !f.hit && f.attackMs >= 40 && f.attackMs < 220)
      f.vx = f.facing * 600;
    if (f.attack === "rush" && f.attackMs < 500) f.vx = f.facing * 120;
    if (
      f.attack === "ranaRush" &&
      !f.hit &&
      f.attackMs >= 30 &&
      f.attackMs < 190
    )
      f.vx = f.facing * 640;
    if (
      f.attack === "ranaSlide" &&
      !f.hit &&
      f.attackMs >= 40 &&
      f.attackMs < 230
    )
      f.vx = f.facing * 440;
    if (MOVES[f.attack ?? ""]?.base === "rikiRush" || f.attack === "rikiRush") {
      if (!f.hit && f.attackMs >= 20 && f.attackMs < 250)
        f.vx = f.facing * MOVES[f.attack ?? ""].dashSpeed!;
    }
    if (
      (MOVES[f.attack ?? ""]?.base || f.attack) === "rikiEight" &&
      f.attackMs < 180
    )
      f.vx = f.facing * 200;
    const jab = MOVES[f.attack ?? ""];
    if (jab?.movement && f.attackMs < jab.movementEnd!)
      f.vx = (f.facing * jab.movement) / (jab.movementEnd! / 1000);
    if (jab?.crawl && f.attackMs >= jab.start && f.attackMs <= jab.end) {
      f.facing = jab.forwardCrawl ? f.crawlFacing! : other.x >= f.x ? 1 : -1;
      if (Math.abs(other.x - f.x) > FEEL.bodyGap + 8)
        f.vx = f.facing * jab.crawlSpeed!;
    }
    if (jab?.jab && f.attackMs >= jab.start - 40 && f.attackMs <= jab.start)
      f.vx = f.facing * (jab.chain ? 2.7 : 1.5) * 60 * FEEL.scale;
  }
  if (f.attack === "dive" || f.attack === "ranaDive")
    f.vx = f.hit ? 0 : f.facing * 360;
  if (
    !ground &&
    MOVES[f.attack ?? ""]?.movement &&
    f.attackMs >= MOVES[f.attack ?? ""].movementEnd!
  )
    f.vx = 0;
  if (
    !ground &&
    (!f.attack || MOVES[f.attack ?? ""].stance === "air") &&
    !f.dashMs &&
    !(side > 0 && match.options.mode === "cpu")
  ) {
    f.vx = direction * speed * FEEL.airRatio;
  }
}

/** Integrate velocity, terrain support and landing without accepting new actions. */
export function integrateMovement(
  match: Match,
  side: number,
  input: Input,
  ground: boolean,
  onFloor: boolean,
  oldY: number,
): void {
  const f = match.fighters[side];
  if (
    match.options.mode === "practice" &&
    side === 0 &&
    !f.attack &&
    !f.cooldown
  )
    f.energy = 100;
  const oldX = f.x;
  const move = MOVES[f.attack ?? ""];
  if (move?.sakiko === "ascension") {
    const rise = Math.max(
      0,
      Math.min(1, f.attackMs / 320, (move.duration - 10 - f.attackMs) / 340),
    );
    const height = 160 * rise * rise * (3 - 2 * rise);
    f.x = f.attackTarget!.x;
    f.y = Math.min(WORLD.top, f.attackTarget!.y + height);
    f.vx = f.vy = f.pushVx = 0;
    f.stun = Math.max(f.stun, f.hardStun);
    f.pressIds = { ...input.pressIds };
    return;
  }
  f.x = clamp(
    f.x + (f.vx + f.pushVx) * 0.01,
    WORLD.left + 45,
    WORLD.right - 45,
  );
  if (MOVES[f.attack ?? ""]?.crawl && ground && !onFloor) {
    const support = (match.options.terrain?.platforms || []).find(
      (p) =>
        oldX >= p.left && oldX <= p.right && Math.abs(p.height - f.y) < 0.1,
    );
    if (support) f.x = clamp(f.x, support.left + 18, support.right - 18);
  }
  f.pushVx =
    Math.sign(f.pushVx) *
    Math.max(
      0,
      Math.abs(f.pushVx) - (ground ? FEEL.groundDrag : FEEL.airDrag) * 0.01,
    );
  if (onFloor && f.vy <= 0 && !f.dropMs) f.y = match.floorHeight(f.x);
  if (!match.grounded(f) || f.vy > 0) {
    f.vy -= gravityFor(match) * 0.01;
    f.y += f.vy * 0.01;
    if (f.y > WORLD.top) {
      f.y = WORLD.top;
      f.vy = Math.min(0, f.vy);
    }
    let floor = match.floorHeight(f.x);
    if (!f.dropMs && f.vy <= 0)
      for (const p of match.options.terrain?.platforms || []) {
        if (
          f.x >= p.left &&
          f.x <= p.right &&
          oldY >= p.height - 0.1 &&
          f.y <= p.height
        )
          floor = Math.max(floor, p.height);
      }
    if (f.y <= floor) {
      match.land(f, floor);
    }
  }
  f.stun = Math.max(f.stun, f.hardStun);
  f.pressIds = { ...input.pressIds };
}
