const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, MOVES, moveList } = require('../src/engine.js');
function setup(characters = [0, 1]) {
  const m = new Match({ mode: 'duel', characters }); m.start(); m.advance(1000);
  m.fighters[0].x = 420; m.fighters[1].x = 520; return m;
}
function summon(m) {
  m.fighters[0].energy = 100; m.advance(10, { shield: true }); m.advance(110);
  assert.ok(m.fighters[0].shield, 'steel plate must appear after its startup');
}
test('steel shield costs 20, belongs to Anon, requires ground, and does not attack', () => {
  assert.equal(MOVES.shield?.cost, 20);
  const m = setup(); m.fighters[0].energy = 20; m.advance(10, { shield: true });
  assert.equal(m.fighters[0].energy, 0); m.advance(110);
  assert.equal(m.fighters[0].shield.hp, 40); assert.equal(m.fighters[1].hp, 100);
  assert.equal(moveList(0).find(m => m.key === 'shield').command, 'U');
  assert.ok(!moveList(1).some(m => m.key === 'shield'));
  assert.ok(moveList(0).find(m => m.key === 'throw').command.includes('B'));
  for (const [energy, y] of [[19, 0], [100, 80]]) {
    const n = setup(); Object.assign(n.fighters[0], { energy, y }); n.advance(10, { shield: true });
    assert.equal(n.fighters[0].attack, null); assert.equal(n.fighters[0].shield, null);
  }
  const soyo = setup([1, 0]); soyo.advance(10, { shield: true });
  assert.equal(soyo.fighters[0].attack, 'throw', 'Soyo keeps her original U throw');
});
test('plate absorbs frontal strikes with durability, breaks, and passes excess damage to HP', () => {
  const m = setup(); summon(m);
  m.hit(1, 'heavy'); assert.equal(m.fighters[0].hp, 100); assert.equal(m.fighters[0].shield.hp, 24);
  m.hit(1, 'special'); assert.equal(m.fighters[0].hp, 100); assert.equal(m.fighters[0].shield, null);
  m.hit(1, 'light'); assert.equal(m.fighters[0].hp, 92);
  const shieldEvents = m.drainEvents().filter(e => e.type === 'shieldHit');
  assert.deepEqual(shieldEvents.map(e => e.absorbed), [16, 24]);
  assert.equal(shieldEvents[1].broken, true);
  const n = setup(); summon(n); n.fighters[0].shield.hp = 10;
  n.hit(1, 'special'); assert.equal(n.fighters[0].hp, 86); assert.equal(n.fighters[0].shield, null);
});
test('front plate intercepts real projectiles but throws and rear attacks bypass it', () => {
  const m = setup(); m.fighters[1].x = 620; summon(m);
  m.spawnWave(1); m.advance(500);
  assert.equal(m.fighters[0].hp, 100); assert.equal(m.fighters[0].shield.hp, 26); assert.equal(m.waves.length, 0);
  for (const attack of ['heavy', 'throw']) {
    const n = setup(); summon(n);
    if (attack === 'heavy') n.fighters[1].x = 300;
    n.hit(1, attack);
    assert.equal(n.fighters[0].hp, attack === 'heavy' ? 84 : 82);
    assert.equal(n.fighters[0].shield.hp, 40);
  }
});
test('guard chip after steel breaks cannot exceed the damage left over', () => {
  const m = setup(); summon(m); m.advance(500); m.fighters[0].shield.hp = 23;
  m.advance(10, { guard: true }); m.hit(1, 'special');
  assert.equal(m.fighters[0].shield, null); assert.equal(m.fighters[0].hp, 99);
});
test('shield can stay up while acting, refreshes without stacking, freezes on pause and resets', () => {
  const m = setup(); m.fighters[1].x = 850; summon(m); m.advance(400);
  m.advance(10, { medium: true }); assert.equal(m.fighters[0].attack, 'medium');
  assert.ok(m.fighters[0].shield);
  m.advance(500); m.fighters[0].shield.hp = 5;
  m.advance(10, { shield: true }); assert.equal(m.fighters[0].energy, 60);
  m.advance(110); assert.equal(m.fighters[0].shield.hp, 40);
  m.setPaused(true); const before = JSON.stringify(m.fighters[0].shield);
  m.advance(4000); assert.equal(JSON.stringify(m.fighters[0].shield), before);
  m.setPaused(false); m.advance(3100); assert.equal(m.fighters[0].shield, null);
  summon(m); m.restart(); assert.equal(m.fighters[0].shield, null);
});
