const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, MOVES, moveList } = require('../src/engine.js');
function fight(characters = [1, 0], options = {}) {
  const m = new Match({ mode: 'duel', characters, ...options }); m.start(); m.advance(1000);
  m.fighters[0].energy = m.fighters[1].energy = 100; return m;
}
function summon(m, side = 0) {
  const inputs = [{}, {}]; inputs[side] = { sonic: true };
  m.advance(10, ...inputs); m.advance(220);
  assert.equal(m.fighters[side].summons?.units.length, 3);
  return m.fighters[side].summons;
}
test('Soyo T costs 50 and summons exactly three units, while Anon T remains TGW', () => {
  const m = fight(), group = summon(m);
  assert.equal(m.fighters[0].energy, 50); assert.equal(m.fighters[1].hp, 200);
  assert.equal(group.ms, 10000); assert.equal(MOVES.summon.cost, 50);
  assert.ok(moveList(1).some(m => m.key === 'summon'));
  assert.ok(!moveList(0).some(m => m.key === 'summon'));
  assert.ok(!moveList(1).some(m => m.key === 'tensoraHit'));
  const a = fight([0, 1]); a.advance(10, { sonic: true }); assert.equal(a.fighters[0].attack, 'sonic');
});
test('summoning requires ground, enough energy and Soyo, and startup can be interrupted', () => {
  for (const setup of [a => a.energy = 49, a => { a.y = 100; a.vy = 0; }]) {
    const m = fight(); setup(m.fighters[0]); m.advance(10, { sonic: true }); m.advance(400);
    assert.equal(m.fighters[0].summons, null);
  }
  const n = fight([0, 1]); n.advance(10, { summon: true }); n.advance(400); assert.equal(n.fighters[0].summons, null);
  const m = fight(); m.fighters[0].x = 420; m.fighters[1].x = 485;
  m.advance(10, { sonic: true }, { light: true }); m.advance(500);
  assert.equal(m.fighters[0].summons, null); assert.equal(m.fighters[0].energy, 58);
});
test('the group lasts ten active combat seconds and cannot be stacked or refreshed while active', () => {
  const m = fight(); m.fighters[1].knockdown = 20000;
  const group = summon(m); m.advance(1000); m.fighters[0].energy = 100;
  m.advance(10, { sonic: true }); assert.equal(m.fighters[0].energy, 100);
  assert.equal(m.fighters[0].summons, group); assert.equal(group.units.length, 3);
  m.advance(group.ms - 10); assert.ok(m.fighters[0].summons); m.advance(10);
  assert.equal(m.fighters[0].summons, null);
});
test('all three independently strike the opponent without hurting their owner or farming owner energy', () => {
  const m = fight(); summon(m); m.advance(5000);
  assert.ok(m.fighters[1].hp < 200); assert.equal(m.fighters[0].hp, 200); assert.equal(m.fighters[0].energy, 50);
  const strikes = m.drainEvents().filter(e => e.type === 'minionStrike');
  assert.deepEqual([...new Set(strikes.map(e => e.unit))].sort(), [0, 1, 2]);
});
test('standing and crouching guard stop the rush damage except one chip per hit', () => {
  for (const crouch of [false, true]) {
    const m = fight(); summon(m);
    m.advance(3000, {}, { guard: true, crouch });
    const hits = m.drainEvents().filter(e => e.type === 'hit' && e.attack === 'tensoraHit');
    assert.ok(hits.length > 0); assert.ok(hits.every(e => e.blocked && e.damage === 1));
    assert.equal(m.fighters[1].hp, 200 - hits.length);
  }
});
test('Anon steel intercepts frontal minion strikes with real durability loss', () => {
  const m = fight(); m.advance(10, {}, { shield: true }); m.advance(500); summon(m);
  m.advance(1300);
  assert.equal(m.fighters[1].hp, 200); assert.ok(m.fighters[1].shield.hp < 40);
  assert.ok(m.drainEvents().some(e => e.type === 'shieldHit'));
});
test('pause freezes all minion timers and positions; restart and round result clear them', () => {
  const m = fight(); summon(m); m.advance(600); m.setPaused(true);
  const before = JSON.stringify(m.fighters); m.advance(3000); assert.equal(JSON.stringify(m.fighters), before);
  m.setPaused(false); m.advance(10); assert.notEqual(JSON.stringify(m.fighters), before);
  m.restart(); assert.equal(m.fighters[0].summons, null); m.advance(1000); m.fighters[0].energy = 100;
  summon(m); m.fighters[1].hp = 0; m.advance(10);
  assert.equal(m.phase, 'roundOver'); assert.equal(m.fighters[0].summons, null);
});
test('both players can own three units independently, including on platforms', () => {
  const m = fight([1, 1], { terrain: { platforms: [{ left: 200, right: 760, height: 64 }] } });
  m.fighters.forEach(f => f.y = 64); summon(m); summon(m, 1);
  assert.equal(m.fighters[0].summons.units.length + m.fighters[1].summons.units.length, 6);
  assert.notEqual(m.fighters[0].summons, m.fighters[1].summons);
  m.advance(1000); assert.ok(m.fighters[0].summons.units.some(p => p.y > 40));
});
test('CPU Soyo can invoke the new summon through normal game input', () => {
  const m = fight([0, 1], { mode: 'cpu', difficulty: 2 }); m.aiThink = 0;
  m.advance(800); assert.equal(m.fighters[1].summons?.units.length, 3);
});
