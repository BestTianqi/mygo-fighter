const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, MOVES, moveList } = require('../src/engine.js');
const controls = require('../src/controls.js');
const KEY = 'mujica_6_normal_customer';
function fight(side = 0) {
  const m = new Match({ mode: 'duel', characters: side ? [0, 6] : [6, 0], terrain: { platforms: [] } });
  m.start(); m.advance(1000); m.fighters.forEach((f, i) => { f.x = i ? 700 : 300; f.energy = 100; });
  return m;
}
function press(m, side = 0) {
  const input = { unified: true, crouch: true, skill1: true };
  m.advance(10, side ? {} : input, side ? input : {});
}

test('customer service is a visible normal-form gesture while both base U attacks remain intact', () => {
  const f = { character: 6, facing: 1, stageForm: null };
  assert.equal(controls.schemeFor(f).base[0], 'mujica_6_normal_u');
  assert.equal(controls.bindingList(f).find(x => x.move === KEY).key, '↓＋U');
  assert.ok(moveList(6).some(x => x.key === KEY));
  assert.equal(controls.resolveSkill(f, { crouch: true }, k => k === 'skill1', false), KEY);
  f.stageForm = { ms: 20000 };
  assert.equal(controls.resolveSkill(f, { crouch: true }, k => k === 'skill1', false), 'mujica_6_stage_u');
  assert.ok(!controls.bindingList(f).some(x => x.move === KEY));
  assert.ok(!moveList(6, true).some(x => x.key === KEY));
});

test('both players pay twenty once and send one interrupting customer wave with two resonance on hit', () => {
  for (const side of [0, 1]) {
    const m = fight(side), f = m.fighters[side], b = m.fighters[1 - side];
    press(m, side); assert.equal(f.attack, KEY); assert.equal(f.energy, 80);
    let maxWaves = 0;
    for (let i = 0; i < 90; i++) {
      m.advance(10); maxWaves = Math.max(maxWaves, m.waves.length);
    }
    assert.equal(maxWaves, 1); assert.equal(b.hp, 186); assert.equal(f.energy, 82);
    assert.equal(MOVES[KEY].stun, 550); assert.equal(m.waves.length, 0);
    assert.ok(f.moveCooldowns[KEY] > 0);
    press(m, side); assert.equal(f.attack, null); assert.equal(f.energy, 82);
  }
});

test('the call interrupts an opposing startup and uses ordinary counter-hit scaling', () => {
  const m = fight(), b = m.fighters[1]; press(m); m.advance(480);
  b.attack = 'heal'; b.attackMs = 0; b.cooldown = 1000;
  for (let i = 0; i < 50 && b.hp === 200; i++) m.advance(10);
  assert.equal(b.attack, null); assert.ok(b.stun >= 550); assert.equal(b.hp, 183);
});

test('insufficient energy, air and a foreign or transformed fighter cannot cast the customer skill', () => {
  for (const state of [{ energy: 19 }, { y: 150 }, { stageForm: { ms: 20000 } }, { character: 5 }]) {
    const m = fight(), f = m.fighters[0]; Object.assign(f, state); const energy = f.energy;
    f.buffer = KEY; f.bufferMs = 200; m.advance(10);
    assert.equal(f.attack, null); assert.equal(f.energy, energy); assert.equal(m.waves.length, 0);
  }
});

test('a missed call gives no resonance and guarding blocks its full damage and interrupt', () => {
  const miss = fight(), caller = miss.fighters[0]; miss.fighters[1].x = 1800;
  press(miss); miss.advance(1800); assert.equal(caller.energy, 80); assert.equal(miss.fighters[1].hp, 200);
  const m = fight(), f = m.fighters[0], b = m.fighters[1];
  press(m); m.advance(1000, {}, { guard: true });
  assert.equal(b.hp, 197); assert.equal(f.energy, 81);
});
