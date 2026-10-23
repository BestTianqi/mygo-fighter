const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, MOVES, moveList } = require('../src/engine.js');

function fight(characters = [1, 0]) {
  const m = new Match({ mode: 'duel', characters }); m.start(); m.advance(1000);
  m.fighters.forEach((f, i) => { f.x = 500 + i * 220; f.energy = 100; });
  m.drainEvents(); return m;
}
function input(m, side, value, ms = 10) { m.advance(ms, side ? {} : value, side ? value : {}); }
function cast(m, side = 0) { input(m, side, { super: true }); m.freeze = 0; }
function untilControlled(m, target = 1, held = {}) {
  for (let i = 0; i < 300 && !m.fighters[target].hardStun; i++) m.advance(10, target ? {} : held, target ? held : {});
  assert.equal(m.fighters[target].hardStun, 2000);
}

test('Anon cry is a separate affordable forward projectile for either player', () => {
  assert.equal(MOVES.anonCry?.name, '唐哭');
  assert.ok(moveList(0).some(m => m.key === 'anonCry'));
  for (const side of [0, 1]) {
    const m = fight([0, 0]), a = m.fighters[side], b = m.fighters[1 - side];
    a.x = side ? 900 : 300; b.x = side ? 550 : 650;
    input(m, side, { anonCry: true }); assert.equal(a.attack, 'anonCry'); assert.equal(a.energy, 80);
    m.advance(180); assert.equal(m.waves.length, 1); assert.equal(m.waves[0].attack, 'anonCry');
    assert.equal(Math.sign(m.waves[0].vx), side ? -1 : 1);
    m.advance(700); assert.equal(b.hp, 188);
  }
});

test('Anon cry respects cost, ground, ownership and pause', () => {
  for (let character = 1; character < 15; character++) {
    const m = fight([character, 0]); input(m, 0, { anonCry: true });
    assert.equal(m.fighters[0].attack, null); assert.equal(m.fighters[0].energy, 100);
    assert.ok(!moveList(character).some(m => m.key === 'anonCry'));
  }
  for (const setup of [f => f.energy = 19, f => { f.y = 200; f.vy = 100; }]) {
    const m = fight([0, 0]); setup(m.fighters[0]); input(m, 0, { anonCry: true }); assert.equal(m.fighters[0].attack, null);
  }
  const m = fight([0, 0]); input(m, 0, { anonCry: true }); m.advance(180);
  m.setPaused(true); const wave = JSON.stringify(m.waves); m.advance(1000); assert.equal(JSON.stringify(m.waves), wave);
});

test('Anon cry physically hits guard and steel, misses a target behind, and does not hit friendly minions', () => {
  for (const protection of ['guard', 'steel']) {
    const m = fight([0, 1]), b = m.fighters[1];
    if (protection === 'steel') b.shield = { hp: 40, ms: 5000, hitMs: 0 };
    input(m, 0, { anonCry: true }); m.advance(900, {}, protection === 'guard' ? { guard: true } : {});
    assert.equal(b.hp, protection === 'guard' ? 197 : 200);
  }
  const m = fight([0, 1]), a = m.fighters[0], b = m.fighters[1];
  input(m, 0, { anonCry: true }); m.advance(180); b.x = a.x - 200;
  a.summons = { ms: 5000, bornAt: m.elapsed, units: [{ id: 0, hp: 20, x: a.x + 150, y: 8, called: true, phase: 'follow', cooldown: 5000 }] };
  m.advance(1200); assert.equal(b.hp, 200); assert.equal(a.summons.units[0].hp, 20);
  assert.equal(m.waves.length, 0);
});

for (const side of [0, 1]) test(`Soyo radial control reaches front, back, above and below for player ${side + 1}`, () => {
  for (const [dx, dy, inside] of [[250, 0, true], [-250, 0, true], [0, 400, true], [0, -400, true], [420, 420, true], [500, 500, false], [625, 0, false]]) {
    const m = fight([1, 1]), a = m.fighters[side], b = m.fighters[1 - side];
    a.x = 500; a.y = 400; b.x = a.x + dx; b.y = a.y + dy;
    m.options.terrain = { platforms: [{ left: 450, right: 550, height: 400 }, { left: b.x - 25, right: b.x + 25, height: b.y }] };
    cast(m, side); m.advance(1400);
    assert.equal(!!b.hardStun, inside, `${dx},${dy}`); assert.equal(b.hp, 200); assert.equal(b.energy, 100);
    const events = m.drainEvents(); assert.equal(events.filter(e => e.type === 'hardControl').length, inside ? 1 : 0);
    assert.equal(events.filter(e => e.type === 'hit' && e.attack === 'soyoSuper').length, 0);
  }
});

test('Soyo releases recovery at 430ms while presentation and fixed circular wave remain independent', () => {
  const m = fight(), a = m.fighters[0]; cast(m); const id = a.soyoSuper?.id;
  m.advance(420); assert.equal(a.attack, 'soyoSuper'); assert.equal(a.soyoSuper.released, false);
  m.advance(10); assert.equal(a.attack, null); assert.equal(a.cooldown, 0);
  assert.equal(a.soyoSuper.id, id); assert.equal(a.soyoSuper.released, true); assert.equal(a.soyoSuper.radius, 0);
  const { x, y } = a.soyoSuper; assert.equal(y, a.y + 100);
  m.advance(200, { left: true }); assert.ok(a.x < x); assert.equal(a.soyoSuper.x, x); assert.equal(a.soyoSuper.y, y);
  input(m, 0, { light: true }); assert.equal(a.attack, 'light'); assert.equal(a.soyoSuper.id, id);
  m.advance(500); assert.equal(a.soyoSuper.radius, 620);
});

test('control bypasses guard, steel and super armor while dealing no damage or push', () => {
  for (const defense of ['guard', 'steel', 'armor']) {
    const m = fight(), b = m.fighters[1]; cast(m); m.advance(MOVES.soyoSuper.start);
    if (defense === 'steel') b.shield = { hp: 40, ms: 5000, hitMs: 0 };
    if (defense === 'armor') { b.attack = 'super'; b.attackMs = 1000; b.cooldown = 2000; b.hit = true; }
    if (defense === 'guard') b.guard = true;
    untilControlled(m, 1, defense === 'guard' ? {guard:true} : {}); assert.equal(b.attack, null); assert.equal(b.guard, false); assert.equal(b.hp, 200);
    assert.equal(b.pushVx, 0); assert.equal(b.vy, 0); assert.equal(b.knockdown, 0);
    assert.equal(m.fighters[0].energy, 0); assert.equal(b.energy, 100);
    assert.equal(m.drainEvents().filter(e => e.type === 'hardControl').length, 1);
  }
});

test('true invulnerability delays control until protection expires inside the wave', () => {
  const m = fight(), b = m.fighters[1]; cast(m); b.dashInvuln = 650;
  m.advance(550); assert.equal(b.hardStun, 0);
  m.advance(100); assert.equal(b.hardStun, 2000);
  m.advance(400); assert.equal(m.drainEvents().filter(e => e.type === 'hardControl').length, 1);
});

test('hard control locks all actions for two active seconds and followup damage cannot shorten it', () => {
  const m = fight([1, 5]), b = m.fighters[1]; cast(m); untilControlled(m);
  const energy = b.energy;
  m.hit(0, 'light'); assert.equal(b.hardStun, 2000); assert.ok(b.stun >= 2000); m.freeze = 0;
  const held = { unified: true, left: true, jump: true, blink: true, transform: true, skill1: true, guard: true };
  m.advance(200, {}, held); const x = b.x;
  m.advance(800, {}, held); assert.equal(b.x, x); assert.equal(b.attack, null); assert.equal(b.stageForm, null);
  assert.equal(b.y, 0); assert.equal(b.guard, false); assert.equal(b.energy, energy + 0);
  m.setPaused(true); m.advance(1000, {}, held); assert.equal(b.hardStun, 1000); m.setPaused(false);
  m.advance(990, {}, held); assert.equal(b.hardStun, 10); assert.equal(b.attack, null);
  const before = b.x; m.advance(10, {}, { left: true }); assert.equal(b.hardStun, 0); assert.ok(b.x < before);
});

test('Soyo can jump and blink after release; new skills keep normal energy gates', () => {
  for (const action of ['jump', 'blink']) {
    const m = fight(); cast(m); m.advance(MOVES.soyoSuper.start); const a = m.fighters[0], x = a.x;
    if (action === 'blink') a.energy = 10;
    input(m, 0, { [action]: true, left: true }); assert.ok(action === 'jump' ? a.y > 0 : a.x < x - 20); assert.ok(a.soyoSuper);
  }
  const m = fight(); cast(m); m.advance(MOVES.soyoSuper.start); input(m, 0, { wave: true }); assert.equal(m.fighters[0].attack, null);
});

test('independent wave survives ordinary hits, clears on KO/reset, and IDs identify each cast', () => {
  const m = fight(); cast(m); m.advance(MOVES.soyoSuper.start); const a = m.fighters[0], id = a.soyoSuper.id;
  m.hit(1, 'heavy'); assert.ok(a.soyoSuper); assert.ok(a.stun); m.freeze = 0;
  m.restart(); assert.ok(m.fighters.every(f => !f.soyoSuper && !f.hardStun)); m.advance(1000);
  a.energy = 100; m.fighters[0].energy = 100; cast(m); assert.notEqual(m.fighters[0].soyoSuper.id, id);
  m.fighters[1].hp = 0; m.advance(10); assert.ok(m.fighters.every(f => !f.soyoSuper && !f.hardStun));
});

test('simultaneous Soyo P releases fairly and each fighter is controlled once', () => {
  const m = fight([1, 1]); m.advance(10, { super: true }, { super: true }); m.freeze = 0; m.advance(700);
  assert.ok(m.fighters.every(f => f.hardStun > 0 && f.soyoSuper?.released));
  assert.equal(m.drainEvents().filter(e => e.type === 'hardControl').length, 2);
});

test('the visible wave ends after 350ms and cannot control a late entrant', () => {
  const m = fight(), b = m.fighters[1]; b.x = 1400; cast(m); m.advance(MOVES.soyoSuper.start + MOVES.soyoSuper.waveDuration + 10);
  b.x = 700; m.advance(100); assert.equal(b.hardStun, 0); assert.ok(m.fighters[0].soyoSuper);
});

test('a forced interruption before release cancels the pending Soyo wave', () => {
  const m = fight(); cast(m); const a = m.fighters[0];
  a.attack = null; a.hardStun = a.stun = 2000;
  m.advance(1500); assert.equal(a.soyoSuper, null); assert.equal(m.fighters[1].hardStun, 0);
  assert.equal(m.drainEvents().filter(e => e.type === 'soyoSuperRelease').length, 0);
});

test('hard control discards cancelled move recovery and does not keep a fighter locked beyond two seconds', () => {
  const m = fight([1, 4]), b = m.fighters[1]; cast(m); m.advance(MOVES.soyoSuper.start);
  b.attack = 'rikiSuper'; b.attackMs = 600; b.cooldown = 3800; b.hit = true;
  untilControlled(m); assert.equal(b.cooldown, 0);
  m.advance(2000); input(m, 1, { light: true }); assert.equal(b.attack, 'riki_light');
});

test('Anon cry damages the first hostile minion and has a finite horizontal reach', () => {
  const m = fight([0, 1]), b = m.fighters[1]; b.x = 1000;
  b.summons = { ms: 5000, bornAt: m.elapsed, units: [{ id: 0, hp: 20, x: 650, y: 8, called: true, phase: 'follow', cooldown: 5000 }] };
  input(m, 0, { anonCry: true }); m.advance(180);
  // Keep the unit on the projectile path while testing the physical interception.
  b.summons.units[0].x = m.waves[0].x + 20; m.updateWaves();
  assert.equal(b.summons.units[0].hp, 8); assert.equal(b.hp, 200); assert.equal(m.waves.length, 0);
  const n = fight([0, 0]); n.fighters[1].x = 1150;
  input(n, 0, { anonCry: true }); n.advance(1600); assert.equal(n.fighters[1].hp, 200); assert.equal(n.waves.length, 0);
});
