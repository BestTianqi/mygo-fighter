import {
  FEEL,
  MAX_HEALTH,
  MOVES,
  NORMAL_BUTTONS,
  ROSTER,
  ROUND_END_TIMING,
  WORLD,
  moveList,
} from "./combatData";
import * as areas from "./match/areas";
import { ENTRANCE_TIMING } from "./animation/entrance";
import { clamp } from "./match/combatMath";
import * as commands from "./match/commands";
import * as cpu from "./match/cpu";
import * as fighter from "./match/fighter";
import * as forms from "./match/forms";
import * as hits from "./match/hits";
import * as projectiles from "./match/projectiles";
import * as rounds from "./match/rounds";
import * as summons from "./match/summons";
import * as terrain from "./match/terrain";
import * as tick from "./match/tick";
import type { Area } from "./objects/Area";
import type { CombatEvent } from "./objects/CombatEvent";
import type { Fighter } from "./objects/Fighter";
import type { Input } from "./objects/Input";
import type { MatchOptions } from "./objects/MatchOptions";
import type { Minion } from "./objects/Minion";
import type { Move } from "./objects/Move";
import type { RoundEnd } from "./objects/RoundEnd";
import type { Terrain } from "./objects/Terrain";
import type { Wave } from "./objects/Wave";
/** Serializable match state and the public combat API used by local play and LAN.
 * Rule implementations live in match/ and receive this owning state explicitly.
 * Keep instance fields stable: prediction and the JVM serialize these fields.
 */
class Match {
  options: Required<
    Pick<MatchOptions, "mode" | "format" | "difficulty" | "characters" | "seed">
  > &
    MatchOptions;
  teamIndices: number[];
  teamCarry: ({ hp: number; energy: number; beats?: number } | null)[] | null;
  teams: number[][] = [];
  seed: number;
  wins: number[];
  round: number;
  phase: "idle" | "ready" | "fighting" | "roundOver" | "finished";
  paused: boolean;
  events: CombatEvent[];
  elapsed: number;
  accumulator: number;
  winner: number;
  fighters: Fighter[] = [];
  roundEnd: RoundEnd | null = null;
  remaining = 60000;
  waves: Wave[] = [];
  areas: Area[] = [];
  freeze = 0;
  inputTick = 0;
  simulationTick = 0;
  previous: Input[] = [{}, {}];
  aiThink = 0;
  aiGuard = 0;
  aiGoal = -1;
  phaseMs = 0;
  entrySides = [false, false];
  reason = "";
  soyoSuperId = 0;

  constructor(options: MatchOptions = {}) {
    this.options = {
      mode: "cpu",
      format: "1v1",
      difficulty: 1,
      characters: [0, 0],
      seed: 128,
      ...options,
    };
    this.options.characters = [...this.options.characters];
    this.teamIndices = [0, 0];
    this.teamCarry = null;
    if (this.isTeamBattle) {
      const teams = this.options.teams;
      if (
        !Array.isArray(teams) ||
        teams.length !== 2 ||
        !Array.from(teams).every(
          (team) =>
            Array.isArray(team) &&
            team.length === 3 &&
            new Set(team).size === 3 &&
            Array.from(team).every(
              (id) => Number.isInteger(id) && id >= 0 && id < ROSTER.length,
            ),
        )
      ) {
        throw new RangeError(
          "Team battle requires two teams of three unique valid character IDs",
        );
      }
      this.teams = teams.map((team) => [...team]);
      this.options.teams = this.teams.map((team) => [...team]);
      this.options.characters = this.teams.map((team) => team[0]);
    }
    this.seed = this.options.seed || 1;
    this.wins = [0, 0];
    this.round = 1;
    this.phase = "idle";
    this.paused = false;
    this.events = [];
    this.elapsed = 0;
    this.accumulator = 0;
    this.winner = -1;
    this.resetRound();
  }
  get isTeamBattle() {
    return this.options.format === "3v3";
  }
  get teamRemaining() {
    return this.teamIndices.map((index) => Math.max(0, 3 - index));
  }
  random() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  floorHeight(x: number) {
    return terrain.floorHeight(this, x);
  }
  surfaceBelow(x: number, y: number, dropMs = 0) {
    return terrain.surfaceBelow(this, x, y, dropMs);
  }
  grounded(f: Fighter) {
    return terrain.grounded(this, f);
  }
  airHeight(f: Fighter) {
    return terrain.airHeight(this, f);
  }
  setTerrain(value: Terrain | null) {
    return terrain.setTerrain(this, value);
  }
  land(f: Fighter, height: number) {
    return terrain.land(this, f, height);
  }
  jumpTime(f: Fighter, height: number) {
    return terrain.jumpTime(f, height);
  }
  nextPlatform(a: Fighter, b: Fighter) {
    return terrain.nextPlatform(this, a, b);
  }
  resetRound() {
    return rounds.resetRound(this);
  }
  start(carry: Match["teamCarry"] = null) {
    this.resetRound();
    if (carry)
      carry.forEach((resources, side) => {
        if (resources) Object.assign(this.fighters[side], resources);
      });
    this.phase = "ready";
    this.entrySides = [0, 1].map((side) => !carry?.[side]);
    this.phaseMs = ENTRANCE_TIMING.total;
    this.paused = false;
  }
  endStageForm(side: number) {
    return forms.endStageForm(this, side);
  }
  endPenguin(side: number) {
    return forms.endPenguin(this, side);
  }
  restart() {
    this.wins = [0, 0];
    this.round = 1;
    this.events = [];
    this.teamIndices = [0, 0];
    this.teamCarry = null;
    if (this.isTeamBattle)
      this.options.characters = this.teams.map((team) => team[0]);
    this.start();
  }
  nextRound() {
    return rounds.nextRound(this);
  }
  setPaused(value: boolean) {
    if (this.phase === "idle") return;
    this.paused = value;
    this.release();
  }
  release() {
    this.previous = [{}, {}];
    this.fighters.forEach((f) => {
      f.buffer = null;
      f.bufferMs = f.jumpBufferMs = f.dashBufferMs = 0;
      f.motion = [];
    });
  }
  advance(ms: number, p1: Input = {}, p2: Input = {}) {
    if (this.paused || this.phase === "idle") return;
    this.accumulator += clamp(ms, 0, 60000);
    while (this.accumulator >= 10) {
      this.accumulator -= 10;
      this.step(p1, p2);
    }
  }
  aiInput(): Input {
    return cpu.aiInput(this);
  }
  step(p1: Input, p2: Input) {
    return tick.step(this, p1, p2);
  }
  recordDirection(f: Fighter, input: Input) {
    return commands.recordDirection(f, input);
  }
  updateBindings() {
    return areas.updateBindings(this);
  }
  motionMatches(f: Fighter, pattern: number[]) {
    return commands.motionMatches(f, pattern);
  }
  resolveAttack(f: Fighter, input: Input, pressed: (key: string) => boolean) {
    return commands.resolveAttack(this, f, input, pressed);
  }
  canCancel(f: Fighter, name: string) {
    return commands.canCancel(this, f, name);
  }
  invulnerable(f: Fighter) {
    return hits.invulnerable(f);
  }
  updateFighter(side: number, input: Input) {
    return fighter.updateFighter(this, side, input);
  }
  separate() {
    return terrain.separate(this);
  }
  meleeConnects(
    source: Fighter,
    target: Pick<Fighter, "x" | "y">,
    move: Move,
    reach: number,
    vertical: number,
  ) {
    return hits.meleeConnects(source, target, move, reach, vertical);
  }
  hitMinion(
    side: number,
    unit: Minion,
    attack: string,
    impact: Partial<Move> = {},
  ) {
    return summons.hitMinion(this, side, unit, attack, impact);
  }
  updateSoyoSupers() {
    return areas.updateSoyoSupers(this);
  }
  updateSummons() {
    return summons.updateSummons(this);
  }
  updateAreas() {
    return areas.updateAreas(this);
  }
  spawnWave(side: number, attack = "wave", impact?: Partial<Move>) {
    return projectiles.spawnWave(this, side, attack, impact);
  }
  updateWaves() {
    return projectiles.updateWaves(this);
  }
  hit(
    side: number,
    attack: string,
    x: number,
    y: number,
    impact: Partial<Move> = {},
  ) {
    return hits.hit(this, side, attack, x, y, impact);
  }
  endRound() {
    return rounds.endRound(this);
  }
  drainEvents() {
    return this.events.splice(0);
  }
  pose(side: number) {
    const f = this.fighters[side];
    if (this.phase === "finished" || this.phase === "roundOver")
      return this.winner < 0 ? 0 : this.winner === side ? 14 : 15;
    if (f.knockdown) return 13;
    if (f.landingRecovery) return 3;
    if (f.guard || f.crouch) return 3;
    if (f.stun) return f.stun > 150 ? 13 : 12;
    if (f.attack) {
      if (f.attack === "shield") return 3;
      const m = MOVES[f.attack ?? ""],
        base = f.attack === "light" || f.attack === "throw" ? 4 : 7;
      return base + (f.attackMs < m.start ? 0 : f.attackMs <= m.end ? 1 : 2);
    }
    if (!this.grounded(f)) return f.vy > 0 ? 10 : 11;
    if (Math.abs(f.vx) > 25) return 1 + (Math.floor(this.elapsed / 110) % 2);
    return 0;
  }
}

export {
  FEEL,
  MAX_HEALTH,
  MOVES,
  Match,
  NORMAL_BUTTONS,
  ROSTER,
  ROUND_END_TIMING,
  WORLD,
  moveList,
};
