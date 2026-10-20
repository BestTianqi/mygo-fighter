const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, MOVES, ROSTER, moveList, MAX_HEALTH } = require('../src/engine.js');
const { createAnimator } = require('../src/animation.js');
function fight(characters = [4, 0], options = {}) {
  const m = new Match({ mode: 'duel', characters, ...options }); m.start(); m.advance(1000);
  m.fighters.forEach((f, i) => { f.energy = 100; f.x = 300 + i * 130; }); return m;
}
test('all characters start and reset at 200 HP; Soyo healing caps at 200', () => {
  assert.equal(MAX_HEALTH, 200);
  for (let c = 0; c <= 4; c++) {
    const m = fight([c, 3]); assert.ok(m.fighters.every(f => f.hp === 200));
    m.hit(0, 'heavy'); assert.equal(m.fighters[1].hp, 200 - ROSTER[c].heavyDamage);
    m.restart(); assert.ok(m.fighters.every(f => f.hp === 200));
  }
  const s = fight([1, 0]); s.fighters[0].hp = 195;
  s.advance(10, { heal: true }); s.advance(800); assert.equal(s.fighters[0].hp, 200);
  s.advance(1300); s.fighters[0].energy = 100; s.fighters[0].healCooldown = 0;
  s.advance(10, { heal: true }); assert.equal(s.fighters[0].attack, null);
});
test('Riki has 18 stance normals, eight skills and her own three-hit chain', () => {
  assert.equal(moveList(4).filter(m => m.category === 'normal').length, 18);
  for (const key of ['rikiRoll', 'rikiRush', 'rikiOverhead', 'rikiShock', 'rikiRise', 'rikiCalibrate', 'rikiEight', 'rikiSuper']) {
    assert.ok(moveList(4).some(m => m.key === key));
    for (const c of [0, 1, 2, 3]) assert.ok(!moveList(c).some(m => m.key === key));
  }
  const m = fight(); m.fighters[1].x = 1500;
  m.advance(10, { light: true }); m.advance(130); m.advance(10, { light: true });
  assert.equal(m.fighters[0].attack, 'rikiJab2'); m.advance(150); m.advance(10, { light: true });
  assert.equal(m.fighters[0].attack, 'rikiJab3');
});
test('only real normal hits add one beat each; guard, whiff and specials add none', () => {
  const m = fight(), a = m.fighters[0];
  m.advance(10, { light: true }); m.advance(200); assert.equal(a.beats, 1);
  m.advance(120); m.advance(10, { light: true }); m.advance(250); assert.equal(a.beats, 2);
  const g = fight(); g.advance(10, { heavy: true }, { guard: true }); g.advance(800, {}, { guard: true });
  assert.equal(g.fighters[0].beats, 0);
  const r = fight(); r.advance(10, { wave: true }); r.advance(1800); assert.equal(r.fighters[0].beats, 0);
  assert.equal(r.drainEvents().filter(e => e.type === 'hit').length, 3);
});
test('four beats are spent only by a legal enhanced special, independently for both Rikis', () => {
  const m = fight([4, 4]); m.fighters.forEach(f => f.beats = 4);
  m.fighters[0].energy = 14; m.advance(10, { thrust: true }); assert.equal(m.fighters[0].beats, 4);
  m.fighters[0].energy = 100; m.advance(10); m.advance(10, { thrust: true }, { wave: true });
  assert.equal(m.fighters[0].attack, 'rikiRushBoost'); assert.equal(m.fighters[1].attack, 'rikiRollBoost');
  assert.ok(m.fighters.every(f => f.beats === 0));
  const air = fight(); air.fighters[0].beats = 4; air.fighters[0].y = 180;
  air.advance(10, { sonic: true }); assert.equal(air.fighters[0].beats, 4); assert.equal(air.fighters[0].energy, 100);
});
test('simultaneously traded normals award a beat to both Rikis', () => {
  const m = fight([4, 4]); m.advance(10, { light: true }, { light: true }); m.advance(100);
  assert.deepEqual(m.fighters.map(f => f.hp), [193, 193]);
  assert.deepEqual(m.fighters.map(f => f.beats), [1, 1]);
});
test('calibration costs 25, adds two beats after 300ms, has cooldown and can be interrupted', () => {
  const m = fight(), a = m.fighters[0]; m.fighters[1].x = 1200;
  m.advance(10, { heal: true }); assert.equal(a.energy, 75); m.advance(290); assert.equal(a.beats, 0);
  m.advance(10); assert.equal(a.beats, 2); assert.ok(a.calibrateCooldown > 7000);
  m.advance(800); m.advance(10, { heal: true }); assert.equal(a.attack, null);
  const n = fight(); n.advance(10, { heal: true }); n.advance(100); n.hit(1, 'heavy'); n.advance(1000);
  assert.equal(n.fighters[0].beats, 0); assert.ok(n.fighters[0].calibrateCooldown > 0);
});
test('overhead beats crouch guard, ground shock and enhanced second wave are real projectiles', () => {
  for (const crouch of [false, true]) {
    const m = fight(); m.advance(10, { shield: true }, { guard: true, crouch }); m.advance(900, {}, { guard: true, crouch });
    assert.equal(m.fighters[1].hp < 190, crouch);
  }
  const s = fight(); s.fighters[0].beats = 4; s.fighters[1].x = 1500;
  s.advance(10, { sonic: true }); s.advance(500); assert.equal(s.waves.length, 2);
  assert.deepEqual(s.waves.map(w => MOVES[w.attack].damage), [18, 8]);
});
test('eight-beat roll and super have eight/three hits, are guardable and stop on interruption', () => {
  for (const [input, attack, count] of [['special', 'rikiEight', 8], ['super', 'rikiSuper', 3]]) {
    const m = fight(); m.advance(10, { [input]: true }); m.advance(3500);
    assert.equal(m.drainEvents().filter(e => e.type === 'hit' && e.attack === attack).length, count);
    const g = fight(); g.advance(10, { [input]: true }, { guard: true }); g.advance(3500, {}, { guard: true });
    assert.ok(g.drainEvents().filter(e => e.type === 'hit').every(e => e.blocked));
  }
  const m = fight(); m.advance(10, { special: true }); m.advance(300); m.hit(1, 'heavy'); m.drainEvents(); m.advance(2000);
  assert.ok(!m.drainEvents().some(e => e.type === 'hit' && e.side === 0));
});
test('Riki uses distinct stick combo/skill poses and pause/reset freezes or clears beat state', () => {
  const m = fight(), f = m.fighters[0], choose = createAnimator(), poses = [];
  for (const attack of ['riki_light', 'rikiJab2', 'rikiJab3']) { f.attack = attack; f.attackMs = MOVES[attack].start; poses.push(choose(m, 0)); }
  assert.equal(new Set(poses).size, 3);
  for (const [attack, pose] of [['rikiRoll', 'roll-release'], ['rikiRush', 'rush-impact'], ['rikiOverhead', 'overhead-impact'], ['rikiShock', 'ground-shock'], ['rikiRise', 'uppercut-impact'], ['rikiEight', 'eight-beat-release'], ['rikiSuper', 'super-release']]) {
    f.attack = attack; f.attackMs = MOVES[attack].start; assert.equal(choose(m, 0), pose);
  }
  f.beats = 4; f.calibrateCooldown = 3000; m.setPaused(true); const state = JSON.stringify(f); m.advance(1000);
  assert.equal(JSON.stringify(f), state); m.restart(); assert.equal(m.fighters[0].beats, 0); assert.equal(m.fighters[0].calibrateCooldown, 0);
});
