import {
  isMujica,
  kitFor,
  MAX_HEALTH,
  MOVES,
  verticalScale,
  WORLD,
} from "../combatData";
import type { Match } from "../engine";
import type { Input } from "../objects/Input";
import { clamp } from "./combatMath";

/** Start one legal buffered move, applying its resource and movement effects. */
export function startBufferedAttack(
  match: Match,
  side: number,
  input: Input,
  ground: boolean,
  plantedGuard: boolean,
  direction: number,
): void {
  const f = match.fighters[side],
    other = match.fighters[1 - side];
  const cancel = f.buffer && match.canCancel(f, f.buffer);
  if (
    f.buffer &&
    !f.dashMs &&
    ((!f.attack && !f.cooldown && (!plantedGuard || f.buffer === "throw")) ||
      cancel)
  ) {
    let name = f.buffer,
      move = MOVES[name];
    const legalStance =
      (!move.ground || ground) &&
      (!move.airOnly ||
        (!ground &&
          match.airHeight(f) >= move.minHeight! &&
          (!f.airUsed ||
            (cancel && MOVES[f.attack ?? ""].stance === "air")))) &&
      (!(f.character === 0 || f.character >= 3 || f.penguin) ||
        ((move.stance !== "air" || !ground) &&
          (!move.stance || move.stance === "air" || ground))) &&
      (!move.penguinAirAction ||
        ground ||
        !f.airUsed ||
        (cancel && MOVES[f.attack ?? ""].stance === "air"));
    const legalOwner =
      (move.ownerCharacter === undefined ||
        move.ownerCharacter === f.character) &&
      (!move.form || move.form === kitFor(f)?.formFor(f)) &&
      (!move.mujicaOnly || isMujica(f.character)) &&
      (!kitFor(f) || move.ownerCharacter === f.character || name === "throw");
    if (
      f.energy >= (move.cost || 0) &&
      legalStance &&
      legalOwner &&
      !f.moveCooldowns[name] &&
      (!move.delayedArea ||
        !match.areas.some((a) => a.owner === side && a.attack === name)) &&
      (!move.anonOnly || f.character === 0) &&
      (!move.soyoOnly || f.character === 1) &&
      (!move.tomoriOnly || f.character === 2) &&
      (!move.ranaOnly || f.character === 3) &&
      (!move.rikiOnly || f.character === 4) &&
      (!move.penguinOnly || f.penguin) &&
      (!move.nativeOnly || !f.penguin) &&
      (name !== "summon" || !f.summons) &&
      (name !== "heal" || (f.hp > 0 && f.hp < MAX_HEALTH && !f.healCooldown)) &&
      (name !== "ranaTune" || (!f.tuneCooldown && f.energy < 100)) &&
      (name !== "rikiCalibrate" || (!f.calibrateCooldown && f.beats < 4))
    ) {
      if (f.character === 4 && f.beats === 4 && MOVES[name + "Boost"]) {
        f.beats = 0;
        name += "Boost";
        move = MOVES[name];
        match.events.push({ type: "beatBoost", side, attack: name });
      }
      f.energy -= move.cost || 0;
      f.guard = false;
      f.attack = name;
      f.attackMs = 0;
      f.hit = false;
      f.beatGranted = false;
      f.hitMarks = [];
      f.minionHitMarks = [];
      f.runeMarks = [];
      f.binding = null;
      f.attackCrouch =
        ground && (move.stance === "crouch" || !!move.crawl || !!input.crouch);
      f.crouch = f.attackCrouch;
      f.backThrow =
        name === "throw" && (f.bufferBackThrow ?? direction === -f.facing);
      f.contact = false;
      f.lastHitAt = -1;
      f.dashMs = 0;
      f.cooldown = move.duration + (move.category === "normal" ? 0 : 40);
      f.buffer = null;
      f.cancelDepth = cancel ? f.cancelDepth + 1 : 0;
      if (move.recast && move.ownerCharacter !== undefined)
        f.moveCooldowns[name] = move.recast;
      if (move.delayedArea || move.targetArea) {
        const targetX = move.targetLock
          ? f.x + (f.facing * move.reach!) / 2
          : clamp(
              other.x,
              f.facing > 0 ? f.x : f.x - 420,
              f.facing > 0 ? f.x + 420 : f.x,
            );
        f.attackTarget = {
          x: clamp(targetX, WORLD.left + 45, WORLD.right - 45),
          y: match.surfaceBelow(
            targetX,
            move.delayedArea || move.targetLock ? f.y : other.y,
          ),
        };
      }
      if (move.hop) {
        f.vy = move.hop * verticalScale;
        f.y += 0.01;
      }
      if (move.forwardCrawl) f.crawlFacing = f.facing;
      if (move.movement)
        f.vx = (f.facing * move.movement) / (move.movementEnd! / 1000);
      if (move.stance === "air" || move.airOnly) f.airUsed = true;
      if (name === "dive" || name === "ranaDive") {
        f.vy = -570 * verticalScale;
        f.vx = f.facing * 360;
      }
      if (name === "penguinKick") {
        f.airUsed = true;
        f.vy = ground
          ? 340 * verticalScale
          : Math.max(140 * verticalScale, f.vy);
        f.y += 0.01;
        f.vx = f.facing * 400;
      }
      if (name === "rising") {
        f.vy = 610 * verticalScale;
        f.y += 0.01;
        f.vx = f.facing * 130;
      }
      if (name === "ranaRise") {
        f.vy = 620 * verticalScale;
        f.y += 0.01;
        f.vx = f.facing * 130;
      }
      if (name === "rikiRise" || name === "rikiRiseBoost") {
        f.vy = 400 * verticalScale;
        f.y += 0.01;
        f.vx = f.facing * (move.follow ? 200 : 80);
      }
      if (name === "spin" && ground) {
        f.vy = 260 * verticalScale;
        f.y += 0.01;
        f.vx = f.facing * 230;
      }
      if (name === "super") {
        f.vx = 0;
        match.freeze = 240;
      }
      if (name === "ranaSuper") {
        f.vx = 0;
        match.freeze = 130;
      }
      if (name === "soyoSuper") {
        f.vx = 0;
        f.attackCrouch = f.crouch = false;
        match.freeze = 130;
        match.soyoSuperId = (match.soyoSuperId || 0) + 1;
        f.soyoSuper = {
          id: match.soyoSuperId,
          ms: move.duration,
          released: false,
          radius: 0,
          x: f.x,
          y: f.y + 100,
          bornAt: match.elapsed,
          hitTargets: [],
        };
      }
      if (name === "rikiSuper") {
        f.vx = 0;
        match.freeze = 130;
      }
      if (name === "rikiCalibrate") {
        f.calibrateCooldown = move.recast!;
        f.attackCrouch = f.crouch = false;
      }
      if (name === "ranaTune") {
        f.tuneCooldown = move.recast!;
        f.attackCrouch = f.crouch = false;
      }
      if (name === "heal") {
        f.healCooldown = move.recast!;
        f.attackCrouch = f.crouch = false;
      }
      if (name === "penguinTransform") {
        f.penguin = { ms: move.lifetime! };
        f.attack = null;
        f.cooldown = 0;

        match.events.push({ type: "penguinStart", side });
      }
      match.events.push({ type: "attack", side, attack: name });
    }
  }
}
