const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, MOVES } = require('../src/engine.js');
const { createAnimator } = require('../src/animation.js');
function setup() {
  const m = new Match({ mode: 'duel', characters: [0, 1] }); m.start(); m.advance(1000);
  return { m, a: m.fighters[0], choose: createAnimator() };
}
test('both approved idles remain; Anon movement and each dash direction have distinct poses', () => {
  const { m, a, choose } = setup(); assert.equal(choose(m, 0), null); assert.equal(choose(m, 1), null);
  a.vx = 230; assert.equal(choose(m, 0), 'walk-pass');
  m.elapsed += 110; assert.equal(choose(m, 0), 'walk-contact');
  a.dashMs = 140; a.vx = 580; assert.equal(choose(m, 0), 'dash-forward');
  a.vx = -580; assert.equal(choose(m, 0), 'dash-back');
  a.y=150;a.vy=100;assert.equal(choose(m,0),'dash-back');
});
test('jump art progresses through takeoff, rise, fall and landing, including elevated surfaces', () => {
  for (const height of [0, 64]) {
    const { m, a, choose } = setup();
    if (height) { m.setTerrain({ platforms: [{ left: 200, right: 500, height }] }); a.y = height; }
    choose(m, 0); m.advance(10, { jump: true }); assert.equal(choose(m, 0), 'jump-takeoff');
    m.advance(180); assert.equal(choose(m, 0), 'jump-rise');
    m.advance(300); assert.equal(choose(m, 0), 'jump-fall');
    m.advance(600); assert.equal(choose(m, 0), 'landing');
    m.advance(140); assert.equal(choose(m, 0), null);
  }
});
test('a normal keeps the existing impact drawing between new preparation and recovery frames', () => {
  const { m, a, choose } = setup();
  for (const [attack, prefix] of [['light', 'normal'], ['crouch_light', 'crouch']]) {
    a.attack = attack; a.attackMs = 0; assert.equal(choose(m, 0), prefix + '-windup');
    a.attackMs = MOVES[attack].start; assert.equal(choose(m, 0), null);
    a.attackMs = MOVES[attack].end + 10; assert.equal(choose(m, 0), prefix + '-recover');
  }
});
test('guarding, high/body hit reactions and knockdown/getup have separate silhouettes', () => {
  const { m, a, choose } = setup(); a.guard = true; assert.equal(choose(m, 0), 'guard-standing');
  a.crouch = true; assert.equal(choose(m, 0), 'guard-crouch');
  a.guard = a.crouch = false; a.stun = 200; assert.equal(choose(m, 0), 'hit-low');
  a.stun = 0; choose(m, 0); a.stun = 200; assert.equal(choose(m, 0), 'hit-high');
  a.knockdown = 500; a.y = 60; a.vy = -200; assert.equal(choose(m, 0), 'knockdown-fall');
  a.y = a.vy = 0; assert.equal(choose(m, 0), 'knockdown-ground');
  a.knockdown = 100; assert.equal(choose(m, 0), 'getup');
});
test('dedicated special poses are used at impact, while the yellow dragon super keeps its own atlas', () => {
  const { m, a, choose } = setup();
  for (const [attack, pose] of [['thrust','thrust-impact'],['rising','rising-impact'],['sonic','sonic-release'],['shield','sonic-release'],['spin','spin-impact']]) {
    a.attack = attack; a.attackMs = MOVES[attack].start; assert.equal(choose(m, 0), pose);
  }
  a.attack = 'super'; a.attackMs = 900; assert.equal(choose(m, 0), null);
  m.phase = 'roundOver'; m.winner = 0; assert.equal(choose(m, 0), 'victory');
});
test('selecting art is read-only and a paused match holds the same pose', () => {
  const { m, a, choose } = setup(); m.advance(10, { light: true }); m.setPaused(true);
  const before = JSON.stringify(m), pose = choose(m, 0);
  for (let i = 0; i < 10; i++) { m.advance(100); assert.equal(choose(m, 0), pose); }
  assert.equal(JSON.stringify(m), before); assert.equal(a.attack, 'light');
});
test('a real crouching block keeps its low guard drawing throughout blockstun', () => {
  const m = new Match({ mode: 'duel', characters: [0, 0] }); m.start(); m.advance(1000);
  m.fighters[0].x = 420; m.fighters[1].x = 480;
  const choose = createAnimator(); m.advance(10, { guard: true, crouch: true }); choose(m, 0);
  let sawClearedCrouch = false;
  for (let i = 0; i < 40; i++) {
    m.advance(10, { guard: true, crouch: true }, { crouch: true, light: true });
    const pose = choose(m, 0), f = m.fighters[0];
    if (f.stun && f.guard) { assert.equal(pose, 'guard-crouch'); if (!f.crouch) sawClearedCrouch = true; }
  }
  assert.ok(sawClearedCrouch); assert.equal(m.fighters[0].hp, 200);
});
