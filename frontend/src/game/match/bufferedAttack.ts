import { bandFor, MOVES, verticalScale, WORLD } from "../combatData";
import { moveEnabled } from "../battleRules";
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
    other = match.fighters[match.targetSide(side)];
  if (f.buffer && !moveEnabled(match.options.rules, MOVES[f.buffer])) {
    f.buffer = null;
    f.bufferMs = 0;
    return;
  }
  const cancel = f.buffer && match.canCancel(f, f.buffer);
  if (
    f.buffer &&
    !f.dashMs &&
    ((!f.attack && !f.cooldown && (!plantedGuard || f.buffer === "throw")) ||
      cancel)
  ) {
    let name = f.buffer,
      move = MOVES[name];
    const band = bandFor(f.character);
    const legalStance =
      (!move.ground || ground) &&
      (!move.airOnly ||
        (!ground &&
          match.airHeight(f) >= move.minHeight! &&
          (!f.airUsed ||
            (cancel && MOVES[f.attack ?? ""].stance === "air")))) &&
      (!band.stanceLocked(f) ||
        ((move.stance !== "air" || !ground) &&
          (!move.stance || move.stance === "air" || ground))) &&
      (!move.penguinAirAction ||
        ground ||
        !f.airUsed ||
        (cancel && MOVES[f.attack ?? ""].stance === "air"));
    const legalOwner = band.owns(f, move, name);
    if (
      f.energy >= (move.cost || 0) &&
      legalStance &&
      legalOwner &&
      (match.options.rules.noCooldowns || !f.moveCooldowns[name]) &&
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
      (name !== "heal" ||
        (f.hp > 0 &&
          f.hp < match.options.rules.maxHealth &&
          !f.healCooldown)) &&
      (name !== "ranaTune" || (!f.tuneCooldown && f.energy < 100)) &&
      (name !== "rikiCalibrate" || (!f.calibrateCooldown && f.beats < 4))
    ) {
      const upgraded = band.beforeStart?.(match, f, name) ?? null;
      if (upgraded) {
        name = upgraded;
        move = MOVES[name];
      }
      if (!moveEnabled(match.options.rules, move)) return;
      if (!match.options.rules.infiniteEnergy) f.energy -= move.cost || 0;
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
      if (move.sakiko === "ascension") {
        // The field stays at the release position while its caster rises.
        f.attackTarget = { x: f.x, y: f.y };
      } else if (move.delayedArea || move.targetArea) {
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
      band.onStart?.(match, f, move, name, ground);
      match.events.push({ type: "attack", side, attack: name });
    }
  }
}
