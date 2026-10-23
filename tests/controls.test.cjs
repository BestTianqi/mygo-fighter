const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, MOVES, FEEL, WORLD } = require('../src/engine.js');
function game(character = 0, penguin = false) {
  const m = new Match({ mode: 'duel', characters: [character, 0] }); m.start(); m.advance(1000);
  m.fighters[0].energy = 100; m.fighters[1].x = 1500;
  if (penguin) m.fighters[0].penguin = { ms: 20000 };
  return m;
}
test('all six forms resolve U/I/O to three specific base skills', () => {
  for (const [c, penguin, expected] of [
    [0, false, ['shield', 'wave', 'special']], [1, false, ['summon', 'wave', 'special']],
    [2, false, ['tomoriEcho', 'tomoriNote', 'tomoriChorus']],
    [2, true, ['penguinCry', 'penguinHey', 'penguinCall']],
    [3, false, ['ranaRush', 'ranaParfait', 'ranaSolo']], [4, false, ['rikiRoll', 'rikiShock', 'rikiEight']],
  ]) for (const [i, move] of expected.entries()) {
    const m = game(c, penguin); m.advance(10, { unified: true, ['skill' + (i + 1)]: true });
    assert.equal(m.fighters[0].attack, move); assert.equal(m.fighters[0].energy, 100 - MOVES[move].cost);
  }
});
test('directions keep existing heal, sonic, rising, parfait and beat support accessible', () => {
  for (const [c, input, move] of [[0, { crouch: true, skill2: true }, 'sonic'],
    [0, { crouch: true, skill1: true }, 'rising'], [1, { crouch: true, skill2: true }, 'heal'],
    [3, { crouch: true, skill2: true }, 'ranaTune'], [4, { crouch: true, skill2: true }, 'rikiCalibrate']]) {
    const m = game(c); m.fighters[0].hp = 100; m.fighters[0].energy = c === 3 ? 50 : 100;
    m.advance(10, { unified: true, ...input }); assert.equal(m.fighters[0].attack, move);
  }
});
test('H alone transforms Tomori once; P selects character-specific supers', () => {
  const m = game(2); m.advance(10, { unified: true, transform: true });
  assert.equal(m.fighters[0].penguin.ms, 20000); assert.equal(m.fighters[0].energy, 50);
  m.advance(200, { unified: true, transform: true }); const before = m.fighters[0].penguin.ms;
  m.advance(10); m.advance(10, { unified: true, transform: true });
  assert.equal(m.fighters[0].penguin.ms, before - 20);
  for (const [c, move] of [[0, 'super'], [1, 'soyoSuper'], [3, 'ranaSuper'], [4, 'rikiSuper']]) {
    const n = game(c); n.advance(10, { unified: true, super: true }); assert.equal(n.fighters[0].attack, move);
  }
});
test('L blinks immediately on ground or in air, respects bounds, cooldown and pause', () => {
  for (const air of [false, true]) {
    const m = game(), f = m.fighters[0]; if (air) { f.y = 180; f.vy = 100; }
    const x = f.x; m.advance(10, { unified: true, blink: true });
    assert.ok(Math.abs(f.x - x - FEEL.dashSpeed * FEEL.dashDuration / 1000) < 1);
    assert.equal(f.energy, 90); assert.ok(f.dashInvuln > 0); assert.equal(f.dashCooldown, FEEL.dashCooldown);
    const after = f.x; m.advance(200, { unified: true, blink: true }); assert.ok(Math.abs(f.x - after) < 1);
    m.setPaused(true); const state = JSON.stringify(f); m.advance(1000); assert.equal(JSON.stringify(f), state);
  }
  const m = game(), f = m.fighters[0]; f.x = WORLD.right - 60;
  m.advance(10, { unified: true, right: true, blink: true }); assert.equal(f.x, WORLD.right - 45);
});
test('holding a skill while changing directions cannot create another button press', () => {
  const m = game(); m.advance(10, { unified: true, skill2: true });
  m.advance(1500, { unified: true, skill2: true, crouch: true });
  assert.deepEqual(m.drainEvents().filter(e => e.type === 'attack').map(e => e.attack), ['wave']);
});
test('a delayed skill or blink uses directions captured on its button press', () => {
  const m = game(); m.advance(10, { unified: true, skill1: true, pressDirections: { skill1: { crouch: true } } });
  assert.equal(m.fighters[0].attack, 'rising');
  const n = game(), x = n.fighters[0].x;
  n.advance(10, { unified: true, blink: true, pressDirections: { blink: { left: true } } });
  assert.ok(n.fighters[0].x < x - 240);
  const t = game(); t.advance(10, { unified: true, skill1: true, pressDirections: { skill1: { left: true } } });
  assert.equal(t.fighters[0].attack, 'anonCry'); assert.equal(t.fighters[0].backThrow, false);
});
test('unified physical keys are unique and every advertised direction resolves for either facing', () => {
  const { KEYS1, KEYS2, bindingList, resolveSkill } = require('../src/controls.js');
  assert.equal(new Set([...Object.values(KEYS1), ...Object.values(KEYS2)]).size, 24);
  for (const c of [0, 1, 2, 3, 4]) for (const penguin of c === 2 ? [false, true] : [false]) {
    for (const row of bindingList({ character: c, penguin })) {
      assert.ok(MOVES[row.move], row.move);
      if (row.key.includes('/') || !/^[UIO]$|＋[UIO]$/.test(row.key)) continue;
      const action = 'skill' + ('UIO'.indexOf(row.key.at(-1)) + 1);
      for (const facing of [-1, 1]) {
        const horizontal = row.key.startsWith('前') ? facing : row.key.startsWith('后') ? -facing : 0;
        const input = { crouch: row.key.includes('↓'), left: horizontal < 0, right: horizontal > 0 };
        assert.equal(resolveSkill({ character: c, penguin, facing }, input, key => key === action, row.key.startsWith('空中')), row.move);
      }
    }
  }
});
