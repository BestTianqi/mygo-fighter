const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, MOVES, moveList } = require('../src/engine.js');
function setup(characters = [0, 1]) {
  const m = new Match({ mode: 'duel', characters }); m.start(); m.advance(1000);
  m.fighters[0].x = 280; m.fighters[1].x = 620; return m;
}
function cast(m, side = 0) {
  m.fighters[side].energy = 30;
  m.advance(10, side ? {} : { sonic: true }, side ? { sonic: true } : {});
}
test('TGW is an Anon ground special costing 30 and appears in the command list', () => {
  assert.equal(MOVES.sonic?.cost, 30);
  const m = setup(); cast(m);
  assert.equal(m.fighters[0].attack, 'sonic'); assert.equal(m.fighters[0].energy, 0);
  assert.ok(moveList(0).some(m => m.key === 'sonic' && m.command === 'T' && m.name.includes('TGW')));
  assert.ok(!moveList(1).some(m => m.key === 'sonic'));
  for (const [character, energy, y] of [[0, 29, 0], [0, 30, 80], [1, 30, 0]]) {
    const n = setup([character, 0]); Object.assign(n.fighters[0], { energy, y });
    n.advance(10, { sonic: true }); assert.equal(n.fighters[0].attack, null);
  }
});
test('one expanding sonic wave travels forward, hits once and pushes on either side', () => {
  for (const side of [0, 1]) {
    const m = setup([0, 0]); const target = m.fighters[1 - side]; const before = target.x;
    cast(m, side); m.advance(200);
    assert.equal(m.waves.length, 1); const width = m.waves[0].rx;
    assert.equal(Math.sign(m.waves[0].vx), side ? -1 : 1);
    m.advance(100); assert.ok(m.waves[0].rx > width);
    m.advance(800);
    assert.equal(target.hp, 78); assert.ok(side ? target.x < before : target.x > before);
    assert.equal(m.drainEvents().filter(e => e.type === 'hit' && e.attack === 'sonic').length, 1);
    assert.equal(m.waves.length, 0); assert.equal(m.fighters[side].attack, null);
  }
});
test('TGW can be guarded, absorbed by steel, and cancelled by an opposing projectile', () => {
  const m = setup(); cast(m); m.advance(1000, {}, { guard: true });
  assert.equal(m.fighters[1].hp, 97);
  const n = setup([0, 0]); n.fighters[1].energy = 20;
  n.advance(10, {}, { shield: true }); n.advance(450); cast(n); n.advance(1000);
  assert.equal(n.fighters[1].hp, 100); assert.equal(n.fighters[1].shield.hp, 18);
  const clash = setup(); clash.fighters[0].energy = 30; clash.fighters[1].energy = 20;
  clash.advance(10, { sonic: true }, { wave: true }); clash.advance(900);
  assert.equal(clash.fighters[0].hp, 100); assert.equal(clash.fighters[1].hp, 100);
  assert.equal(clash.waves.length, 0); assert.ok(clash.drainEvents().some(e => e.type === 'clash'));
});
test('sonic has finite range, recovers on whiff, freezes with pause and clears on restart', () => {
  const m = setup(); m.fighters[0].x = 50; m.fighters[1].x = 900; cast(m); m.advance(220);
  m.setPaused(true); const before = JSON.stringify(m.waves); m.advance(2000);
  assert.equal(JSON.stringify(m.waves), before);
  m.setPaused(false); m.advance(1300);
  assert.equal(m.fighters[1].hp, 100); assert.equal(m.waves.length, 0);
  assert.equal(m.fighters[0].attack, null);
  cast(m); m.advance(200); assert.equal(m.waves.length, 1);
  m.restart(); assert.equal(m.waves.length, 0); assert.equal(m.fighters[0].attack, null);
});
test('jumping with steel still intercepts the overlapping height of an expanded TGW wave', () => {
  const m = setup([0, 0]); m.fighters[1].energy = 20;
  m.advance(10, {}, { shield: true }); m.advance(450);
  cast(m); m.advance(250); m.advance(10, {}, { jump: true }); m.advance(650);
  assert.equal(m.fighters[1].hp, 100); assert.equal(m.fighters[1].shield.hp, 18);
  assert.ok(m.drainEvents().some(e => e.type === 'shieldHit' && e.absorbed === 22));
});
