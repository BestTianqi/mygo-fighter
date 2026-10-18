const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match } = require('../src/engine.js');
const deck = { platforms: [{ left: 230, right: 430, height: 64 }], hills: [] };
function fight(terrain = deck, options = {}) {
  const m = new Match({ mode: 'duel', characters: [0, 1], terrain, ...options });
  m.start(); m.advance(1000); return m;
}
function jumpToDeck(m) { m.advance(10, { jump: true }); m.advance(1000); assert.equal(m.fighters[0].y, 64); }

test('jump passes upward through a deck, lands on top and walks off into a fall', () => {
  const m = fight(), a = m.fighters[0];
  jumpToDeck(m); assert.ok(m.grounded(a)); assert.equal(m.pose(0), 0);
  m.advance(1100, { right: true });
  assert.ok(a.x > 430); assert.equal(a.y, 0); assert.ok(m.grounded(a));
});
test('a platform supports standing/crouching attacks, guard and steel shield', () => {
  const m = fight(), a = m.fighters[0]; jumpToDeck(m);
  m.advance(10, { light: true }); assert.equal(a.attack, 'light'); m.advance(500);
  m.advance(10, { crouch: true, heavyKick: true }); assert.equal(a.attack, 'crouch_heavyKick'); m.advance(900);
  m.advance(10, { guard: true }); assert.ok(a.guard); m.advance(10);
  a.energy = 20; m.advance(10, { shield: true }); m.advance(150);
  assert.equal(a.shield.hp, 40); assert.equal(a.y, 64);
});
test('jump, rising and spin start from the elevated surface without snapping to the bottom', () => {
  for (const action of ['jump', 'rising', 'spin']) {
    const m = fight(), a = m.fighters[0]; jumpToDeck(m); a.energy = 100;
    m.advance(10, { [action]: true }); assert.ok(a.y > 64, action); assert.ok(a.vy > 0);
    m.advance(1400); assert.ok(m.grounded(a));
  }
});
test('down+jump drops through a platform, cannot loop jumps while held, and works for P2', () => {
  for (const side of [0, 1]) {
    const m = fight(), a = m.fighters[side]; a.x = 310; a.y = 64;
    m.fighters[1 - side].x = 800;
    const inputs = [{}, {}]; inputs[side] = { crouch: true, jump: true };
    m.advance(800, ...inputs); assert.equal(a.y, 0); assert.ok(m.grounded(a));
    m.advance(10); inputs[side] = { jump: true }; m.advance(10, ...inputs); assert.ok(a.y > 0);
  }
});
test('dive height is measured above the supporting surface, and platform landing finishes the dive', () => {
  const m = fight(), a = m.fighters[0]; jumpToDeck(m); a.energy = 100;
  m.advance(10, { dive: true }); assert.equal(a.attack, null); m.advance(150);
  a.y = 90; m.advance(10, { dive: true }); assert.equal(a.attack, null); m.advance(150);
  a.y = 145; a.vy = 0; m.advance(10, { dive: true }); assert.equal(a.attack, 'dive');
  a.vx = 0; a.hit = true; m.advance(160);
  assert.equal(a.y, 64); assert.equal(a.attack, null); assert.ok(a.landingRecovery > 0);
});
test('throws work on a shared elevated surface but cannot grab a fighter on another level', () => {
  const m = fight(); Object.assign(m.fighters[0], { x: 300, y: 64 }); Object.assign(m.fighters[1], { x: 360, y: 64 });
  m.advance(10, { throw: true }); m.advance(100); assert.equal(m.fighters[1].hp, 82);
  const n = fight({ platforms: [{ left: 230, right: 320, height: 64 }] });
  Object.assign(n.fighters[0], { x: 300, y: 64 }); Object.assign(n.fighters[1], { x: 360, y: 0 });
  n.advance(10, { throw: true }); n.advance(100); assert.equal(n.fighters[1].hp, 100);
});
test('sloped ground sets spawn height, follows walking and receives a jump correctly', () => {
  const m = fight({ hills: [{ left: 150, peak: 280, right: 410, height: 40 }] });
  const a = m.fighters[0]; assert.equal(a.y, 40); assert.ok(m.grounded(a));
  m.advance(200, { right: true }); assert.ok(a.y < 40 && a.y > 0); assert.ok(m.grounded(a));
  m.advance(10, { jump: true }); assert.ok(a.vy > 0); m.advance(1200); assert.ok(m.grounded(a));
  assert.equal(a.y, m.floorHeight(a.x));
});
test('solid ground intercepts a projectile while a high projectile can pass over it', () => {
  const m = fight({ hills: [{ left: 410, peak: 480, right: 550, height: 110 }] });
  m.fighters[0].x = 330; m.fighters[0].energy = 20; m.fighters[1].x = 620;
  m.advance(10, { wave: true }); m.advance(1300);
  assert.equal(m.fighters[1].hp, 100); assert.ok(m.drainEvents().some(e => e.type === 'terrainHit'));
  m.waves.push({ x: 400, y: 200, vx: 440, life: 1000, age: 0, owner: 0, attack: 'wave', rx: 15, ry: 20 });
  m.advance(300); assert.equal(m.waves.length, 1);
});
test('switching terrain preserves combat resources, removes support naturally and pause freezes a drop', () => {
  const m = fight(), a = m.fighters[0]; jumpToDeck(m); a.hp = 75; a.energy = 45;
  m.setTerrain(null); assert.equal(a.hp, 75); assert.equal(a.energy, 45);
  m.setPaused(true); const before = JSON.stringify(m.fighters); m.advance(1000); assert.equal(JSON.stringify(m.fighters), before);
  m.setPaused(false); m.advance(600); assert.equal(a.y, 0);
  m.setTerrain({ hills: [{ left: 150, peak: 280, right: 410, height: 40 }] }); assert.equal(a.y, 40);
  m.restart(); assert.equal(a.y, 40); assert.equal(m.fighters[0].y, 40);
});
test('CPU climbs reachable platforms using the same jump speed and gravity as a player', () => {
  const terrain = { platforms: [{ left: 570, right: 740, height: 64 }, { left: 390, right: 530, height: 136 }] };
  const m = fight(terrain, { mode: 'cpu', difficulty: 2 }); Object.assign(m.fighters[0], { x: 450, y: 136 });
  let reached = false;
  for (let i = 0; i < 1200 && m.phase === 'fighting'; i++) {
    m.advance(10);
    if (m.fighters[1].y >= 135 && m.fighters[1].x >= 390 && m.fighters[1].x <= 530) { reached = true; break; }
  }
  assert.ok(reached, JSON.stringify(m.fighters[1]));
});
test('the CPU can reach the highest deck in every shipped map', () => {
  for (const stage of require('../assets/stages.json')) {
    const terrain = stage.terrain, target = terrain.platforms.reduce((a, b) => a.height > b.height ? a : b);
    const m = fight(terrain, { mode: 'cpu', difficulty: 2 });
    Object.assign(m.fighters[0], { x: (target.left + target.right) / 2, y: target.height });
    let reached = false;
    for (let i = 0; i < 1500 && m.phase === 'fighting'; i++) {
      m.advance(10); const a = m.fighters[1];
      if (Math.abs(a.y - target.height) < .1 && m.grounded(a) && a.x >= target.left && a.x <= target.right) { reached = true; break; }
    }
    assert.ok(reached, stage.id + ': ' + JSON.stringify(m.fighters[1]));
  }
});
test('a raised floor finishes airborne attacks and refreshes the next jump when switching maps', () => {
  for (const attack of ['air_light', 'dive']) {
    const m = fight(null), a = m.fighters[0];
    Object.assign(a, { x: 180, y: 26, vy: -300, attack, attackMs: 100, airUsed: true, contact: false });
    m.setTerrain({ hills: [{ left: 70, peak: 180, right: 300, height: 32 }] });
    assert.equal(a.y, 32); assert.equal(a.airUsed, false); assert.equal(a.attack, null);
    if (attack === 'dive') assert.equal(a.landingRecovery, 240);
    m.advance(500); m.advance(10, { jump: true }); m.advance(70); m.advance(10, { light: true });
    assert.equal(a.attack, 'air_light');
  }
});
