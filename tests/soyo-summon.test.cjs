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

function combatWithMinions(attacker = 0, side = 1, options = {}) {
  const m = fight(side ? [1, attacker] : [attacker, 1], options), owner = 1 - side;
  const group = summon(m, owner), a = m.fighters[side], b = m.fighters[owner];
  a.x = 300; a.y = 0; a.facing = 1; b.x = 1000; b.y = 0; b.attack = null;
  group.units.forEach((p, i) => Object.assign(p, { x: 350 + i * 300, y: 8, cooldown: 20000 }));
  m.drainEvents(); return { m, a, b, group, side, owner };
}
function active(a, attack, at = MOVES[attack].start) {
  Object.assign(a, { attack, attackMs: at - 10, hit: false, hitMarks: [], minionHitMarks: [], cooldown: 0, stun: 0 });
}

test('each summon starts with independent 20 HP and a stable three-unit identity', () => {
  const { group } = combatWithMinions();
  assert.deepEqual(group.units.map(p => [p.id, p.hp, p.maxHp]), [[0, 20, 20], [1, 20, 20], [2, 20, 20]]);
});
test('real melee damages a hostile minion only once per cast and reports its remaining HP', () => {
  for (const side of [0, 1]) {
    const { m, a, group, owner } = combatWithMinions(0, side);
    active(a, 'light'); m.advance(50);
    assert.equal(group.units[0].hp, 14); assert.equal(group.units[1].hp, 20);
    const hits = m.drainEvents().filter(e => e.type === 'minionHit');
    assert.equal(hits.length, 1); assert.deepEqual({ ...hits[0], x: 0, y: 0 },
      { type: 'minionHit', side, owner, unit: 0, damage: 6, hp: 14, defeated: false, x: 0, y: 0 });
    a.attack = null; a.cooldown = 0; group.units[0].x = 350;
    m.advance(10, side ? {} : { light: true }, side ? { light: true } : {}); m.advance(100);
    assert.equal(group.units[0].hp, 8);
  }
});
test('one melee cast can hit multiple units and the fighter without consuming later unit contacts', () => {
  const { m, a, b, group } = combatWithMinions();
  b.x = 390; group.units[0].x = 350; group.units[1].x = 350; group.units[2].x = 440;
  active(a, 'light'); m.advance(10);
  assert.equal(group.units[0].hp, 14); assert.equal(group.units[1].hp, 14); assert.ok(b.hp < 200);
  group.units[2].x = 350; m.freeze = 0; m.advance(10);
  assert.equal(group.units[2].hp, 14); assert.equal(group.units[0].hp, 14);
});
test('melee respects facing, horizontal range and vertical separation; throws skip minions', () => {
  for (const [x, y, attack] of [[250, 8, 'light'], [600, 8, 'light'], [350, 250, 'light'], [350, 8, 'throw']]) {
    const { m, a, group } = combatWithMinions(); Object.assign(group.units[0], { x, y });
    active(a, attack); m.advance(10); assert.equal(group.units[0].hp, 20, `${x}/${y}/${attack}`);
  }
});
test('each legitimate super pulse damages units once while dead units disappear and survivors keep stable strikes', () => {
  const { m, a, b, group, owner } = combatWithMinions();
  const dead = group.units[0], survivor = group.units[2];
  active(a, 'super', 800); m.advance(50); assert.equal(dead.hp, 12);
  dead.x = 350; a.attackMs = 1110; m.advance(50); assert.equal(dead.hp, 2);
  dead.x = 350; a.attackMs = 1490; m.advance(10);
  assert.equal(dead.hp, 0); assert.ok(!group.units.includes(dead)); assert.ok(group.units.includes(survivor));
  assert.equal(m.drainEvents().filter(e => e.type === 'minionHit' && e.unit === 0).length, 3);
  a.attack = null; a.cooldown = 0; m.freeze = 0;
  Object.assign(survivor, { x: a.x + 25, y: a.y + 10, phase: 'charge', phaseMs: 800 });
  m.advance(10); assert.ok(m.drainEvents().some(e => e.type === 'minionStrike' && e.side === owner && e.unit === 2));
  assert.equal(b.summons.units.some(p => p.id === 0), false);
});
test('defeating every unit immediately clears the group and permits another paid summon', () => {
  const { m, a, b, group, owner } = combatWithMinions();
  group.units.forEach(p => { p.x = 350; }); active(a, 'heavyKick'); m.advance(10);
  group.units.forEach(p => { p.x = 350; }); active(a, 'light'); m.freeze = 0; m.advance(10);
  assert.equal(b.summons, null); assert.equal(m.drainEvents().filter(e => e.type === 'minionHit' && e.defeated).length, 3);
  a.attack = null; b.energy = 100; b.cooldown = 0; summon(m, owner); assert.equal(b.energy, 50);
});
test('a real projectile is intercepted by the first hostile body, damages one unit, and cannot pass through', () => {
  for (const fighterFirst of [false, true]) {
    const { m, a, b, group, side } = combatWithMinions();
    a.x = 200; b.x = fighterFirst ? 340 : 550;
    group.units[0].x = fighterFirst ? 370 : 340; group.units[1].x = 370;
    m.waves.push({ x: 350, y: 60, vx: 100, owner: side, life: 500, age: 0, rx: 30, ry: 50, attack: 'tomoriNote' });
    m.updateWaves(); assert.equal(m.waves.length, 0);
    assert.equal(group.units[0].hp, fighterFirst ? 20 : 8); assert.equal(group.units[1].hp, 20);
    assert.equal(b.hp < 200, fighterFirst);
  }
});
test('projectiles miss elevated minions, cannot hit friendly summons, and still expire against terrain', () => {
  const { m, group, side, owner } = combatWithMinions();
  Object.assign(group.units[0], { x: 350, y: 250 });
  const wave = ownerSide => ({ x: 350, y: 40, vx: 0, owner: ownerSide, life: 500, age: 0, rx: 30, ry: 20, attack: 'tomoriNote' });
  m.waves.push(wave(side)); m.updateWaves(); assert.equal(group.units[0].hp, 20); assert.equal(m.waves.length, 1);
  group.units[0].y = 8; m.waves = [wave(owner)]; m.updateWaves(); assert.equal(group.units[0].hp, 20);
  m.waves = [{ ...wave(side), y: -1 }]; m.updateWaves(); assert.equal(group.units[0].hp, 20); assert.equal(m.waves.length, 0);
});
test('delayed area damage hits hostile units only on its terrain surface and fires only once', () => {
  const terrain = { platforms: [{ left: 320, right: 420, height: 160 }] };
  const { m, group, side } = combatWithMinions(12, 1, { terrain });
  group.units.forEach((p, i) => Object.assign(p, { x: 350, y: i ? 168 : 8 }));
  m.areas.push({ owner: side, attack: 'mewtype_12_virtual_i', x: 350, y: 160, warning: 0, life: 100, radius: 115, platform: terrain.platforms[0] });
  m.updateAreas(); m.updateAreas();
  assert.equal(group.units.length, 1); assert.equal(group.units[0].id, 0); assert.equal(group.units[0].hp, 20);
  assert.equal(m.drainEvents().filter(e => e.type === 'minionHit').length, 2);
});
test('summon calls each living unit once at 0/1000/2000ms, never on attack, and pause freezes the schedule', () => {
  const m = fight(); m.fighters[1].knockdown = 20000; const group = summon(m);
  assert.deepEqual(m.drainEvents().filter(e => e.type === 'minionCall').map(e => e.unit), [0]);
  m.advance(990); assert.equal(m.drainEvents().filter(e => e.type === 'minionCall').length, 0);
  m.setPaused(true); m.advance(5000); m.setPaused(false);
  m.advance(10); assert.deepEqual(m.drainEvents().filter(e => e.type === 'minionCall').map(e => e.unit), [1]);
  m.advance(1000); assert.deepEqual(m.drainEvents().filter(e => e.type === 'minionCall').map(e => e.unit), [2]);
  m.advance(4000); assert.equal(m.drainEvents().filter(e => e.type === 'minionCall').length, 0); assert.ok(group.ms > 0);
});
test('a unit defeated before its scheduled call never speaks or strikes later', () => {
  const { m, a, group } = combatWithMinions();
  group.units[1].x = 350; group.units[1].hp = 1; active(a, 'light'); m.advance(10);
  assert.ok(!group.units.some(p => p.id === 1));
  m.drainEvents(); a.attack = null; m.advance(3000);
  assert.ok(!m.drainEvents().some(e => (e.type === 'minionCall' || e.type === 'minionStrike') && e.unit === 1));
});
test('own melee and area pulses leave friendly summons intact while damaging the opposing group', () => {
  const { m, a, b, side, owner } = combatWithMinions(1);
  a.attack = null; a.cooldown = 0; a.energy = 100; const friends = summon(m, side);
  b.x = 1000; a.x = 300; a.facing = 1;
  friends.units.forEach(p => { p.x = 350; p.y = 8; p.cooldown = 20000; });
  b.summons.units.forEach(p => { p.x = 350; p.y = 8; p.cooldown = 20000; });
  active(a, 'heavy'); m.advance(10);
  assert.ok(friends.units.every(p => p.hp === 20)); assert.ok(b.summons.units.every(p => p.hp === 8));
  m.areas.push({ owner: side, attack: 'mewtype_12_virtual_i', x: 350, y: 0, warning: 0, life: 100, radius: 115 });
  m.updateAreas(); assert.equal(m.fighters[owner].summons, null); assert.ok(friends.units.every(p => p.hp === 20));
});
test('real projectile emission damages minions on either side and each super shot keeps its own pulse damage', () => {
  for (const side of [0, 1]) {
    const { m, a, group } = combatWithMinions(2, side);
    const direction = side ? -1 : 1;
    a.x = side ? 600 : 300; a.facing = direction;
    const unit = group.units[0]; unit.x = a.x + direction * 60;
    active(a, 'tomoriSuper', MOVES.tomoriSuper.shots[0]); m.advance(10);
    assert.equal(unit.hp, 8); assert.equal(m.waves.length, 0);
    assert.ok(m.drainEvents().some(e => e.type === 'voicePulse' && e.pulse === 0));
    unit.x = a.x + direction * 60; a.attackMs = MOVES.tomoriSuper.shots[1] - 10; m.advance(10);
    assert.equal(unit.hp, 0); assert.ok(!group.units.includes(unit));
    const event = m.drainEvents().find(e => e.type === 'minionHit'); assert.equal(event.damage, 16);
  }
});
test('targeted area super pulses can hit minions independently when the opposing fighter already took the pulse', () => {
  const { m, a, b, group } = combatWithMinions(12);
  b.x = 550; group.units[0].x = 540; group.units[1].x = 850;
  a.attackTarget = { x: 550, y: 0 }; active(a, 'mewtype_12_virtual_super', MOVES.mewtype_12_virtual_super.pulses[0].at); m.advance(10);
  assert.equal(group.units[0].hp, 15); assert.equal(group.units[1].hp, 20); assert.ok(b.hp < 200);
  group.units[1].x = 540; m.freeze = 0; m.advance(10);
  assert.equal(group.units[1].hp, 15); assert.equal(group.units[0].hp, 15);
});
