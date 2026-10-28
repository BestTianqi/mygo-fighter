import { ROUND_END_TIMING } from "../combatData";
import type { Fighter } from "../objects/Fighter";
import type { Match } from "../engine";

export function resetRound(match: Match): void {
  match.roundEnd = null;
  match.finishReady = Array(match.playerCount).fill(true);
  match.entrySides = Array(match.playerCount).fill(false);
  match.respawnMs = Array(match.playerCount).fill(0);
  match.eliminated = Array(match.playerCount).fill(false);
  match.fighters = Array.from({ length: match.playerCount }, (_, side) =>
    createFighter(match, side),
  );
  if (match.options.mode === "practice") {
    match.fighters[0].energy = 100;
    match.fighters[1].x = 480;
  }
  for (const f of match.fighters) f.y = match.floorHeight(f.x);
  match.remaining = match.options.rules.roundSeconds * 1000;
  match.waves = [];
  match.areas = [];
  match.freeze = 0;
  match.inputTick = 0;
  match.previous = match.fighters.map(() => ({}));
  match.aiStates = Array.from({ length: match.playerCount }, () => ({
    think: 360,
    guard: 0,
    goal: -1,
  }));
  match.aiThink = 360;
  match.aiGuard = 0;
  match.aiGoal = -1;
  match.winner = -1;
  match.accumulator = 0;
}

export function nextRound(match: Match): boolean {
  if (match.phase !== "roundOver" || match.phaseMs > 0) return false;
  if (match.isTeamBattle) {
    match.round++;
    match.options.characters = match.teams.map(
      (team, side) => team[match.teamIndices[side]],
    );
    match.start(match.teamCarry);
    match.teamCarry = null;
    match.events.push({
      type: "teamAdvance",
      characters: [...match.options.characters],
      teamIndices: [...match.teamIndices],
    });
    return true;
  }
  if (match.winner !== -1) match.round++;
  match.start();
  match.events.push({
    type: "roundAdvance",
    characters: [...match.options.characters],
  });
  return true;
}

export function endRound(match: Match): void {
  if (match.phase !== "fighting") return;
  if (match.isBrawl) {
    finishBrawl(match);
    return;
  }
  const [a, b] = match.fighters;
  match.winner = a.hp === b.hp ? -1 : a.hp > b.hp ? 0 : 1;
  const boutWinner = match.winner;
  const finishingBlow =
    boutWinner >= 0 ? match.fighters[1 - boutWinner].defeatedBy : null;
  match.roundEnd = Object.freeze({
    tick: match.simulationTick,
    winner: boutWinner,
    finisher:
      finishingBlow?.side === boutWinner
        ? Object.freeze({ ...finishingBlow })
        : null,
    fighters: match.fighters.map((f) =>
      Object.freeze({
        character: f.character,
        penguin: !!f.penguin,
        stageForm: !!f.stageForm,
        attack: f.attack,
        attackMs: f.attackMs,
        y: f.y,
        landY: match.surfaceBelow(f.x, f.y, f.dropMs),
      }),
    ),
  });
  match.finishReady = match.roundEnd.finisher ? [false, false] : [true, true];
  match.reason =
    !match.options.rules.infiniteTime && match.remaining <= 0
      ? "TIME OVER"
      : "K.O.";
  if (match.winner >= 0) match.wins[match.winner]++;
  if (match.isTeamBattle) {
    // Rebuild both fighters between bouts, carrying only the survivor's persistent resources.
    match.teamCarry = match.fighters.map((f, side) => {
      if (side !== boutWinner) {
        match.teamIndices[side]++;
        return null;
      }
      return {
        hp: f.hp,
        energy: f.energy,
        ...(f.character === 4 ? { beats: f.beats } : {}),
      };
    });
    const exhausted = match.teamIndices.map(
      (index, side) => index >= match.teams[side].length,
    );
    match.phase = exhausted.some(Boolean) ? "finished" : "roundOver";
    if (match.phase === "finished")
      match.winner = exhausted[0] === exhausted[1] ? -1 : exhausted[0] ? 1 : 0;
  } else
    match.phase = match.wins.some((w) => w >= 2) ? "finished" : "roundOver";
  match.phaseMs = ROUND_END_TIMING.total;
  match.release();
  match.fighters.forEach((f) => {
    f.lifesteal = null;
    f.summons = null;
    f.soyoSuper = null;
    f.hardStun = 0;
    f.binding = null;
  });
  match.fighters.forEach((f, side) => {
    if (f.penguin) match.endPenguin(side);
  });
  match.fighters.forEach((f, side) => {
    if (f.stageForm) match.endStageForm(side);
  });
  match.areas = [];
  match.waves = [];
  match.events.push({
    type: "result",
    winner: match.winner,
    reason: match.reason,
    ...(match.isTeamBattle
      ? {
          boutWinner,
          teamIndices: [...match.teamIndices],
          teamRemaining: match.teamRemaining,
        }
      : {}),
  });
}

function createFighter(match: Match, side: number): Fighter {
  return {
    character: match.options.characters[side],
    x: match.isBrawl ? [240, 480, 720][side] : side ? 680 : 280,
    y: 0,
    vx: 0,
    vy: 0,
    pushVx: 0,
    facing: side ? -1 : 1,
    hp: match.options.rules.maxHealth,
    lifesteal: null,
    // New reserves receive entry energy; start(carry) restores the survivor's resources.
    energy: match.options.rules.infiniteEnergy
      ? 100
      : match.isTeamBattle && match.teamIndices[side] > 0
        ? Math.max(30, match.options.rules.initialEnergy)
        : match.options.rules.initialEnergy,
    attack: null,
    attackMs: 0,
    hit: false,
    stun: 0,
    hardStun: 0,
    soyoSuper: null,
    cooldown: 0,
    guard: false,
    crouch: false,
    knockdown: 0,
    landingRecovery: 0,
    dashMs: 0,
    dashCooldown: 0,
    dashInvuln: 0,
    jumps: 2,
    combo: 0,
    comboMs: 0,
    cancelDepth: 0,
    contact: false,
    lastHitAt: -1,
    buffer: null,
    bufferMs: 0,
    jumpBufferMs: 0,
    dashBufferMs: 0,
    blinkBuffer: false,
    dashDirection: side ? -1 : 1,
    coyoteMs: 0,
    motion: [],
    controlMs: 0,
    hitMarks: [],
    minionHitMarks: [],
    attackCrouch: false,
    backThrow: false,
    airUsed: false,
    shield: null,
    summons: null,
    dropMs: 0,
    healCooldown: 0,
    tuneCooldown: 0,
    penguin: null,
    wakeInvuln: 0,
    launched: false,
    lightHoldMs: 0,
    pressIds: {},
    beats: 0,
    beatGranted: false,
    calibrateCooldown: 0,
    stageForm: null,
    moveCooldowns: {},
    attackTarget: null,
    binding: null,
    runeMarks: [],
  };
}

/** Individual KOs consume a reserve without interrupting the other players. */
export function updateBrawlRespawns(match: Match): void {
  if (!match.isBrawl) return;
  for (let side = 0; side < match.playerCount; side++) {
    if (match.respawnMs[side] <= 0) continue;
    match.respawnMs[side] = Math.max(0, match.respawnMs[side] - 10);
    if (match.respawnMs[side] > 0) continue;
    match.options.characters[side] = match.teams[side][match.teamIndices[side]];
    const f = createFighter(match, side);
    f.y = match.floorHeight(f.x);
    f.wakeInvuln = 1000;
    match.fighters[side] = f;
    match.previous[side] = {};
    match.events.push({
      type: "fighterRespawn",
      side,
      characters: [...match.options.characters],
      teamIndices: [...match.teamIndices],
      teamRemaining: match.teamRemaining,
    });
  }
}

export function resolveBrawlKOs(match: Match): void {
  const defeated: number[] = [];
  for (let side = 0; side < match.playerCount; side++) {
    const f = match.fighters[side];
    if (f.hp > 0 || match.respawnMs[side] > 0 || match.eliminated[side])
      continue;
    defeated.push(side);
    match.teamIndices[side]++;
    match.eliminated[side] =
      match.teamIndices[side] >= match.teams[side].length;
    match.respawnMs[side] = match.eliminated[side] ? 0 : 5000;
    f.attack = f.buffer = null;
    f.summons = f.shield = f.soyoSuper = f.binding = f.lifesteal = null;
    f.vx = f.vy = f.pushVx = 0;
    match.waves = match.waves.filter((wave) => wave.owner !== side);
    match.areas = match.areas.filter((area) => area.owner !== side);
    match.events.push({
      type: "fighterKO",
      side,
      duration: match.respawnMs[side],
      teamIndices: [...match.teamIndices],
      teamRemaining: match.teamRemaining,
    });
    if (match.eliminated[side])
      match.events.push({ type: "fighterEliminated", side });
  }
  if (
    match.eliminated.filter((value) => !value).length <= 1 ||
    (!match.options.rules.infiniteTime && match.remaining <= 0)
  )
    finishBrawl(match, defeated);
}

function finishBrawl(match: Match, defeated: number[] = []): void {
  const survivors = match.fighters
    .map((_, side) => side)
    .filter((side) => !match.eliminated[side]);
  let candidates = survivors;
  if (survivors.length > 1) {
    const bestReserves = Math.max(
      ...survivors.map((side) => match.teamRemaining[side]),
    );
    candidates = survivors.filter(
      (side) => match.teamRemaining[side] === bestReserves,
    );
    const bestHp = Math.max(
      ...candidates.map((side) => match.fighters[side].hp),
    );
    candidates = candidates.filter(
      (side) => match.fighters[side].hp === bestHp,
    );
  }
  match.winner = candidates.length === 1 ? candidates[0] : -1;
  if (match.winner >= 0) match.wins[match.winner]++;
  match.reason =
    !match.options.rules.infiniteTime && match.remaining <= 0
      ? "TIME OVER"
      : "K.O.";
  match.phase = "finished";
  match.phaseMs = ROUND_END_TIMING.total;
  const finishingBlow =
    match.winner < 0
      ? null
      : match.fighters
          .filter(
            (fighter, side) =>
              defeated.includes(side) &&
              side !== match.winner &&
              fighter.hp <= 0,
          )
          .map((fighter) => fighter.defeatedBy)
          .find((blow) => blow?.side === match.winner);
  match.roundEnd = Object.freeze({
    tick: match.simulationTick,
    winner: match.winner,
    finisher: finishingBlow ? Object.freeze({ ...finishingBlow }) : null,
    fighters: match.fighters.map((f) =>
      Object.freeze({
        character: f.character,
        penguin: !!f.penguin,
        stageForm: !!f.stageForm,
        attack: f.attack,
        attackMs: f.attackMs,
        y: f.y,
        landY: match.surfaceBelow(f.x, f.y, f.dropMs),
      }),
    ),
  });
  match.finishReady = Array(match.playerCount).fill(!finishingBlow);
  match.release();
  match.fighters.forEach((f, side) => {
    f.attack = null;
    f.binding = f.summons = f.soyoSuper = f.lifesteal = null;
    if (f.penguin) match.endPenguin(side);
    if (f.stageForm) match.endStageForm(side);
  });
  match.waves = [];
  match.areas = [];
  match.events.push({
    type: "result",
    winner: match.winner,
    reason: match.reason,
    teamIndices: [...match.teamIndices],
    teamRemaining: match.teamRemaining,
  });
}
