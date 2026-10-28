import { FEEL, MOVES, ROSTER, verticalScale, WORLD } from "../combatData";
import type { Match } from "../engine";
import type { Fighter } from "../objects/Fighter";
import type { Move } from "../objects/Move";
import { clamp, outgoingMultiplier, RESONANCE_UNITS } from "./combatMath";

export function invulnerable(f: Fighter): boolean {
  return (
    f.knockdown > 0 ||
    f.wakeInvuln > 0 ||
    f.dashInvuln > 0 ||
    (!!f.attack &&
      !!MOVES[f.attack ?? ""].invuln &&
      f.attackMs < MOVES[f.attack ?? ""].invuln!)
  );
}

export function meleeConnects(
  source: Fighter,
  target: Pick<Fighter, "x" | "y">,
  move: Move,
  reach: number,
  vertical: number,
): boolean {
  const dx = (target.x - source.x) * source.facing;
  const outside = move.targetArea
    ? Math.abs(target.x - source.attackTarget!.x) > move.areaRadius! ||
      Math.abs(target.x - source.x) > 420
    : move.omni
      ? Math.abs(dx) > reach
      : dx < -10 || dx > reach;
  return !outside && Math.abs(target.y - source.y) <= vertical;
}

export function hit(
  match: Match,
  side: number,
  attack: string,
  x: number,
  y: number,
  impact: Partial<Move> = {},
  targetSide = match.targetSide(side),
): void {
  const a = match.fighters[side],
    b = match.fighters[targetSide],
    move = { ...MOVES[attack], ...impact };
  if (
    !b ||
    targetSide === side ||
    !match.active(targetSide) ||
    match.invulnerable(b)
  )
    return;
  const multiplier =
    outgoingMultiplier(a, attack) * match.options.rules.damageMultiplier;
  let damage =
    (attack === "heavy" ? ROSTER[a.character].heavyDamage : move.damage) *
    multiplier;
  const sourceX = x ?? a.x,
    sourceY = y ?? a.y + 100;
  const radiusY = move.projectileRadiusY || 0;
  const parry = MOVES[b.attack ?? ""];
  if (
    parry?.counter &&
    b.attackMs >= parry.start &&
    b.attackMs <= parry.end &&
    move.category !== "throw" &&
    (sourceX - b.x) * b.facing > 0
  ) {
    b.attack = null;
    b.buffer = null;
    b.stun = Math.max(b.stun, b.hardStun, 80);
    b.cooldown = 220;
    b.vx = 0;
    match.spawnWave(targetSide, parry.counterAttack || "penguinCryWave");
    match.freeze = Math.max(match.freeze, 50);
    match.events.push({
      type: parry.counterAttack ? "counter" : "penguinCounter",
      side: targetSide,
      x: b.x,
      y: b.y + 110,
    });
    return;
  }
  if (
    b.shield &&
    move.category !== "throw" &&
    (sourceX - b.x) * b.facing > 0 &&
    sourceY + radiusY >= b.y &&
    sourceY - radiusY <= b.y + 220
  ) {
    const absorbed = Math.min(b.shield.hp, damage);
    b.shield.hp -= absorbed;
    damage -= absorbed;
    b.shield.hitMs = 160;
    const broken = b.shield.hp <= 0;
    if (broken) b.shield = null;
    match.freeze = Math.max(match.freeze, 40);
    match.events.push({
      type: "shieldHit",
      side: targetSide,
      attacker: side,
      absorbed,
      broken,
      x: b.x + b.facing * 58,
      y: b.y + 105,
    });
    if (damage <= 0) return;
  }
  const low =
    move.level === "low" ||
    (a.character !== 0 && a.crouch && attack === "light");
  const high =
    move.level === "high" ||
    (a.character !== 0 &&
      !match.grounded(a) &&
      (attack === "light" || attack === "heavy"));
  const blocked =
    !match.options.rules.disableGuard &&
    move.category !== "throw" &&
    b.guard &&
    (!low || b.crouch) &&
    (!high || !b.crouch);
  const superArmor = MOVES[b.attack ?? ""]?.category === "super";
  const counter =
    !blocked &&
    !superArmor &&
    !!b.attack &&
    b.attackMs < MOVES[b.attack ?? ""].start;
  if (blocked)
    damage = Math.min(
      damage,
      (move.chip ??
        (move.category === "super"
          ? impact.knockdown
            ? 6
            : 2
          : move.category === "special"
            ? 3
            : 0)) * multiplier,
    );
  else {
    a.combo = a.comboMs > 0 ? a.combo + 1 : 1;
    a.comboMs = 1000;
    if (
      a.character === 4 &&
      move.category === "normal" &&
      (a.attack === attack || impact.beatEligible) &&
      !a.beatGranted
    ) {
      a.beats = Math.min(4, a.beats + 1);
      a.beatGranted = true;
      match.events.push({ type: "beat", side, beats: a.beats });
    }
    if (!move.fixedDamage) {
      const precision = multiplier !== 1 ? 10 : 1;
      damage =
        Math.round(
          damage *
            Math.max(0.5, 1 - (a.combo - 1) * 0.1) *
            (counter ? 1.2 : 1) *
            precision,
        ) / precision;
    }
    if (a.attack === attack) {
      a.contact = true;
      a.lastHitAt = a.attackMs;
      if (!move.pulses && !move.shots) a.hit = true;
    }
  }
  const reduction = MOVES[b.attack ?? ""]?.damageReduction;
  if (reduction) damage = Math.round(damage * (1 - reduction) * 10) / 10;
  damage = Math.round(damage * 10) / 10;
  if (match.options.rules.oneHitKO && !blocked && damage > 0) damage = b.hp;
  const previousHp = b.hp;
  b.hp = Math.max(
    match.options.mode === "practice" && side === 0 ? 1 : 0,
    Math.round((b.hp - damage) * 10) / 10,
  );
  const lifesteal = Math.max(
    a.lifesteal?.ratio ?? 0,
    match.options.rules.vampire ? 0.25 : 0,
  );
  if (lifesteal > 0 && a.hp > 0 && previousHp > b.hp) {
    // Use HP actually removed after guards, shields, reductions and overkill.
    const previousSourceHp = a.hp;
    a.hp = Math.min(
      match.options.rules.maxHealth,
      Math.round((a.hp + (previousHp - b.hp) * lifesteal) * 10) / 10,
    );
    const amount = Math.round((a.hp - previousSourceHp) * 10) / 10;
    if (amount > 0) match.events.push({ type: "heal", side, attack, amount });
  }
  if (previousHp > 0 && b.hp <= 0) {
    b.defeatedBy =
      move.category === "super"
        ? {
            side,
            attack,
            character: a.character,
            penguin: !!move.penguinOnly || (!move.nativeOnly && !!a.penguin),
            stageForm: move.form ? move.form === "stage" : !!a.stageForm,
          }
        : undefined;
  }
  if (
    move.category !== "super" &&
    move.category !== "transformation" &&
    !move.minion
  )
    a.energy = clamp(
      a.energy + (blocked ? 1 : move.category === "normal" ? 12 : 2),
      0,
      100,
    );
  const receivedBudget = blocked ? 3 : 8;
  const hitCount = Math.max(
    1,
    move.pulses?.length ?? 0,
    move.shots?.length ?? 0,
    move.resonanceHits ?? 0,
  );
  let received = receivedBudget / hitCount;
  if (move.minion) {
    // All three units and their repeated charges belong to one summon cast.
    const group = a.summons;
    const granted = group?.resonanceGranted ?? 0;
    received = Math.min(2, Math.max(0, receivedBudget - granted));
    if (group) group.resonanceGranted = granted + received;
  }
  b.energy = clamp(
    Math.round((b.energy + received) * RESONANCE_UNITS) / RESONANCE_UNITS,
    0,
    100,
  );
  // Super armor absorbs the reaction, not damage. Lethal hits still interrupt.
  const armored = superArmor && b.hp > 0;
  if (!armored) {
    if (attack === "throw" && a.backThrow) {
      [a.x, b.x] = [b.x, a.x];
      a.facing *= -1;
      b.facing = -a.facing;
    }
    b.stun = Math.max(
      b.stun,
      b.hardStun,
      blocked ? (move.category === "super" ? 260 : 150) : move.stun || 0,
    );
    b.vx = 0;
    b.pushVx =
      (move.minion || move.omni
        ? Math.sign(b.x - sourceX) || a.facing
        : a.facing) *
      (blocked ? (move.minion ? 25 : 40 * FEEL.scale) : move.push)!;
    if (!blocked && move.pull) {
      if (move.ownerCharacter !== undefined) {
        const onFloor =
          match.grounded(b) && Math.abs(b.y - match.floorHeight(b.x)) < 0.1;
        const distance = Math.min(
          Number(move.pull),
          Math.max(0, Math.abs(b.x - a.x) - FEEL.bodyGap),
        );
        b.x = clamp(
          b.x + Math.sign(a.x - b.x) * distance,
          WORLD.left + 45,
          WORLD.right - 45,
        );
        if (onFloor) b.y = match.floorHeight(b.x);
        else if (b.y < match.floorHeight(b.x))
          match.land(b, match.floorHeight(b.x));
        b.pushVx = 0;
      } else b.pushVx = -a.facing * 100;
    }
    b.attack = null;
    b.buffer = null;
    b.dashMs = b.dashInvuln = 0;
    b.jumpBufferMs = b.dashBufferMs = b.coyoteMs = 0;
    if (!blocked) {
      b.guard = false;
      b.crouch = false;
    }
    if (!blocked && (move.knockdown || move.launch || !match.grounded(b))) {
      b.knockdown = move.knockdown || 0;
      b.vy =
        (move.launch ||
          (move.knockdown ? 280 * verticalScale : 90 * FEEL.scale)) *
        Math.max(0.5, 1 - a.combo * 0.05);
      b.y += 0.01;
      b.launched = true;
    }
  }
  if (b.hp <= 0) {
    b.lifesteal = null;
    b.soyoSuper = null;
    b.hardStun = 0;
  }
  const weight =
    move.category === "super"
      ? 3
      : move.minion
        ? 0
        : attack === "heavy" ||
            attack === "throw" ||
            move.strength === 3 ||
            move.damage >= 18
          ? 2
          : move.strength === 2 || move.category === "special"
            ? 1
            : 0;
  const hitstop =
    move.hitstop ??
    (blocked ? 50 : move.minion ? 20 : [70, 80, 130, 220][weight]);
  match.freeze = Math.max(match.freeze, hitstop);
  const footStrike =
    move.normalIndex !== undefined && move.normalIndex % 6 >= 3;
  const contactHeight = low
    ? 55
    : a.penguin
      ? footStrike
        ? 75
        : 110
      : footStrike
        ? 105
        : 160;
  match.events.push({
    type: "hit",
    side,
    target: targetSide,
    attack,
    damage,
    blocked,
    armored,
    counter,
    weight,
    combo: a.combo,
    x: x ?? b.x,
    y: y ?? b.y + contactHeight,
  });
}
