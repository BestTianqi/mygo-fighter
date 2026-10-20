const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, MOVES, moveList } = require('../src/engine.js');
const setup = (options = {}) => { const m = new Match({ mode: 'duel', characters: [0, 1], ...options }); m.start(); m.advance(1000); return m; };
const buttons = ['light', 'medium', 'heavy', 'lightKick', 'mediumKick', 'heavyKick'];
const step = (m, input, side = 0, ms = 60) => m.advance(ms, side ? {} : input, side ? input : {});

test('Anon has eighteen stance normals and a complete named move list', () => {
  assert.equal(moveList(0).filter(m => m.normalIndex !== undefined).length, 18);
  assert.ok(moveList(0).some(m => m.key === 'super' && m.name.includes('粉色奶龙')));
  assert.ok(!moveList(1).some(m => m.key === 'super'));
  for (const stance of ['standing', 'crouch', 'air']) for (const key of buttons) {
    const m = setup();
    if (stance === 'air') { m.fighters[0].y = 90; m.fighters[0].vy = 100; }
    step(m, { [key]: true, crouch: stance === 'crouch' }, 0, 10);
    assert.equal(MOVES[m.fighters[0].attack].stance, stance);
  }
});
test('quarter circles, dragon punch and double quarter circles resolve relative to facing', () => {
  for (const side of [0, 1]) {
    const m = setup({ characters: [0, 0] }); m.fighters[side].energy = 100;
    const forward = side ? 'left' : 'right';
    step(m, { crouch: true }, side); step(m, { crouch: true, [forward]: true }, side);
    step(m, { [forward]: true }, side); step(m, { [forward]: true, light: true }, side, 10);
    assert.equal(m.fighters[side].attack, 'waveLight');
  }
  const dp = setup(); dp.fighters[0].energy = 100;
  step(dp, { right: true }); step(dp, { crouch: true }); step(dp, { crouch: true, right: true }); step(dp, { crouch: true, right: true, medium: true }, 0, 10);
  assert.equal(dp.fighters[0].attack, 'rising');
  const superMove = setup(); superMove.fighters[0].energy = 100;
  for (let i = 0; i < 2; i++) { step(superMove, { crouch: true }); step(superMove, { crouch: true, right: true }); step(superMove, { right: true }); }
  step(superMove, { right: true, heavy: true }, 0, 10);
  assert.equal(superMove.fighters[0].attack, 'super');
});
test('back quarter circle kick becomes spin kick and forward heavy kick becomes overhead', () => {
  const m = setup(); m.fighters[0].energy = 100;
  step(m, { crouch: true }); step(m, { crouch: true, left: true }); step(m, { left: true }); step(m, { left: true, mediumKick: true }, 0, 10);
  assert.equal(m.fighters[0].attack, 'spin');
  const n = setup(); step(n, { right: true, heavyKick: true }, 0, 10);
  assert.equal(n.fighters[0].attack, 'overhead');
});
test('low sweep beats standing guard, is stopped by crouch guard and knocks down', () => {
  for (const crouch of [false, true]) {
    const m = setup(); m.fighters[0].x = 420; m.fighters[1].x = 485;
    m.advance(10, { crouch: true, heavyKick: true }, { guard: true, crouch });
    m.advance(400, {}, { guard: true, crouch });
    assert.equal(m.fighters[1].hp < 200, !crouch);
    assert.equal(m.fighters[1].knockdown > 0, !crouch);
  }
});
test('super costs a full bar, is Anon-only and cannot be activated in air', () => {
  for (const [character, energy, y] of [[0, 99, 0], [2, 100, 0], [0, 100, 50]]) {
    const m = setup({ characters: [character, 0] }); Object.assign(m.fighters[0], { energy, y });
    step(m, { super: true }, 0, 10); assert.equal(m.fighters[0].attack, null);
  }
  const m = setup(); m.fighters[0].energy = 100; step(m, { super: true }, 0, 10);
  assert.equal(m.fighters[0].attack, 'super'); assert.equal(m.fighters[0].energy, 0);
  const soyo = setup({ characters: [1, 0] }); soyo.fighters[0].energy = 100;
  step(soyo, { super: true }, 0, 10); assert.equal(soyo.fighters[0].attack, 'soyoSuper');
});
test('super has three real hits, block damage, recovery and no extra hits after it ends', () => {
  for (const guard of [false, true]) {
    const m = setup(); m.fighters[0].x = 420; m.fighters[1].x = 550; m.fighters[0].energy = 100;
    step(m, { super: true }, 0, 10);
    for (let i = 0; i < 350; i++) m.advance(10, {}, { guard });
    const hits = m.drainEvents().filter(e => e.type === 'hit' && e.attack === 'super');
    assert.equal(hits.length, 3); assert.equal(hits.every(e => e.blocked), guard);
    assert.ok(guard ? m.fighters[1].hp >= 188 : m.fighters[1].hp <= 160);
    assert.equal(m.fighters[0].attack, null); assert.equal(m.fighters[0].energy, 0);
    const hp = m.fighters[1].hp; m.advance(1000); assert.equal(m.fighters[1].hp, hp);
  }
});
test('super can whiff and only protects its invulnerable startup', () => {
  const m = setup(); m.fighters[0].x = 100; m.fighters[1].x = 900; m.fighters[0].energy = 100;
  step(m, { super: true }, 0, 10); m.advance(3400);
  assert.equal(m.fighters[1].hp, 200); assert.equal(m.fighters[0].attack, null);
  const n = setup(); n.fighters[0].energy = 100; step(n, { super: true }, 0, 10);
  const hp = n.fighters[0].hp; n.hit(1, 'light'); assert.equal(n.fighters[0].hp, hp);
  n.advance(2200); n.hit(1, 'light'); assert.ok(n.fighters[0].hp < hp);
});
test('each super pulse can connect late within its active window after initially missing', () => {
  const m = setup(); m.fighters[0].x = 400; m.fighters[1].x = 665; m.fighters[0].energy = 100;
  step(m, { super: true }, 0, 10); m.advance(1040);
  assert.equal(m.fighters[0].attackMs, 800);
  assert.equal(m.fighters[1].hp, 200);
  assert.deepEqual(m.fighters[0].hitMarks, []);
  m.advance(80, {}, { left: true });
  assert.ok(m.fighters[1].hp < 200);
  assert.deepEqual(m.fighters[0].hitMarks, [0]);
});
test('pause freezes super stage, waves and timers; restart clears the transformation', () => {
  const m = setup(); m.fighters[0].energy = 100; step(m, { super: true }, 0, 10); m.advance(900);
  m.setPaused(true); const before = JSON.stringify(m.fighters); const time = m.remaining;
  m.advance(4000); assert.equal(JSON.stringify(m.fighters), before); assert.equal(m.remaining, time);
  m.restart(); assert.equal(m.fighters[0].attack, null); assert.equal(m.fighters[0].energy, 0);
});
test('practice gives a reusable full bar, freezes time and prevents dummy KO', () => {
  const m = setup({ mode: 'practice' }); assert.equal(m.fighters[0].energy, 100);
  m.fighters[0].x = 420; m.fighters[1].x = 485; m.fighters[1].hp = 1;
  step(m, { super: true }, 0, 10); m.advance(4000);
  assert.equal(m.phase, 'fighting'); assert.equal(m.fighters[1].hp, 1);
  assert.equal(m.remaining, 60000); assert.equal(m.fighters[0].energy, 100);
});
test('confirmed normals cancel up in strength and into super, whiffs cannot cancel', () => {
  const m = setup(); m.fighters[0].x = 420; m.fighters[1].x = 485; m.fighters[0].energy = 100;
  step(m, { light: true }, 0, 10); m.advance(170);
  step(m, { medium: true }, 0, 10); assert.equal(m.fighters[0].attack, 'medium');
  m.advance(220); step(m, { super: true }, 0, 10); assert.equal(m.fighters[0].attack, 'super');
  const n = setup(); step(n, { light: true }, 0, 10); n.advance(150); step(n, { medium: true }, 0, 10);
  assert.equal(n.fighters[0].attack, 'light');
});
test('double-tap directions dash, and holding back changes a throw into a side swap', () => {
  for (const direction of ['left', 'right']) {
    const m = setup();
    step(m, { [direction]: true }, 0, 30); step(m, {}, 0, 40);
    step(m, { [direction]: true }, 0, 10);
    assert.ok(m.fighters[0].dashMs > 0);
    assert.equal(Math.sign(m.fighters[0].vx), direction === 'left' ? -1 : 1);
  }
  const m = setup(); m.fighters[0].x = 420; m.fighters[1].x = 480;
  m.advance(10, { left: true, throw: true }, { guard: true });
  m.advance(160, {}, { guard: true });
  assert.ok(m.fighters[0].x > m.fighters[1].x);
  assert.equal(m.fighters[1].hp, 182);
  assert.equal(m.fighters[1].guard, false);
});
