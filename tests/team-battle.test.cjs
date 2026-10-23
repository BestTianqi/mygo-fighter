const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, ROSTER, MAX_HEALTH, MOVES, ROUND_END_TIMING } = require('../src/engine.js');

const DEFAULT_TEAMS = [[0, 1, 2], [3, 4, 5]];
function fight(options = {}) {
  const m = new Match({ mode: 'duel', format: '3v3', teams: DEFAULT_TEAMS, ...options });
  m.start(); m.advance(1000);
  assert.equal(m.phase, 'fighting');
  return m;
}
function knockout(m, loser) {
  m.fighters[loser].hp = 0;
  m.advance(10);
}
function nextBout(m) {
  m.advance(ROUND_END_TIMING.total);
  assert.equal(m.phase, 'ready');
  m.advance(1000);
  assert.equal(m.phase, 'fighting');
}

test('3v3 copies two ordered teams and starts their first members independently of control mode', () => {
  const teams = [[0, 1, 2], [0, 4, 14]];
  const m = fight({ teams, characters: [9, 8] });
  teams[0][0] = 9; teams[1].push(8);
  assert.equal(m.isTeamBattle, true);
  assert.equal(m.options.format, '3v3');
  assert.deepEqual(m.teams, [[0, 1, 2], [0, 4, 14]]);
  assert.deepEqual(m.teamIndices, [0, 0]);
  assert.deepEqual(m.teamRemaining, [3, 3]);
  assert.deepEqual(m.options.characters, [0, 0]);
  assert.deepEqual(m.fighters.map(f => f.character), [0, 0]);
  assert.equal(m.options.mode, 'duel');
});

test('3v3 rejects malformed, duplicate and out of roster teams', () => {
  const invalid = [[], [[0, 1, 2]], [[0, 1], [3, 4, 5]], [[0, 1, 2, 3], [3, 4, 5]],
    [[0, 0, 2], [3, 4, 5]], [[0, 1, 2], [3, 3, 5]], [[-1, 1, 2], [3, 4, 5]],
    [[0, 1, ROSTER.length], [3, 4, 5]], [[0, 1, 2.5], [3, 4, 5]], [['0', 1, 2], [3, 4, 5]],
    [[0, 1, 2], null]];
  for (const teams of invalid) assert.throws(() => new Match({ format: '3v3', teams }), /team/i);
});

for (const loser of [0, 1]) test(`side ${loser} replaces only its defeated fighter; survivor HP and energy carry`, () => {
  const m = fight(), winner = 1 - loser;
  m.fighters[winner].hp = 87; m.fighters[winner].energy = 64;
  knockout(m, loser);
  assert.equal(m.phase, 'roundOver');
  assert.equal(m.phaseMs, ROUND_END_TIMING.total);
  assert.deepEqual(m.teamIndices, loser === 0 ? [1, 0] : [0, 1]);
  const result = m.drainEvents().find(e => e.type === 'result');
  assert.equal(result.winner, winner); assert.equal(result.boutWinner, winner);
  assert.equal(result.reason, 'K.O.');
  assert.deepEqual(result.teamRemaining, loser === 0 ? [2, 3] : [3, 2]);
  nextBout(m);
  assert.equal(m.fighters[winner].hp, 87); assert.equal(m.fighters[winner].energy, 64);
  assert.equal(m.fighters[loser].hp, MAX_HEALTH); assert.equal(m.fighters[loser].energy, 0);
  assert.equal(m.fighters[loser].character, DEFAULT_TEAMS[loser][1]);
  assert.equal(m.remaining, 60000); assert.equal(m.round, 2);
  const advance = m.drainEvents().find(e => e.type === 'teamAdvance');
  assert.deepEqual(advance.characters, m.options.characters);
  assert.deepEqual(advance.teamIndices, m.teamIndices);
});

test('two wins do not end a team battle and the third defeated opponent ends it', () => {
  const m = fight();
  knockout(m, 1); nextBout(m);
  knockout(m, 1); assert.equal(m.phase, 'roundOver'); assert.deepEqual(m.wins, [2, 0]);
  nextBout(m); knockout(m, 1);
  assert.equal(m.phase, 'finished'); assert.equal(m.winner, 0);
  assert.deepEqual(m.teamIndices, [0, 3]); assert.deepEqual(m.teamRemaining, [3, 0]);
  m.advance(5000); assert.equal(m.phase, 'finished'); assert.equal(m.nextRound(), false);
});

test('a final survivor can win after both teams have lost members', () => {
  const m = fight();
  for (const loser of [0, 1, 0, 1]) { knockout(m, loser); nextBout(m); }
  assert.equal(m.round, 5); assert.deepEqual(m.teamIndices, [2, 2]);
  knockout(m, 0); assert.equal(m.winner, 1); assert.equal(m.phase, 'finished');
});

test('equal timeout and double KO advance both queues, with a draw when both are exhausted', () => {
  const m = fight();
  m.remaining = 10; m.advance(10);
  assert.equal(m.reason, 'TIME OVER'); assert.equal(m.winner, -1);
  assert.deepEqual(m.teamIndices, [1, 1]); nextBout(m);
  m.fighters.forEach(f => f.hp = 0); m.advance(10);
  assert.deepEqual(m.teamIndices, [2, 2]); nextBout(m);
  m.fighters.forEach(f => f.hp = 0); m.advance(10);
  assert.equal(m.phase, 'finished'); assert.equal(m.winner, -1);
  assert.deepEqual(m.teamIndices, [3, 3]); assert.deepEqual(m.wins, [0, 0]);
});

test('unequal timeout removes the lower HP fighter and preserves the winner resources', () => {
  const m = fight(); m.fighters[0].hp = 83; m.fighters[0].energy = 42;
  m.fighters[1].hp = 12; m.remaining = 10; m.advance(10);
  assert.equal(m.reason, 'TIME OVER'); assert.equal(m.winner, 0);
  nextBout(m); assert.equal(m.fighters[0].hp, 83); assert.equal(m.fighters[0].energy, 42);
  assert.equal(m.fighters[1].hp, 200); assert.equal(m.remaining, 60000);
});

test('team intermission lasts for the complete victory presentation; pause freezes it and ready countdown follows', () => {
  const m = fight(); knockout(m, 1); m.advance(ROUND_END_TIMING.total - 10);
  assert.equal(m.phase, 'roundOver'); assert.equal(m.nextRound(), false);
  m.setPaused(true); m.advance(9000); assert.equal(m.phaseMs, 10);
  m.setPaused(false); m.advance(10); assert.equal(m.phase, 'ready'); assert.equal(m.phaseMs, 1000);
  m.advance(990); assert.equal(m.phase, 'ready'); m.advance(10); assert.equal(m.phase, 'fighting');
});

test('a bulk advance consumes remaining time after automatic team advancement', () => {
  const m = fight(); knockout(m, 1); m.advance(ROUND_END_TIMING.total + 1010);
  assert.equal(m.phase, 'fighting'); assert.equal(m.remaining, 59990);
});

test('tagging clears transient statuses, projectiles, Soyo control and summons without hitstop ghosts', () => {
  const m = fight({ teams: [[1, 4, 2], [2, 5, 10]] });
  const survivor = m.fighters[0]; survivor.hp = 123; survivor.energy = 46;
  Object.assign(survivor, { hardStun: 550, stun: 600, soyoSuper: { released: true },
    summons: { units: [{ hp: 20 }] }, shield: { hp: 30 }, combo: 9, cooldown: 900, healCooldown: 8000,
    attack: 'soyoSuper', motion: [1], moveCooldowns: { wave: 9000 } });
  m.fighters[1].penguin = { ms: 20000 }; m.fighters[1].hp = 0;
  m.waves.push({ owner: 0 }); m.areas.push({ owner: 1 }); m.freeze = 200;
  m.endRound(); nextBout(m);
  assert.equal(m.fighters[0].hp, 123); assert.equal(m.fighters[0].energy, 46);
  for (const f of m.fighters) {
    assert.equal(f.stun, 0); assert.equal(f.hardStun, 0); assert.equal(f.soyoSuper, null);
    assert.equal(f.summons, null); assert.equal(f.shield, null); assert.equal(f.penguin, null);
    assert.equal(f.stageForm, null); assert.equal(f.attack, null); assert.equal(f.combo, 0);
    assert.deepEqual(f.motion, []); assert.deepEqual(f.moveCooldowns, {});
  }
  assert.equal(m.freeze, 0); assert.deepEqual(m.waves, []); assert.deepEqual(m.areas, []);
  m.advance(10, { right: true }); assert.ok(m.fighters[0].x > 280);
});

test('a surviving Riki carries four beats but a fresh Riki starts with none', () => {
  const m = fight({ teams: [[4, 1, 2], [0, 4, 2]] });
  m.fighters[0].beats = 4; knockout(m, 1); nextBout(m);
  assert.equal(m.fighters[0].beats, 4); assert.equal(m.fighters[1].beats, 0);
});

test('tagged Mujica and Mewtype fighters use their original kits and forms', () => {
  const m = fight({ teams: [[0, 5, 10], [1, 6, 11]] });
  knockout(m, 0); nextBout(m);
  m.advance(10, { unified: true, light: true });
  assert.equal(MOVES[m.fighters[0].attack].ownerCharacter, 5);
  m.fighters[0].hp = 0; m.endRound(); nextBout(m);
  m.advance(10, { unified: true, light: true });
  assert.equal(MOVES[m.fighters[0].attack].ownerCharacter, 10);
});

test('CPU continues controlling the newly tagged fighter', () => {
  const m = fight({ mode: 'cpu', teams: [[0, 1, 2], [0, 4, 10]], seed: 27 });
  knockout(m, 1); nextBout(m);
  for (let i = 0; i < 2000 && m.phase === 'fighting'; i++) m.advance(10);
  assert.equal(m.fighters[1].character, 4); assert.ok(m.fighters[0].hp < 200);
});

test('restart resets team queues and resources while keeping the original team choices', () => {
  const m = fight(); knockout(m, 0); nextBout(m); knockout(m, 1);
  m.setPaused(true); m.restart();
  assert.equal(m.phase, 'ready'); assert.equal(m.paused, false);
  assert.deepEqual(m.teamIndices, [0, 0]); assert.deepEqual(m.teamRemaining, [3, 3]);
  assert.deepEqual(m.options.characters, [0, 3]); assert.deepEqual(m.wins, [0, 0]);
  assert.equal(m.round, 1); assert.equal(m.remaining, 60000);
  assert.deepEqual(m.fighters.map(f => [f.hp, f.energy]), [[200, 0], [200, 0]]);
});

test('default solo rounds automatically continue and finish at two wins', () => {
  const m = new Match({ mode: 'duel', characters: [0, 1] }); m.start(); m.advance(1000);
  assert.equal(m.isTeamBattle, false); knockout(m, 1); m.advance(ROUND_END_TIMING.total);
  assert.equal(m.phase, 'ready'); assert.equal(m.round, 2);
  m.advance(1000); knockout(m, 1); assert.equal(m.phase, 'finished'); assert.equal(m.winner, 0);
});
