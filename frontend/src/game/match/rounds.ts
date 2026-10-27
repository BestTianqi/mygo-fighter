import { MAX_HEALTH, ROUND_END_TIMING } from "../combatData";
import type { Match } from "../engine";

export function resetRound(match: Match): void {
  match.roundEnd = null;
  match.finishReady = [true, true];
  match.fighters = [0, 1].map((side) => ({
    character: match.options.characters[side],
    x: side ? 680 : 280,
    y: 0,
    vx: 0,
    vy: 0,
    pushVx: 0,
    facing: side ? -1 : 1,
    hp: MAX_HEALTH,
    lifesteal: null,
    // New reserves receive entry energy; start(carry) restores the survivor's resources.
    energy: match.isTeamBattle && match.teamIndices[side] > 0 ? 30 : 0,
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
  }));
  if (match.options.mode === "practice") {
    match.fighters[0].energy = 100;
    match.fighters[1].x = 480;
  }
  for (const f of match.fighters) f.y = match.floorHeight(f.x);
  match.remaining = 60000;
  match.waves = [];
  match.areas = [];
  match.freeze = 0;
  match.inputTick = 0;
  match.previous = [{}, {}];
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
  match.reason = match.remaining <= 0 ? "TIME OVER" : "K.O.";
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
    const exhausted = match.teamIndices.map((index) => index >= 3);
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
