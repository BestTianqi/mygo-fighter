const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, MOVES, moveList } = require('../src/engine.js');
const { createAnimator } = require('../src/animation.js');
function fight(characters = [1, 0]) {
  const m = new Match({ mode: 'duel', characters }); m.start(); m.advance(1000);
  m.fighters.forEach((f, i) => { f.energy = 100; f.x = 300 + i * 200; });
  m.drainEvents(); return m;
}
test('Soyo P spends 100 and exposes her named super only in her move list', () => {
  const m = fight(); m.advance(10, { super: true });
  assert.equal(m.fighters[0].attack, 'soyoSuper'); assert.equal(m.fighters[0].energy, 0);
  assert.equal(moveList(1).find(m => m.key === 'soyoSuper').name, '为什么要演奏春日影');
  for (const c of [0, 2, 3]) assert.ok(!moveList(c).some(m => m.key === 'soyoSuper'));
  assert.equal(m.drainEvents().filter(e => e.type === 'attack').length, 1);
});
test('super rejects insufficient energy and airborne casts without spending energy', () => {
  for (const setup of [f => f.energy = 99, f => { f.y = 150; f.vy = 100; }]) {
    const m = fight(), f = m.fighters[0]; setup(f); const energy = f.energy;
    m.advance(10, { super: true }); assert.equal(f.attack, null); assert.equal(f.energy, energy);
  }
});
test('Soyo super controls once without damage, knockdown or energy gain', () => {
  const m = fight(); m.advance(10, { super: true }); m.advance(2800);
  const events = m.drainEvents(), hits = events.filter(e => e.type === 'hit' && e.attack === 'soyoSuper');
  assert.equal(hits.length, 0);
  assert.equal(events.filter(e => e.type === 'hardControl').length, 1);
  assert.equal(m.fighters[1].hp, 200); assert.equal(m.fighters[1].knockdown, 0);
  assert.equal(m.fighters[0].energy, 0); m.advance(1100); assert.equal(m.fighters[0].attack, null);
});
test('super bypasses guard and steel while distant targets remain outside its circle', () => {
  const guarded = fight(); guarded.advance(10, { super: true }, { guard: true });
  guarded.advance(3900, {}, { guard: true });
  const hits = guarded.drainEvents().filter(e => e.type === 'hit' && e.attack === 'soyoSuper');
  assert.equal(hits.length, 0); assert.equal(guarded.fighters[1].hp, 200);
  const shielded = fight(); shielded.fighters[1].shield = { hp: 40, ms: 5000, hitMs: 0 };
  shielded.advance(10, { super: true }); shielded.advance(3900);
  assert.equal(shielded.fighters[1].hp, 200); assert.equal(shielded.fighters[1].shield.hp, 40);
  for (const setup of [f => f.x = 1400, f => { f.x = -400; }, f => { f.y = 700; f.vy = 0; }]) {
    const m = fight(); m.advance(10, { super: true }); setup(m.fighters[1]);
    // Lock a target above the attack for the height case while exercising real hit resolution.
    if (m.fighters[1].y) m.options.terrain = { platforms: [{ left: 480, right: 560, height: 700 }] };
    m.advance(3900); assert.equal(m.fighters[1].hp, 200);
    assert.equal(m.drainEvents().filter(e => e.type === 'hardControl').length, 0);
  }
});
test('startup protects Soyo briefly; after release hits stagger her while her wave persists', () => {
  const m = fight(), f = m.fighters[0]; m.advance(10, { super: true });
  m.hit(1, 'heavy'); assert.equal(f.hp, 200); assert.equal(f.attack, 'soyoSuper');
  m.advance(1100); m.drainEvents(); m.hit(1, 'heavy');
  assert.ok(f.hp < 200); assert.equal(f.attack, null); assert.ok(f.stun); assert.ok(f.soyoSuper?.released); m.advance(3500);
  assert.equal(m.drainEvents().filter(e => e.type === 'hit' && e.side === 0).length, 0);
});
test('pause freezes the cast, restart clears it and 2P can cast independently', () => {
  const m = fight([1, 1]); m.advance(10, { super: true }, { super: true });
  assert.ok(m.fighters.every(f => f.attack === 'soyoSuper' && f.energy === 0));
  m.setPaused(true); const snapshot = JSON.stringify(m.fighters); m.advance(1500);
  assert.equal(JSON.stringify(m.fighters), snapshot); m.setPaused(false); m.restart();
  assert.ok(m.fighters.every(f => !f.attack));
});
test('a confirmed normal can cancel into Soyo super', () => {
  const m = fight(), f = m.fighters[0]; m.fighters[1].x = 400;
  m.advance(10, { light: true }); m.advance(170); m.advance(10, { super: true });
  assert.equal(f.attack, 'soyoSuper'); assert.equal(f.energy, 0);
});
test('Soyo super selects preparation, release and recovery poses', () => {
  const m = fight(), choose = createAnimator(); m.advance(10, { super: true });
  assert.equal(m.fighters[0].attack, 'soyoSuper');
  for (const [t, pose] of [[0, 'normal-windup'], [900, 'cast-release'], [2700, 'normal-recover']]) {
    m.fighters[0].attackMs = t; assert.equal(choose(m, 0), pose);
  }
});
