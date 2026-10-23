const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, ROUND_END_TIMING } = require('../src/engine.js');
const { createAnimator } = require('../src/animation.js');
function fight(characters = [0, 1]) {
  const m = new Match({ mode: 'duel', characters }); m.start(); m.advance(1000); return m;
}
test('KO plays its entire sequence before automatically starting a solo round', () => {
  const m = fight(); m.fighters[1].hp = 0; m.endRound();
  m.advance(ROUND_END_TIMING.total - 10, { light: true });
  assert.equal(m.phase, 'roundOver'); assert.deepEqual(m.wins, [1, 0]);
  assert.equal(m.nextRound(), false); assert.equal(m.fighters[1].hp, 0);
  m.advance(10); assert.equal(m.phase, 'ready'); assert.equal(m.round, 2);
  assert.equal(m.phaseMs, 1000); assert.equal(m.roundEnd, null);
  assert.deepEqual(m.fighters.map(f => f.hp), [200, 200]);
  assert.ok(m.drainEvents().some(e => e.type === 'roundAdvance'));
});
test('ending snapshot preserves the winning transformation after combat cleanup', () => {
  for (const [character, field] of [[2, 'penguin'], [6, 'stageForm']]) {
    const m = fight([character, 1]); m.fighters[0][field] = { ms: 12000 };
    m.fighters[1].hp = 0; m.endRound();
    assert.equal(m.fighters[0][field], null);
    assert.ok(m.roundEnd.fighters[0][field]); assert.equal(m.roundEnd.winner, 0);
    m.advance(500); assert.ok(m.roundEnd.fighters[0][field]);
  }
});
test('KO falls onto the stage while combat and pause cannot change the result', () => {
  const m = fight(); m.fighters[1].hp = 0; m.fighters[1].y = 300; m.endRound();
  m.advance(ROUND_END_TIMING.impact);
  const choose = createAnimator(); assert.equal(choose(m, 1), 'knockdown-fall');
  m.advance(300, { super: true }); const before = JSON.stringify(m.fighters);
  const timer = m.phaseMs; m.setPaused(true); m.advance(9000);
  assert.equal(m.phaseMs, timer); assert.equal(JSON.stringify(m.fighters), before);
  m.setPaused(false); m.advance(ROUND_END_TIMING.knockout);
  assert.equal(m.fighters[1].y, m.floorHeight(m.fighters[1].x));
  assert.equal(choose(m, 1), 'knockdown-ground'); assert.equal(m.fighters[0].hp, 200);
});
test('the final impact holds both fighters before the KO fall begins', () => {
  const m = fight(); Object.assign(m.fighters[0], { attack: 'heavy', attackMs: 180 });
  Object.assign(m.fighters[1], { hp: 0, y: 260, stun: 400, vy: 500 });
  m.endRound(); const y = m.fighters[1].y;
  m.advance(ROUND_END_TIMING.impact - 10);
  assert.equal(m.fighters[1].y, y); assert.equal(m.fighters[0].attackMs, 180);
  const choose = createAnimator(); assert.equal(choose(m, 1), 'hit-high');
  m.advance(60); assert.notEqual(m.fighters[1].y, y);
  assert.equal(choose(m, 1), 'knockdown-fall');
});
test('final match plays the ending but never automatically restarts', () => {
  const m = fight(); m.wins = [1, 0]; m.fighters[1].hp = 0; m.endRound();
  assert.equal(m.phaseMs, ROUND_END_TIMING.total);
  m.advance(20000); assert.equal(m.phase, 'finished'); assert.equal(m.phaseMs, 0);
  assert.equal(m.roundEnd.winner, 0); assert.deepEqual(m.wins, [2, 0]);
});
test('a timed draw has no winning portrait and automatically replays the round', () => {
  const m = fight(); m.remaining = 0; m.endRound();
  assert.equal(m.roundEnd.winner, -1); assert.equal(m.reason, 'TIME OVER');
  m.advance(ROUND_END_TIMING.total + 1000); assert.equal(m.phase, 'fighting');
  assert.deepEqual(m.wins, [0, 0]); assert.equal(m.round, 1);
});
