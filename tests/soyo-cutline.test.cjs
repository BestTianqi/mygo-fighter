const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, MOVES, moveList } = require('../src/engine.js');
const { resolveSkill, schemeFor, bindingList } = require('../src/controls.js');
const { createAnimator } = require('../src/animation.js');

function fight(characters = [1, 0]) {
  const m = new Match({ mode: 'duel', characters }); m.start(); m.advance(1000);
  m.fighters.forEach((f, i) => { f.x = 420 + i * 280; f.energy = 100; });
  return m;
}
const cast = (m, side = 0) => m.advance(10, side === 0 ? { unified: true, right: true, skill2: true } : {}, side === 1 ? { unified: true, left: true, skill2: true } : {});

test('Soyo forward I selects cutline in either direction and retains base I and down I heal', () => {
  for (const facing of [-1, 1]) {
    const f = { character: 1, facing };
    assert.equal(resolveSkill(f, { left: facing < 0, right: facing > 0 }, k => k === 'skill2', false), 'soyoCutline');
    assert.equal(resolveSkill(f, {}, k => k === 'skill2', false), 'wave');
    assert.equal(resolveSkill(f, { crouch: true, right: true }, k => k === 'skill2', false), 'heal');
  }
  assert.deepEqual(schemeFor({ character: 1 }).base, ['summon', 'wave', 'special']);
  assert.ok(bindingList({ character: 1 }).some(row => row.move === 'soyoCutline' && row.key === '前＋I' && row.key2 === '前＋5'));
  assert.equal(moveList(1).find(move => move.key === 'soyoCutline')?.name, '剪切线');
});

for (const side of [0, 1]) test(`player ${side + 1} spends 25 energy for exactly two forward cuts and a final push`, () => {
  const m = fight(side ? [0, 1] : [1, 0]), a = m.fighters[side], b = m.fighters[1 - side];
  cast(m, side); assert.equal(a.attack, 'soyoCutline'); assert.equal(a.energy, 75);
  m.advance(170); assert.equal(b.hp, 200);
  m.advance(700);
  const hits = m.drainEvents().filter(e => e.type === 'hit' && e.attack === 'soyoCutline');
  assert.equal(hits.length, 2); assert.deepEqual(hits.map(e => e.damage), [9, 10]);
  assert.equal(b.hp, 181); assert.ok((b.x - a.x) * a.facing > 280);
  assert.equal(m.waves.length, 0);
});

test('cutline rejects insufficient energy, airborne casting and every other character', () => {
  for (const setup of [f => f.energy = 24, f => { f.y = 200; f.vy = 100; }]) {
    const m = fight(), a = m.fighters[0]; setup(a); const energy = a.energy;
    cast(m); assert.equal(a.attack, null); assert.equal(a.energy, energy);
  }
  for (let character = 0; character < 15; character++) if (character !== 1) {
    const m = fight([character, 0]); m.advance(10, { soyoCutline: true });
    assert.equal(m.fighters[0].attack, null); assert.equal(m.fighters[0].energy, 100);
    assert.ok(!moveList(character).some(move => move.key === 'soyoCutline'));
  }
});

test('cutline has bounded forward and vertical reach, respects guard and steel', () => {
  for (const position of ['behind', 'far', 'above']) {
    const m = fight(), a = m.fighters[0], b = m.fighters[1]; cast(m);
    if (position === 'behind') b.x = a.x - 280;
    if (position === 'far') b.x = a.x + 500;
    if (position === 'above') { b.y = 500; b.vy = 800; }
    m.advance(850); assert.equal(b.hp, 200, position);
  }
  const guard = fight(); cast(guard); guard.advance(850, {}, { guard: true });
  assert.equal(guard.fighters[1].hp, 198);
  const steel = fight(); steel.fighters[1].shield = { hp: 40, ms: 5000, hitMs: 0 };
  cast(steel); steel.advance(850);
  assert.equal(steel.fighters[1].hp, 200); assert.equal(steel.fighters[1].shield.hp, 20);
});

test('a hit interrupts cutline, pause freezes it, and round cleanup prevents late cuts', () => {
  const m = fight(), a = m.fighters[0]; cast(m); assert.equal(a.attack, 'soyoCutline'); m.advance(60);
  m.setPaused(true); const state = JSON.stringify(m.fighters); m.advance(1000);
  assert.equal(JSON.stringify(m.fighters), state); m.setPaused(false);
  m.hit(1, 'light'); assert.equal(a.attack, null); const hp = m.fighters[1].hp;
  m.advance(900); assert.equal(m.fighters[1].hp, hp);
  const n = fight(); cast(n); n.fighters[0].hp = 0; n.advance(10); n.advance(1000);
  assert.equal(n.fighters[1].hp, 200);
});

test('cutline damages enemy summons with both cuts but leaves friendly summons intact', () => {
  const m = fight([1, 1]);
  for (const f of m.fighters) f.summons = { ms: 5000, bornAt: m.elapsed, units: [{ id: 1, hp: 20, maxHp: 20, called: true, x: f.x, y: 8, phase: 'follow', cooldown: 5000, hitMs: 0 }] };
  cast(m); m.advance(850);
  assert.equal(m.fighters[1].summons, null);
  assert.equal(m.fighters[0].summons.units[0].hp, 20);
  assert.equal(m.drainEvents().filter(e => e.type === 'minionHit').length, 2);
});

test('CPU Soyo selects cutline at medium range when she has enough energy', () => {
  const m = fight([0, 1]); m.options.mode = 'cpu'; m.fighters[1].energy = 40; m.aiThink = 0;
  m.advance(10); assert.equal(m.fighters[1].attack, 'soyoCutline');
  m.advance(850); assert.equal(m.fighters[0].hp, 181);
});

test('cutline uses windup, two different existing hand poses, then recovery', () => {
  const m = fight(), f = m.fighters[0], animate = createAnimator(); cast(m);
  for (const [time, pose] of [[0, 'normal-windup'], [180, 'jab-2-impact'], [360, 'palm-heavy'], [650, 'normal-recover']]) {
    f.attackMs = time; assert.equal(animate(m, 0), pose);
  }
  f.attack = null; f.stun = 100; assert.equal(animate(m, 0), 'hit-high');
});
