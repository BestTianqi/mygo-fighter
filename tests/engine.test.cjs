const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, ROSTER } = require('../src/engine.js');

function fight(options = {}) {
  const m = new Match({ mode: 'duel', ...options });
  m.start();
  m.advance(1000);
  assert.equal(m.phase, 'fighting');
  return m;
}
function close(m) { m.fighters[0].x = 420; m.fighters[1].x = 485; }
function attack(m, action, defender = {}) {
  m.advance(10, { [action]: true }, defender);
  m.advance(300, {}, defender);
}

test('six profiles reuse the mota roster and its movement stats', () => {
  assert.equal(ROSTER.length, 6);
  assert.equal(ROSTER[3].speed, 270);
  assert.equal(ROSTER[4].heavyDamage, 22);
});
test('ready locks movement; fight supports movement, jump, gravity and body separation', () => {
  const m = new Match({ mode: 'duel' }); m.start();
  m.advance(500, { right: true, light: true });
  assert.equal(m.fighters[0].x, 280);
  assert.equal(m.fighters[1].hp, 100);
  m.advance(500);
  m.advance(200, { right: true, jump: true });
  assert.ok(m.fighters[0].x > 280);
  assert.ok(m.fighters[0].y > 0);
  m.advance(1500);
  assert.equal(m.fighters[0].y, 0);
  close(m); m.advance(1000, { right: true }, { left: true });
  assert.ok(Math.abs(m.fighters[0].x - m.fighters[1].x) >= 55.9);
});
test('a light strike hits once per button press and cannot reach across the stage', () => {
  const m = fight(); attack(m, 'light'); assert.equal(m.fighters[1].hp, 100);
  m.advance(500); close(m); attack(m, 'light');
  assert.equal(m.fighters[1].hp, 92);
  m.advance(1200, { light: true });
  const hp = m.fighters[1].hp;
  m.advance(1200, { light: true });
  assert.equal(m.fighters[1].hp, hp);
});
test('holding back allows retreat, backward jumps and backward dashes', () => {
  const m = fight();
  m.advance(300, { left: true }, { right: true });
  assert.ok(m.fighters[0].x < 250);
  assert.ok(m.fighters[1].x > 710);
  m.advance(100, { left: true, jump: true });
  assert.ok(m.fighters[0].y > 0);
  m.advance(1200);
  m.fighters[0].x = 400;
  const before = m.fighters[0].x;
  m.advance(100, { left: true, dash: true });
  assert.ok(m.fighters[0].x < before - 35);
});
test('guard prevents normal damage and throws beat guard', () => {
  const m = fight(); close(m);
  attack(m, 'heavy', { guard: true });
  assert.equal(m.fighters[1].hp, 100);
  m.advance(600); close(m);
  attack(m, 'throw', { guard: true });
  assert.equal(m.fighters[1].hp, 82);
});
test('energy gates specials, projectiles spend energy and hit or clash', () => {
  const m = fight();
  m.fighters[0].energy = 0; attack(m, 'special');
  assert.equal(m.fighters[0].attack, null);
  m.advance(700); m.fighters[0].energy = 100;
  m.advance(10, { wave: true }); m.advance(140);
  assert.equal(m.fighters[0].energy, 80);
  assert.equal(m.waves.length, 1);
  m.advance(1500); assert.ok(m.fighters[1].hp < 100);
  const clash = fight(); clash.fighters.forEach(f => f.energy = 100);
  clash.advance(10, { wave: true }, { wave: true }); clash.advance(1500);
  assert.equal(clash.fighters[0].hp, 100);
  assert.equal(clash.fighters[1].hp, 100);
  assert.equal(clash.waves.length, 0);
});
test('pause freezes every combat timer and release clears held attacks', () => {
  const m = fight(); close(m); m.advance(10, { heavy: true });
  m.setPaused(true);
  const before = JSON.stringify(m.fighters); const time = m.remaining;
  m.advance(2000, { right: true });
  assert.equal(JSON.stringify(m.fighters), before); assert.equal(m.remaining, time);
  m.setPaused(false); m.advance(600);
  assert.ok(m.fighters[1].hp < 100);
});
test('KO awards one point; next round resets combat and two wins finish the match', () => {
  const m = fight(); close(m); m.fighters[1].hp = 1;
  attack(m, 'light'); assert.equal(m.phase, 'roundOver'); assert.deepEqual(m.wins, [1, 0]);
  m.advance(1000); assert.deepEqual(m.wins, [1, 0]);
  m.nextRound(); assert.equal(m.fighters[1].hp, 100); assert.deepEqual(m.wins, [1, 0]);
  m.advance(1000); close(m); m.fighters[1].hp = 1;
  attack(m, 'light'); assert.equal(m.phase, 'finished'); assert.deepEqual(m.wins, [2, 0]);
});
test('time over compares HP; draws replay the same round without a point', () => {
  const m = fight(); m.remaining = 10; m.advance(10);
  assert.equal(m.winner, -1); assert.deepEqual(m.wins, [0, 0]);
  m.advance(1000); m.nextRound(); assert.equal(m.round, 1);
  m.advance(1000); m.remaining = 10; m.fighters[0].hp = 90; m.advance(10);
  assert.equal(m.winner, 1); assert.deepEqual(m.wins, [0, 1]);
});
test('AI closes distance and lands real attacks', () => {
  const m = fight({ mode: 'cpu', seed: 27 });
  for (let i = 0; i < 2000 && m.phase === 'fighting'; i++) m.advance(10);
  assert.ok(m.fighters[0].hp < 100);
});
test('Soyo has her own identity and a stationary long-range anti-air special', () => {
  assert.equal(ROSTER[1].skill, '回响终章');
  const m = fight({ characters: [1, 0] });
  m.fighters[0].x = 400; m.fighters[1].x = 610;
  m.fighters[0].energy = 100;
  m.advance(10, { special: true });
  for (let i = 0; i < 32; i++) {
    m.fighters[1].y = 150; m.fighters[1].vy = 0;
    m.advance(10);
  }
  assert.equal(m.fighters[0].x, 400);
  assert.equal(m.fighters[1].hp, 76);
  const anon = fight({ characters: [0, 1] });
  anon.fighters[0].energy = 100;
  anon.advance(10, { special: true }); anon.advance(200);
  assert.ok(anon.fighters[0].x > 300);
});
test('selected characters survive round transitions and match restarts', () => {
  const m = fight({ characters: [1, 0] }); close(m); m.fighters[1].hp = 1;
  attack(m, 'light'); m.advance(1000); m.nextRound();
  assert.deepEqual(m.fighters.map(f => f.character), [1, 0]);
  m.restart(); assert.deepEqual(m.fighters.map(f => f.character), [1, 0]);
});
