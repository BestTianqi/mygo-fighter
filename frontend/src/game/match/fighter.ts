import { bandFor, FEEL, MOVES } from "../combatData";
import type { Match } from "../engine";
import type { Input } from "../objects/Input";
import { startBufferedAttack } from "./bufferedAttack";
import { integrateMovement, updateMovement } from "./movement";

/** One fixed fighter step: timers, input/guard, buffered action, then movement. */
export function updateFighter(match: Match, side: number, input: Input): void {
  if (!match.active(side)) return;
  const f = match.fighters[side],
    other = match.fighters[match.targetSide(side)];
  if (match.options.rules.infiniteEnergy) f.energy = 100;
  if (match.options.rules.noCooldowns) {
    f.moveCooldowns = {};
    f.healCooldown = f.tuneCooldown = f.calibrateCooldown = 0;
  }
  if (f.lifesteal) {
    f.lifesteal.ms -= 10;
    if (f.lifesteal.ms <= 0) f.lifesteal = null;
  }
  if (f.penguin) {
    f.penguin.ms -= 10;
    if (f.penguin.ms <= 0) match.endPenguin(side);
  }
  if (f.stageForm) {
    f.stageForm.ms -= 10;
    if (f.stageForm.ms <= 0) match.endStageForm(side);
  }
  for (const key of Object.keys(f.moveCooldowns))
    f.moveCooldowns[key] = Math.max(0, f.moveCooldowns[key] - 10);

  if (f.shield) {
    f.shield.ms -= 10;
    f.shield.hitMs = Math.max(0, f.shield.hitMs - 10);
    if (f.shield.ms <= 0) f.shield = null;
  }
  for (const key of [
    "stun",
    "hardStun",
    "cooldown",
    "knockdown",
    "landingRecovery",
    "dashMs",
    "dashCooldown",
    "dashInvuln",
    "wakeInvuln",
    "comboMs",
    "bufferMs",
    "dropMs",
    "healCooldown",
    "tuneCooldown",
    "calibrateCooldown",
    "jumpBufferMs",
    "dashBufferMs",
    "coyoteMs",
  ] as const)
    f[key] = Math.max(0, f[key] - 10);
  f.stun = Math.max(f.stun, f.hardStun);
  if (f.hardStun) {
    input = {};
    f.buffer = null;
    f.bufferMs = f.jumpBufferMs = f.dashBufferMs = f.coyoteMs = 0;
    f.blinkBuffer = false;
    f.motion = [];
    f.guard = false;
  }
  if (!f.comboMs) f.combo = 0;
  if (!f.bufferMs) f.buffer = null;
  if (!f.attack && !f.stun && !f.dashMs) {
    const facing = other.x >= f.x ? 1 : -1;
    if (f.facing !== facing) f.motion = [];
    f.facing = facing;
  }
  match.recordDirection(f, input);
  const ground = match.grounded(f),
    oldY = f.y,
    onFloor = ground && Math.abs(f.y - match.floorHeight(f.x)) < 0.1;
  // A descent can enter the ground tolerance before crossing the surface.
  // Finish that landing too, so the next jump gets its air action back.
  if (ground && f.vy < 0) match.land(f, match.surfaceBelow(f.x, f.y, f.dropMs));
  const direction = Number(!!input.right) - Number(!!input.left);
  f.lightHoldMs = input.touchLight ? f.lightHoldMs + 10 : 0;
  const repeatLight =
    input.touchLight &&
    f.lightHoldMs >= 200 &&
    (f.lightHoldMs - 200) % 150 === 0;
  const pressed = (key: string): boolean =>
    !!input[key as keyof Input] &&
    (!match.previous[side][key as keyof Input] ||
      (input.pressIds?.[key] && input.pressIds[key] !== f.pressIds[key]) ||
      (key === "light" && !!repeatLight));
  if (ground && !f.stun && !f.knockdown) {
    f.coyoteMs = 80;
    f.jumps = 2;
  }
  if (pressed("jump")) f.jumpBufferMs = FEEL.specialBuffer;
  if (pressed("dash")) {
    f.blinkBuffer = false;
    f.dashBufferMs = FEEL.specialBuffer;
    f.dashDirection = direction || f.facing;
  }
  if (pressed("blink")) {
    const gesture = input.pressDirections?.blink || input;
    f.blinkBuffer = true;
    f.dashBufferMs = FEEL.specialBuffer;
    f.dashDirection =
      Number(!!gesture.right) - Number(!!gesture.left) || f.facing;
  }
  let requested = match.resolveAttack(f, input, pressed);
  const transform = bandFor(f.character).transform;
  if (transform && requested === transform.move) {
    let transformed = false;
    if (
      !f.stageForm &&
      ground &&
      !f.stun &&
      !f.knockdown &&
      !f.attack &&
      !f.landingRecovery &&
      f.energy >= transform.energy
    ) {
      if (!match.options.rules.infiniteEnergy) f.energy -= transform.energy;
      f.stageForm = { ms: transform.duration };

      f.buffer = null;
      f.bufferMs = 0;
      f.cooldown = 0;
      transformed = true;
      match.events.push({ type: "stageFormStart", side });
    }
    requested = transformed
      ? match.resolveAttack(
          f,
          { ...input, transform: false },
          (key) => key !== "transform" && pressed(key),
        )
      : null;
  }
  if (
    requested &&
    !(
      MOVES[requested].category === "normal" &&
      f.buffer &&
      MOVES[f.buffer].category !== "normal"
    )
  ) {
    f.buffer = requested;
    f.bufferMs =
      MOVES[requested].category === "normal"
        ? FEEL.normalBuffer
        : FEEL.specialBuffer;
    const gesture =
      input.pressDirections?.[pressed("skill1") ? "skill1" : "skill3"] || input;
    f.bufferBackThrow = input.unified
      ? Number(!!gesture.right) - Number(!!gesture.left) === -f.facing
      : null!;
  }
  if (f.attack) {
    f.attackMs += 10;
    const move = MOVES[f.attack ?? ""];
    if (
      move.hitRecovery &&
      f.contact &&
      f.lastHitAt >= move.pulses!.at(-1)!.at &&
      f.attackMs >= move.duration - move.hitRecovery
    ) {
      f.attackMs = move.duration;
      f.cooldown = Math.min(f.cooldown, 40);
    }
    if (f.attackMs >= MOVES[f.attack ?? ""].duration) {
      f.attack = null;
      f.contact = false;
      f.cancelDepth = 0;
    }
  }
  // Blockstun retains the guard height until the defender can act again.
  f.crouch =
    ground &&
    !f.knockdown &&
    !f.landingRecovery &&
    (f.stun
      ? f.guard && f.crouch
      : f.attack
        ? f.attackCrouch || !!MOVES[f.attack ?? ""].crawl
        : !!input.crouch);
  f.guard =
    !match.options.rules.disableGuard &&
    ground &&
    !f.attack &&
    !f.knockdown &&
    !f.landingRecovery &&
    !f.dashMs &&
    (f.stun ? f.guard : !!input.guard || direction === -f.facing);
  // Holding back is a walking guard. The dedicated guard key plants the
  // feet; hitstun locks movement after contact regardless of guard source.
  const plantedGuard = f.guard && !!input.guard;
  if (!f.stun && !f.knockdown && !f.landingRecovery) {
    startBufferedAttack(match, side, input, ground, plantedGuard, direction);
    updateMovement(match, side, input, {
      ground,
      onFloor,
      oldY,
      direction,
      plantedGuard,
    });
  } else f.vx = 0;
  integrateMovement(match, side, input, ground, onFloor, oldY);
}
