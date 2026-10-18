const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, MOVES, moveList } = require('../src/engine.js');
const { createAnimator } = require('../src/animation.js');
function fight(characters = [1, 0], options = {}) {
  const m = new Match({ mode: 'duel', characters, ...options }); m.start(); m.advance(1000);
  m.fighters.forEach(f => { f.energy = 100; }); m.fighters[0].hp = 50;
  return m;
}
test('Soyo self heal spends 35, channels before restoring 24 and never damages the opponent', () => {
  const m = fight(), a = m.fighters[0]; m.advance(10, { heal: true });
  assert.equal(a.attack, 'heal'); assert.equal(a.energy, 65); assert.equal(a.healCooldown, 12000);
  m.advance(690); assert.equal(a.hp, 50); m.advance(10); assert.equal(a.hp, 74);
  m.advance(700); assert.equal(a.hp, 74); assert.equal(m.fighters[1].hp, 100);
  const events = m.drainEvents().filter(e => e.type === 'heal');
  assert.deepEqual(events, [{ type: 'heal', side: 0, amount: 24 }]);
  assert.ok(moveList(1).some(m => m.key === 'heal')); assert.ok(!moveList(0).some(m => m.key === 'heal'));
});
test('heal caps health, rejects full health, insufficient energy, airborne and non-Soyo casts', () => {
  const cap = fight(); cap.fighters[0].hp = 94; cap.advance(10, { heal: true }); cap.advance(800);
  assert.equal(cap.fighters[0].hp, 100); assert.equal(cap.drainEvents().find(e => e.type === 'heal').amount, 6);
  for (const setup of [a => a.hp = 100, a => a.energy = 34, a => { a.y = 110; a.vy = 0; }, a => a.character = 0]) {
    const m = fight(), a = m.fighters[0]; setup(a); const energy = a.energy, hp = a.hp;
    m.advance(10, { heal: true }); assert.equal(a.attack, null); assert.equal(a.energy, energy);
    assert.equal(a.hp, hp); assert.equal(a.healCooldown, 0);
  }
});
test('incoming hits interrupt channel and spend the cost without granting delayed healing or invulnerability', () => {
  const m = fight(), a = m.fighters[0]; a.x = 420; m.fighters[1].x = 485;
  m.advance(10, { heal: true }, { light: true }); m.advance(1000);
  assert.equal(a.hp, 40); assert.ok(a.healCooldown > 0); assert.equal(a.attack, null); // Startup takes the existing counter-hit bonus.
  assert.ok(!m.drainEvents().some(e => e.type === 'heal'));
});
test('independent cooldown forbids repeat heals even with practice energy recovery', () => {
  const m = fight([1, 0], { mode: 'practice' }), a = m.fighters[0];
  m.advance(10, { heal: true }); m.advance(1400); assert.equal(a.energy, 100);
  m.advance(10, { heal: true }); assert.equal(a.attack, null); assert.equal(a.hp, 74);
  m.advance(a.healCooldown + 150); m.advance(10, { heal: true }); m.advance(700);
  assert.equal(a.hp, 98);
});
test('pause freezes cast and cooldown, restart clears them, and a lost round cannot heal afterward', () => {
  const m = fight(), a = m.fighters[0]; m.advance(10, { heal: true }); m.advance(300); m.setPaused(true);
  const before = JSON.stringify(a); m.advance(3000); assert.equal(JSON.stringify(a), before);
  m.setPaused(false); a.hp = 0; m.advance(10); assert.equal(m.phase, 'roundOver');
  m.advance(2000); assert.equal(a.hp, 0); assert.ok(!m.drainEvents().some(e => e.type === 'heal'));
  m.restart(); assert.equal(m.fighters[0].healCooldown, 0); assert.equal(m.fighters[0].attack, null);
});
test('both players can heal independently while standing on raised platforms', () => {
  const m = fight([1, 1], { terrain: { platforms: [{ left: 200, right: 760, height: 64 }] } });
  m.fighters.forEach(f => { f.y = 64; f.hp = 40; });
  m.advance(10, { heal: true }, { heal: true }); m.advance(700);
  assert.deepEqual(m.fighters.map(f => f.hp), [64, 64]); assert.ok(m.fighters.every(f => m.grounded(f)));
});
test('CPU heals when wounded at distance and keeps attacking at full health or on cooldown', () => {
  const m = fight([0, 1], { mode: 'cpu' }), a = m.fighters[1]; a.hp = 45; m.aiThink = 0;
  m.advance(10); assert.equal(a.attack, 'heal'); m.advance(800); assert.equal(a.hp, 69);
  const n = fight([0, 1], { mode: 'cpu' }); n.aiThink = 0; n.advance(10);
  assert.notEqual(n.fighters[1].attack, 'heal');
  const c = fight([0, 1], { mode: 'cpu' }); c.fighters[1].hp = 30; c.fighters[1].healCooldown = 4000;
  c.aiThink = 0; c.advance(10); assert.notEqual(c.fighters[1].attack, 'heal');
});
test('Soyo heal has four distinct timed drawings and is replaced immediately by a hit reaction', () => {
  const m = fight(), a = m.fighters[0], choose = createAnimator(); m.advance(10, { heal: true });
  for (const [ms, pose] of [[0, 'heal-prepare'], [250, 'heal-channel'], [710, 'heal-release'], [1000, 'heal-recover']]) {
    a.attackMs = ms; assert.equal(choose(m, 0), pose);
  }
  a.stun = 100; a.attack = null; assert.equal(choose(m, 0), 'hit-high');
});
test('Soyo palms, beckoning cast, restrained movement and defense use her dedicated atlas names', () => {
  const m = fight(), a = m.fighters[0], choose = createAnimator(); assert.equal(choose(m, 0), null);
  a.vx = 230; assert.match(choose(m, 0), /^walk-/); a.vx = 0;
  for (const [attack, pose] of [['light','palm-light'],['heavy','palm-heavy'],['special','cast-release'],['summon','cast-release'],['wave','cast-release'],['throw','palm-heavy']]) {
    a.attack = attack; a.attackMs = MOVES[attack].start; assert.equal(choose(m, 0), pose);
    a.attackMs = 0; assert.equal(choose(m, 0), 'normal-windup');
    a.attackMs = MOVES[attack].duration - 10; assert.equal(choose(m, 0), 'normal-recover');
  }
  a.attack = null; a.guard = true; assert.equal(choose(m, 0), 'guard-standing');
  a.crouch = true; assert.equal(choose(m, 0), 'guard-crouch');
});
