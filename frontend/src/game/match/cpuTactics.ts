import { bandFor, FEEL, MOVES } from "../combatData";
import { schemeFor } from "../controls";
import type { cpuDifficulty } from "../cpuDifficulty";
import type { Match } from "../engine";
import type { Input } from "../objects/Input";

/** Advanced CPUs still issue ordinary inputs: the combat kernel owns legality,
 * cancel windows, costs and damage. All variation uses the match random stream. */
export function advancedInput(
  match: Match,
  side: number,
  navigation: Input,
  difficulty: ReturnType<typeof cpuDifficulty>,
): Input {
  const a = match.fighters[side];
  const b = match.fighters[match.targetSide(side)];
  if (a.stun || a.knockdown || a.hardStun) return navigation;
  const distance = Math.abs(a.x - b.x);
  const height = Math.abs(a.y - b.y);
  const ground = match.grounded(a);
  const enemyMove = MOVES[b.attack ?? ""];
  const threat =
    enemyMove &&
    enemyMove.category !== "throw" &&
    b.attackMs <= enemyMove.end &&
    distance <= (enemyMove.reach ?? FEEL.normalReach) + 35 &&
    height <= (enemyMove.vertical ?? FEEL.skillHeightTolerance);
  const wave = match.waves.find(
    (shot) =>
      shot.owner !== side &&
      !shot.hitTargets?.includes(side) &&
      Math.abs(shot.x - a.x) < 260 &&
      Math.abs(shot.y - (a.y + 100)) < 180 &&
      (shot.radial || (a.x - shot.x) * shot.vx >= 0),
  );
  if (
    !a.attack &&
    ground &&
    !match.options.rules.disableGuard &&
    (threat || wave) &&
    match.random() < difficulty.guard
  ) {
    const incoming = threat ? enemyMove : MOVES[wave!.attack];
    match.aiGuard = difficulty.reaction + difficulty.jitter + 20;
    return { guard: true, crouch: incoming?.level === "low" };
  }
  // Release a previous defensive hold before a punish or confirmed cancel.
  match.aiGuard = 0;
  if (a.attack && (!a.contact || match.random() > difficulty.combo))
    return navigation;

  const scheme = schemeFor(a);
  const toward = b.x > a.x ? "right" : "left";
  const forward = a.facing > 0 ? "right" : "left";
  const back = a.facing > 0 ? "left" : "right";
  const commands: Input[] = [
    { unified: true, light: true },
    { unified: true, heavy: true },
    { unified: true, light: true, crouch: true },
    { unified: true, heavy: true, crouch: true },
    { unified: true, super: true },
    { unified: true, transform: true },
    { unified: true, skill3: true, [forward]: true },
  ];
  scheme.base.forEach((_, i) =>
    commands.push({ unified: true, ["skill" + (i + 1)]: true }),
  );
  for (const variant of Object.keys(scheme.variants)) {
    const key = "skill" + variant.slice(-1);
    if (variant.startsWith("airDown") && ground) continue;
    commands.push({
      unified: true,
      [key]: true,
      ...(variant.startsWith("down") || variant.startsWith("airDown")
        ? { crouch: true }
        : variant.startsWith("forward")
          ? { [forward]: true }
          : { [back]: true }),
    });
  }
  const band = bandFor(a.character);
  const candidates: { input: Input; score: number }[] = [];
  const seen = new Set<string>();
  for (const input of commands) {
    // Resolving a command may consume motion history, so inspect a copy.
    const name = match.resolveAttack(
      { ...a, motion: [...a.motion] },
      input,
      (key) => !!input[key as keyof Input],
    );
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const move = MOVES[name];
    if (
      !band.owns(a, move, name) ||
      a.energy < (move.cost ?? 0) ||
      (!match.options.rules.noCooldowns && a.moveCooldowns[name]) ||
      (move.ground && !ground) ||
      (move.airOnly &&
        (ground || a.airUsed || match.airHeight(a) < (move.minHeight ?? 0))) ||
      (band.stanceLocked(a) &&
        move.stance &&
        (move.stance === "air" ? ground : !ground)) ||
      (move.delayedArea &&
        match.areas.some(
          (area) => area.owner === side && area.attack === name,
        )) ||
      (a.attack && !match.canCancel(a, name))
    )
      continue;

    let score: number;
    if (move.category === "transformation") {
      if (a.stageForm || a.penguin || distance < 360 || b.attack) continue;
      score = 28;
    } else if (move.healing || name === "heal") {
      if (
        a.hp > match.options.rules.maxHealth * 0.6 ||
        a.healCooldown ||
        distance < 350 ||
        b.attack
      )
        continue;
      score = 35;
    } else {
      if (
        !(
          move.damage > 0 ||
          move.pulses?.some((pulse) => pulse.damage > 0) ||
          move.projectile ||
          move.minion
        )
      )
        continue;
      const reach =
        move.maxReach ??
        move.reach ??
        (move.projectile ? 700 : FEEL.normalReach);
      if (
        distance > reach + (move.movement ?? 0) * 0.65 ||
        height >
          (move.vertical ?? (move.projectile ? 160 : FEEL.skillHeightTolerance))
      )
        continue;
      if (
        move.category === "throw" &&
        (!ground || !match.grounded(b) || b.stun || b.knockdown)
      )
        continue;
      score =
        Math.min(50, move.damage) +
        (move.pulses?.length ?? 0) * 4 -
        move.start * 0.045 -
        (move.cost ?? 0) * 0.18;
      if (move.projectile && distance > 280) score += 16;
      if (move.category === "normal" && distance < 170) score += 18;
      if (b.guard) {
        if (move.category === "throw") score += 65;
        if (
          (b.crouch && move.level === "high") ||
          (!b.crouch && move.level === "low")
        )
          score += 24;
      }
      if (b.attack && b.attackMs > enemyMove.end && move.start < b.cooldown)
        score += 20;
      if (a.contact && move.category === "super") score += 40;
    }
    candidates.push({
      input,
      score: score + match.random() * difficulty.precision,
    });
  }
  candidates.sort((left, right) => right.score - left.score);
  if (candidates.length) return candidates[0].input;
  // Close empty space quickly, but do not dash into an active strike.
  if (
    !a.attack &&
    ground &&
    distance > 430 &&
    !b.attack &&
    difficulty.id >= 4 &&
    !a.dashCooldown &&
    (match.options.rules.freeDash || a.energy >= FEEL.dashCost)
  )
    return { [toward]: true, dash: true };
  return navigation;
}
