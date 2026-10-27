import {
  MAX_HEALTH,
  MOVES,
  ROSTER,
  ROUND_END_TIMING,
  WORLD,
  bandFor,
} from "../combatData";
import type { Match } from "../engine";
import type { Input } from "../objects/Input";
import type { Move, Pulse } from "../objects/Move";
import { clamp } from "./combatMath";

/** Advance one 10 ms step in rule order: lifecycle, inputs, contacts, persistent effects. */
export function step(match: Match, p1: Input, p2: Input): void {
  // This clock includes ready/round transitions and hit freeze. inputTick
  // advances only when combat accepts input; LAN replay needs both clocks.
  match.simulationTick++;
  match.elapsed += 10;
  if (match.phase === "ready") {
    match.phaseMs -= 10;
    match.previous = [{ ...p1 }, { ...p2 }];
    if (match.phaseMs <= 0) {
      match.phase = "fighting";
      match.events.push({ type: "fight" });
    }
    return;
  }
  if (match.phase !== "fighting") {
    const previousPhaseMs = match.phaseMs;
    // Keep the art on screen until both presentations finish. Only the final
    // exit waits; KO, landing and the cut-in keep their original shared clock.
    const floor = match.finishReady.every(Boolean) ? 0 : 300;
    match.phaseMs = Math.max(floor, match.phaseMs - 10);
    const artStart = ROUND_END_TIMING.total - ROUND_END_TIMING.knockout;
    if (
      match.roundEnd?.finisher &&
      previousPhaseMs > artStart &&
      match.phaseMs <= artStart
    )
      match.events.push({
        type: "ultimateFinish",
        side: match.roundEnd.finisher.side,
        attack: match.roundEnd.finisher.attack,
        finisher: match.roundEnd.finisher,
      });
    if (match.roundEnd && match.phaseMs > 0) {
      // Presentation only: settle the final hit without running attacks or changing resources.
      const elapsed = ROUND_END_TIMING.total - match.phaseMs;
      const t = Math.max(
        0,
        Math.min(
          1,
          (elapsed - ROUND_END_TIMING.impact) /
            (ROUND_END_TIMING.knockout - ROUND_END_TIMING.impact),
        ),
      );
      match.fighters.forEach((f, side) => {
        const start = match.roundEnd!.fighters[side];
        f.y =
          start.y +
          (start.landY - start.y) * t * t +
          (f.hp <= 0 ? 48 * Math.sin(Math.PI * t) : 0);
        if (t === 1) f.y = start.landY;
        if (elapsed >= ROUND_END_TIMING.impact) f.vy = 0;
      });
    }
    if (match.phase === "roundOver" && match.phaseMs <= 0) {
      const pendingTime = match.accumulator;
      match.nextRound();
      match.accumulator = pendingTime;
    }
    return;
  }
  if (match.freeze > 0) {
    match.freeze -= 10;
    return;
  }
  match.inputTick++;
  if (match.options.mode !== "practice")
    match.remaining = Math.max(0, match.remaining - 10);
  const dummy = match.options.dummy;
  const inputs = [
    p1,
    match.options.mode === "practice"
      ? {
          guard: dummy === "guard" || dummy === "crouch",
          crouch: dummy === "crouch",
        }
      : match.options.mode === "cpu"
        ? match.aiInput()
        : p2,
  ];
  if (match.options.mode === "cpu" && match.aiGuard > 0) {
    match.aiGuard -= 10;
    inputs[1].guard = true;
    inputs[1].left = inputs[1].right = false;
  }
  match.updateBindings();
  for (let side = 0; side < 2; side++) match.updateFighter(side, inputs[side]);
  match.separate();
  match.updateBindings();
  match.updateSoyoSupers();
  // Resolve both active strikes together so simultaneous attacks can trade.
  const hits: {
    side: number;
    attack: string;
    impact: Partial<Move>;
    x?: number;
    y?: number;
  }[] = [];
  for (let side = 0; side < 2; side++) {
    const f = match.fighters[side],
      other = match.fighters[1 - side],
      move = MOVES[f.attack ?? ""];
    // Birth is observed after both inputs resolve, so simultaneous H casts trade.
    const transform = bandFor(f.character).transform;
    if (transform && f.stageForm?.ms === transform.duration) {
      const burst = MOVES[transform.move];
      if (match.meleeConnects(f, other, burst, burst.reach!, burst.vertical!))
        hits.push({ side, attack: transform.move, impact: {} });
      for (const unit of [...(other.summons?.units ?? [])])
        if (match.meleeConnects(f, unit, burst, burst.reach!, burst.vertical!))
          match.hitMinion(side, unit, transform.move);
    }
    if (move?.counter) {
      // A successful parry ends the stance in hit(). An uncontested stance
      // instead releases one weaker wave on its first recovery tick.
      if (f.attackMs > move.end && !f.hit) {
        const attack = move.counterAttack || "penguinCryWave";
        const reply = MOVES[attack];
        match.spawnWave(side, attack, {
          damage: reply.damage * 0.5,
          stun: 180,
          push: (reply.push || 0) * 0.5,
        });
        f.hit = true;
        match.events.push({
          type: "counterRelease",
          side,
          attack,
          x: f.x + f.facing * 45,
          y: f.y + (reply.height || 90),
        });
      }
      continue;
    }
    if (
      !move ||
      f.attackMs < move.start ||
      f.attackMs > move.end ||
      (f.hit &&
        (move.projectile ||
          move.delayedArea ||
          !move.damage ||
          f.attack === "summon"))
    )
      continue;
    if (move.targetLock) {
      // Acquisition happens once. Moving into a missed seal later cannot capture you.
      if (!f.hit) {
        f.hit = true;
        const forward = (other.x - f.x) * f.facing;
        const inside =
          move.sakiko === "ascension"
            ? Math.hypot(
                other.x - f.attackTarget!.x,
                other.y - f.attackTarget!.y,
              ) <= move.areaRadius!
            : forward >= 0 &&
              forward <= move.reach! &&
              Math.abs(other.y - f.y) <= move.vertical!;
        if (other.hp > 0 && inside && !match.invulnerable(other)) {
          f.binding = { target: 1 - side, x: other.x, y: other.y };
          match.updateBindings();
        }
      }
      for (const [pulse, impact] of move.pulses!.entries()) {
        if (f.attackMs < impact.at || f.hitMarks.includes(pulse)) continue;
        f.hitMarks.push(pulse);
        match.events.push({
          type: "memePulse",
          side,
          attack: f.attack!,
          pulse,
          glyph: impact.glyph,
          x: f.binding?.x ?? f.attackTarget!.x,
          y: f.binding?.y ?? f.attackTarget!.y,
          radius: f.binding ? 125 : move.areaRadius,
        });
        if (f.binding)
          hits.push({
            side,
            attack: f.attack!,
            x: f.binding.x,
            y: f.binding.y + 100,
            impact: { ...impact, stun: 30, push: 0, launch: 0, knockdown: 0 },
          });
      }
      continue;
    }
    if (f.attack === "ranaTune") {
      const amount = Math.min(move.energyGain!, 100 - f.energy);
      f.energy += amount;
      f.hit = true;
      match.events.push({ type: "tune", side, amount });
      continue;
    }
    if (f.attack === "rikiCalibrate") {
      f.beats = Math.min(4, f.beats + 2);
      f.hit = true;
      match.events.push({ type: "beat", side, beats: f.beats });
      continue;
    }
    if (f.attack === "heal") {
      const amount = Math.min(move.healing!, MAX_HEALTH - f.hp);
      if (f.hp > 0) {
        f.hp += amount;
        match.events.push({ type: "heal", side, amount });
      }
      f.hit = true;
      continue;
    }
    if (move.durability) {
      f.shield = { hp: move.durability, ms: move.lifetime!, hitMs: 0 };
      f.hit = true;
      match.events.push({ type: "shieldSummon", side });
      continue;
    }
    if (f.attack === "summon") {
      f.summons = {
        ms: move.lifetime!,
        bornAt: match.elapsed,
        resonanceGranted: 0,
        units: [0, 1, 2].map((i) => ({
          id: i,
          hp: 20,
          maxHp: 20,
          called: false,
          x: clamp(f.x + (i - 1) * 52, WORLD.left + 32, WORLD.right - 32),
          y: f.y + 8,
          facing: f.facing,
          phase: "follow",
          cooldown: 350 + i * 320,
          phaseMs: 0,
          hitMs: 0,
        })),
      };
      f.hit = true;
      match.events.push({ type: "summon", side });
      continue;
    }
    if (move.delayedArea) {
      match.areas.push({
        owner: side,
        attack: f.attack!,
        x: f.attackTarget!.x,
        y: f.attackTarget!.y,
        warning: move.warning!,
        life: move.warning! + 100,
        radius: move.areaRadius!,
        platform: (match.options.terrain?.platforms || []).find(
          (p) =>
            f.attackTarget!.x >= p.left &&
            f.attackTarget!.x <= p.right &&
            Math.abs(p.height - f.attackTarget!.y) < 0.1,
        ),
      });
      match.events.push({
        type: "areaWarning",
        side,
        attack: f.attack!,
        x: f.attackTarget!.x,
        y: f.attackTarget!.y,
      });
      f.hit = true;
      continue;
    }
    if (!move.damage && !move.pulses) {
      f.hit = true;
      continue;
    }
    if (move.projectile) {
      if (move.shots) {
        const shot = move.shots.findIndex(
          (at, i) => f.attackMs >= at && !f.hitMarks.includes(i),
        );
        if (shot >= 0) {
          match.spawnWave(
            side,
            f.attack === "rikiShockBoost" && shot === 1
              ? "rikiShockExtra"
              : f.attack!,
            move.pulses?.[shot],
          );
          f.hitMarks.push(shot);
          match.events.push({
            type: "voicePulse",
            side,
            pulse: shot,
            attack: f.attack!,
          });
        }
        f.hit = f.hitMarks.length === move.shots.length;
      } else {
        match.spawnWave(side, f.attack!);
        f.hit = true;
      }
      continue;
    }
    const profile = ROSTER[f.character];
    const pulse = move.pulses?.findIndex(
      (p) => f.attackMs >= p.at && f.attackMs < p.at + 90,
    );
    if (move.pulses && pulse! < 0) continue;
    const impact: Partial<Pulse> = move.pulses ? move.pulses[pulse!] : {};
    if (impact.glyph && !f.runeMarks.includes(pulse!)) {
      f.runeMarks.push(pulse!);
      match.events.push({
        type: "memePulse",
        side,
        attack: f.attack!,
        pulse,
        glyph: impact.glyph,
        x: f.attackTarget?.x ?? f.x,
        y: f.attackTarget?.y ?? f.y,
        radius: move.areaRadius,
      });
    }
    const reach =
      impact.reach ||
      move.reach ||
      (f.attack === "light"
        ? profile.lightReach
        : f.attack === "heavy"
          ? profile.heavyReach
          : profile.specialReach);
    const vertical =
      move.vertical ||
      (f.attack === "special" ? profile.specialVertical || 130 : 88);
    if (move.category !== "throw") {
      const group = other.summons;
      for (const unit of [...(group?.units || [])]) {
        const mark = `${group!.bornAt}:${unit.id}:${pulse ?? "strike"}`;
        if (
          !f.minionHitMarks.includes(mark) &&
          match.meleeConnects(f, unit, move, reach, vertical)
        ) {
          f.minionHitMarks.push(mark);
          match.hitMinion(side, unit, f.attack!, impact);
        }
      }
    }
    if (
      f.hit ||
      (move.pulses && f.hitMarks.includes(pulse!)) ||
      !match.meleeConnects(f, other, move, reach, vertical) ||
      other.knockdown > 0 ||
      match.invulnerable(other)
    )
      continue;
    if (
      move.category === "throw" &&
      (!match.grounded(f) ||
        !match.grounded(other) ||
        Math.abs(f.y - other.y) > 25 ||
        other.stun)
    )
      continue;
    if (move.pulses) f.hitMarks.push(pulse!);
    if (!move.pulses) f.hit = true;
    hits.push({
      side,
      attack: f.attack!,
      impact: {
        ...impact,
        beatEligible:
          f.character === 4 && move.category === "normal" && !f.beatGranted,
      },
    });
  }
  for (const hit of hits)
    match.hit(hit.side, hit.attack, hit.x!, hit.y!, hit.impact);
  match.updateSummons();
  match.updateAreas();
  match.updateWaves();
  match.updateBindings();
  match.previous = inputs.map((input) => ({ ...input }));
  if (
    match.options.mode !== "practice" &&
    (match.remaining <= 0 || match.fighters.some((f) => f.hp <= 0))
  )
    match.endRound();
}
