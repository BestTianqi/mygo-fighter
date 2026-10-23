const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, MOVES, moveList } = require('../src/engine.js');
const { schemeFor } = require('../src/controls.js');
function fight(character = 2, side = 0) {
  const m = new Match({ mode: 'duel', characters: side ? [0, character] : [character, 0] });
  m.start(); m.advance(1000); const a = m.fighters[side], b = m.fighters[1-side];
  a.energy = 100; a.x = 480; b.x = 700; return m;
}
function cast(m, side, input) { m.advance(10, side ? {} : { unified: true, ...input }, side ? { unified: true, ...input } : {}); }

test('Tomori forms have disjoint native skills and no human skills leak into penguin move lists', () => {
  const normal = moveList(2).filter(m => m.tomoriOnly && m.key !== 'penguinTransform');
  const penguin = moveList(2, true);
  assert.ok(normal.every(m => !penguin.some(p => p.key === m.key)));
  assert.ok(!penguin.some(m => m.key === 'penguinTransform'));
  assert.equal(MOVES.tomoriNote.projectile, true);
  assert.ok(!MOVES.penguinHey.projectile && !MOVES.penguinCall.projectile);
  assert.ok(MOVES.penguinCall.movement > 0);
  for (const form of [false, true]) {
    const m = fight(); m.fighters[0].penguin = form ? { ms: 20000 } : null;
    for (const foreign of form ? ['tomoriNote','tomoriEcho','tomoriChorus','tomoriSuper'] : ['penguinCry','penguinHey','penguinCall','penguinSuper']) {
      m.fighters[0].buffer = foreign; m.fighters[0].bufferMs = 100; m.advance(10);
      assert.equal(m.fighters[0].attack, null, foreign);
    }
  }
});

test('penguin P emits five circular waves and deals exactly ten per wave in either direction', () => {
  for (const side of [0,1]) for (const direction of [-1,1]) {
    const m = fight(2, side), a = m.fighters[side], b = m.fighters[1-side];
    a.penguin = { ms: 20000 }; b.x = a.x + direction * 220;
    cast(m, side, { super: true });
    m.advance(MOVES.penguinSuper.duration + 2500);
    const events = m.drainEvents(), hits = events.filter(e => e.type === 'hit' && e.attack === 'penguinSuper');
    assert.equal(events.filter(e => e.type === 'voicePulse' && e.attack === 'penguinSuper').length, 5);
    assert.deepEqual(hits.map(h => h.damage), [10,10,10,10,10]);
    assert.equal(b.hp, 150); assert.equal(a.energy, 0);
  }
});

test('radial waves reach an upper platform, persist after interception and never hit a body twice', () => {
  const m = fight(), a = m.fighters[0], b = m.fighters[1];
  a.penguin = { ms: 20000 }; m.options.terrain = { platforms: [{ left:650,right:850,height:220 }] }; b.y = 220;
  m.spawnWave(0, 'penguinSuper'); assert.equal(m.waves[0].radial, true);
  b.summons = { bornAt: m.elapsed, ms: 10000, units: [{ id:0,hp:20,x:600,y:0,called:true,phase:'follow',cooldown:10000 }] };
  m.advance(3100);
  assert.equal(b.hp, 190);
  assert.equal(m.drainEvents().filter(e => e.type === 'hit' && e.attack === 'penguinSuper').length, 1);
});

test('penguin waves retain ten damage during an existing combo and a counter hit', () => {
  const m=fight(),a=m.fighters[0],b=m.fighters[1];a.penguin={ms:20000};a.combo=6;a.comboMs=1000;
  b.attack='heavy';b.attackMs=0;m.hit(0,'penguinSuper');
  assert.equal(m.drainEvents().find(e=>e.type==='hit').damage,10);
});

test('CPU penguin recognizes its circular encore reach beyond the human singing range', () => {
  const m=fight(2,1),a=m.fighters[1],b=m.fighters[0];a.penguin={ms:20000};b.x=a.x+600;
  m.options.mode='cpu';m.aiThink=0;m.advance(10);
  assert.equal(a.attack,'penguinSuper');
});

test('Mortis stage skills replace the silent guitar kit with a double, a parry and a delayed snare', () => {
  const f = { character:8, stageForm:{ ms:20000 } }, s = schemeFor(f);
  const [u,i,o] = s.base.map(k=>MOVES[k]);
  assert.equal(u.mortis, 'double'); assert.equal(u.pulses.length, 2); assert.ok(u.movement < 0);
  assert.equal(i.mortis, 'parry'); assert.equal(i.counter, true); assert.ok(i.counterDamage >= 20);
  assert.equal(o.mortis, 'snare'); assert.equal(o.delayedArea, true); assert.ok(o.pull > 0);
  assert.equal(MOVES[s.super].mortis, 'theater'); assert.equal(MOVES[s.super].omni, true);
  assert.notEqual(MOVES[s.super].name, MOVES.mujica_8_normal_super.name);
});

test('Mortis counter retaliates and the stage snare pulls its target without changing the normal kit', () => {
  const m = fight(8), a=m.fighters[0], b=m.fighters[1];a.stageForm={ms:20000};b.x=650;
  cast(m,0,{skill2:true});m.advance(160);m.hit(1,'light');m.advance(900);
  assert.equal(a.hp,200);assert.ok(b.hp<200);
  const n=fight(8), caster=n.fighters[0], target=n.fighters[1];caster.stageForm={ms:20000};target.x=700;
  cast(n,0,{skill3:true});n.advance(1200);
  assert.ok(target.hp<200);assert.ok(target.x<700);
  assert.equal(MOVES.mujica_8_normal_u.projectile,true);
  assert.equal(MOVES.mujica_8_normal_i.level,'low');
});
