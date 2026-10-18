const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, MOVES, moveList } = require('../src/engine.js');
function setup(characters = [0, 1]) {
  const m = new Match({ mode: 'duel', characters }); m.start(); m.advance(1000);
  m.fighters[0].x = 400; m.fighters[1].x = 600; m.fighters[0].energy = 100; return m;
}
function until(m, predicate, limit = 2000, p1 = {}, p2 = {}) {
  for (let ms = 0; ms < limit && !predicate(); ms += 10) m.advance(10, p1, p2);
  assert.ok(predicate(), 'expected combat state within the time limit');
}
test('Anon gets three distinct named offensive moves with proper costs and stance restrictions', () => {
  for (const [key, cost] of [['thrust', 15], ['rush', 25], ['dive', 15]]) {
    assert.equal(MOVES[key]?.cost, cost);
    assert.ok(moveList(0).some(m => m.key === key));
    assert.ok(!moveList(1).some(m => m.key === key));
    const soyo = setup([1, 0]); soyo.advance(10, { [key]: true }); assert.equal(soyo.fighters[0].attack, null);
    const lowEnergy = setup(); lowEnergy.fighters[0].energy = cost - 1;
    if (key === 'dive') lowEnergy.fighters[0].y = 120;
    lowEnergy.advance(10, { [key]: true }); assert.equal(lowEnergy.fighters[0].attack, null);
  }
  const ground = setup(); ground.advance(10, { dive: true }); assert.equal(ground.fighters[0].attack, null);
  for (const key of ['thrust', 'rush']) {
    const air = setup(); air.fighters[0].y = 100;
    air.advance(10, { [key]: true }); assert.equal(air.fighters[0].attack, null);
  }
});
test('thrust advances, hits once, and quarter-circle kick works facing either direction', () => {
  const m = setup(); m.advance(10, { thrust: true }); assert.equal(m.fighters[0].energy, 85);
  m.advance(1000); assert.ok(m.fighters[0].x > 450); assert.equal(m.fighters[1].hp, 86);
  assert.equal(m.drainEvents().filter(e => e.type === 'hit' && e.attack === 'thrust').length, 1);
  for (const side of [0, 1]) {
    const n = setup([0, 0]); n.fighters[side].energy = 100; const forward = side ? 'left' : 'right';
    n.advance(60, side ? {} : { crouch: true }, side ? { crouch: true } : {});
    n.advance(60, side ? {} : { crouch: true, [forward]: true }, side ? { crouch: true, [forward]: true } : {});
    n.advance(60, side ? {} : { [forward]: true }, side ? { [forward]: true } : {});
    n.advance(10, side ? {} : { [forward]: true, lightKick: true }, side ? { [forward]: true, lightKick: true } : {});
    assert.equal(n.fighters[side].attack, 'thrust');
  }
});
test('rush lands exactly three real hits; guard and steel can stop all three', () => {
  for (const defense of ['none', 'guard', 'steel']) {
    const m = setup([0, 0]); m.fighters[1].x = 485;
    if (defense === 'steel') { m.fighters[1].energy = 20; m.advance(10, {}, { shield: true }); m.advance(450); }
    m.advance(10, { rush: true }, { guard: defense === 'guard' });
    m.advance(1500, {}, { guard: defense === 'guard' });
    const hits = m.drainEvents().filter(e => e.type === 'hit' && e.attack === 'rush');
    assert.equal(hits.length, defense === 'steel' ? 0 : 3);
    if (defense === 'none') assert.equal(m.fighters[1].hp, 81);
    if (defense === 'guard') assert.equal(m.fighters[1].hp, 91);
    if (defense === 'steel') { assert.equal(m.fighters[1].hp, 100); assert.equal(m.fighters[1].shield.hp, 18); }
    assert.equal(m.fighters[0].attack, null);
  }
});
test('dive descends and hits high, standing guard stops it, crouch guard does not, and landing has recovery', () => {
  for (const crouch of [false, true]) {
    const m = setup(); m.fighters[1].x = 520; Object.assign(m.fighters[0], { y: 150, vy: 0 });
    m.advance(10, { dive: true }, { guard: true, crouch });
    assert.equal(m.fighters[0].attack, 'dive'); assert.ok(m.fighters[0].vy < 0);
    m.advance(500, {}, { guard: true, crouch });
    assert.equal(m.fighters[1].hp, crouch ? 84 : 97); assert.equal(m.fighters[0].y, 0);
  }
  const whiff = setup(); whiff.fighters[1].x = 900; Object.assign(whiff.fighters[0], { y: 70, vy: 0 });
  whiff.advance(10, { dive: true }); until(whiff, () => whiff.fighters[0].y === 0);
  assert.equal(whiff.fighters[0].attack, null); assert.ok(whiff.fighters[0].cooldown >= 200);
  whiff.advance(10, { light: true }); assert.equal(whiff.fighters[0].attack, null);
});
test('confirmed thrust links into rush, rush finisher into super, and whiffs cannot cancel', () => {
  const m = setup(); m.advance(10, { thrust: true });
  until(m, () => m.canCancel(m.fighters[0], 'rush'));
  m.advance(10, { rush: true }); assert.equal(m.fighters[0].attack, 'rush');
  until(m, () => m.fighters[0].attackMs > 130); assert.equal(m.canCancel(m.fighters[0], 'super'), false);
  until(m, () => m.canCancel(m.fighters[0], 'super'));
  m.advance(10, { super: true }); assert.equal(m.fighters[0].attack, 'super');
  const n = setup(); n.fighters[1].x = 900; n.advance(10, { thrust: true }); n.advance(180);
  n.advance(10, { rush: true }); assert.equal(n.fighters[0].attack, 'thrust');
});
test('air normal can confirm into a dive once, while an air whiff cannot', () => {
  for (const contact of [true, false]) {
    const m = setup(); m.fighters[1].x = contact ? 485 : 900; m.fighters[1].y = 130;
    Object.assign(m.fighters[0], { y: 160, vy: 500 }); m.advance(10, { light: true });
    until(m, () => m.fighters[0].attackMs >= 110);
    m.advance(10, { dive: true });
    assert.equal(m.fighters[0].attack, contact ? 'dive' : 'air_light');
  }
});
test('pause freezes a three-hit sequence and reset clears its hit history', () => {
  const m = setup(); m.fighters[1].x = 485; m.advance(10, { rush: true }); m.advance(250);
  assert.equal(m.fighters[0].attack, 'rush'); assert.ok(m.fighters[0].hitMarks.length > 0);
  m.setPaused(true); const before = JSON.stringify(m.fighters); m.advance(2000);
  assert.equal(JSON.stringify(m.fighters), before); m.restart();
  assert.equal(m.fighters[0].attack, null); assert.deepEqual(m.fighters[0].hitMarks, []);
});
test('six-action confirmed route reaches super without bypassing resource or cancel rules', () => {
  const m = setup(); m.fighters[1].x = 465;
  m.advance(10, { light: true });
  for (const key of ['medium', 'heavy', 'thrust', 'rush', 'super']) {
    until(m, () => m.canCancel(m.fighters[0], key));
    m.advance(10, { [key]: true }); assert.equal(m.fighters[0].attack, key);
  }
  assert.equal(m.fighters[0].cancelDepth, 5); assert.equal(m.fighters[0].energy, 0);
  m.advance(3500);
  assert.equal(m.drainEvents().filter(e => e.type === 'hit' && e.side === 0).length, 10);
});
test('dive landing recovery locks movement, jump, dash, guard and attacks until it ends', () => {
  for (const contact of [false, true]) for (const action of ['right', 'jump', 'dash', 'guard', 'light']) {
    const m = setup(); m.fighters[1].x = contact ? 465 : 900;
    Object.assign(m.fighters[0], { y: 70, vy: 0 }); m.advance(10, { dive: true });
    until(m, () => m.fighters[0].y === 0);
    const f = m.fighters[0], x = f.x, recovery = contact ? 100 : 240;
    assert.equal(f.landingRecovery, recovery);
    m.advance(10, { [action]: true });
    assert.equal(f.x, x); assert.equal(f.y, 0); assert.equal(f.dashMs, 0);
    assert.equal(f.guard, false); assert.equal(f.attack, null);
    m.advance(recovery + 30); m.advance(10, { [action]: true });
    if (action === 'right') assert.ok(f.x > x);
    if (action === 'jump') assert.ok(f.y > 0);
    if (action === 'dash') assert.ok(f.dashMs > 0);
    if (action === 'guard') assert.equal(f.guard, true);
    if (action === 'light') assert.equal(f.attack, 'light');
  }
});
