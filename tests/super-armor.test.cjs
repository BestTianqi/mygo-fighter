const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, MOVES } = require('../src/engine.js');
const { schemeFor } = require('../src/controls.js');

function cast(character, side, form = 'normal') {
  const m = new Match({ mode: 'duel', characters: side ? [0, character] : [character, 0] });
  m.start(); m.advance(1000);
  const a = m.fighters[side], b = m.fighters[1 - side];
  a.energy = 100; a.x = 400; b.x = 900;
  if (form === 'stage') a.stageForm = { ms: 20000 };
  if (form === 'penguin') a.penguin = { ms: 20000 };
  const input = { unified: true, super: true };
  m.advance(10, side ? {} : input, side ? input : {});
  assert.equal(a.attack, schemeFor(a).super);
  m.drainEvents();
  return m;
}

for (let character = 0; character < 15; character++) {
  // Soyo's invulnerable preparation ends when she releases the independent wave.
  // Her post-release vulnerability is exercised in soyo-super.test.cjs.
  if (character === 1) continue;
  const forms = character >= 5 && character < 10 ? ['normal', 'stage'] : character === 2 ? ['normal', 'penguin'] : ['normal'];
  for (const form of forms) test(`P armor preserves damage, action and position: character ${character}/${form}, both players`, () => {
    for (const side of [0, 1]) for (const incoming of ['light', 'heavy', 'rising', 'throw', 'tomoriNote', 'tensoraHit', 'mujica_5_stage_i', 'super']) {
      for (const timing of ['startup', 'active', 'recovery']) {
        const m = cast(character, side, form), a = m.fighters[side], b = m.fighters[1 - side];
        const attack = a.attack, move = MOVES[attack];
        a.attackMs = timing === 'startup' ? (move.invuln || 0) : timing === 'active' ? Math.max(move.start + 20, move.invuln || 0) : move.duration - 10;
        b.backThrow = true;
        const before = { x: a.x, y: a.y, vx: a.vx, vy: a.vy, facing: a.facing, attackMs: a.attackMs, hitMarks: [...a.hitMarks] };
        m.hit(1 - side, incoming);
        assert.ok(a.hp < 200, `${incoming}/${timing}: armor must still take damage`);
        assert.equal(a.attack, attack, `${incoming}/${timing}: action interrupted`);
        assert.deepEqual({ x: a.x, y: a.y, vx: a.vx, vy: a.vy, facing: a.facing, attackMs: a.attackMs, hitMarks: a.hitMarks }, before);
        assert.equal(a.stun, 0); assert.equal(a.knockdown, 0); assert.equal(a.pushVx, 0); assert.equal(a.launched, false);
        const hit = m.drainEvents().find(e => e.type === 'hit');
        assert.ok(hit?.armored); assert.equal(hit.blocked, false); assert.equal(hit.counter, false);
        assert.equal(hit.damage, 200 - a.hp);
      }
    }
  });
}

test('armor survives real melee and projectile collision and the super continues emitting', () => {
  const m = cast(2, 0), [a, b] = m.fighters;
  m.freeze = 0; a.attackMs = 1000; a.hitMarks = [0];
  b.x = a.x + 60; b.facing = -1;
  m.advance(200, {}, { heavy: true });
  assert.ok(a.hp < 200); assert.equal(a.attack, 'tomoriSuper');
  const hp = a.hp;
  m.waves.push({ x: a.x, y: a.y + 40, vx: 0, owner: 1, life: 100, age: 0, rx: 20, ry: 12, attack: 'tomoriNote' });
  m.updateWaves(); assert.ok(a.hp < hp); assert.equal(a.attack, 'tomoriSuper');
  b.x = 1400; m.advance(8000);
  assert.equal(m.drainEvents().filter(e => e.type === 'voicePulse' && e.attack === 'tomoriSuper').length, 2);
});

test('armor ends with the move, ordinary skills still stagger, and lethal damage still ends the round', () => {
  const m = cast(3, 0), a = m.fighters[0];
  m.advance(4000); assert.equal(a.attack, null);
  m.hit(1, 'heavy'); assert.ok(a.stun > 0); assert.ok(!m.drainEvents().find(e => e.type === 'hit').armored);
  const n = cast(2, 0), f = n.fighters[0];
  f.attack = 'tomoriChorus'; f.attackMs = MOVES.tomoriChorus.start + 10;
  n.hit(1, 'heavy'); assert.equal(f.attack, null); assert.ok(f.stun > 0);
  const k = cast(6, 1, 'stage'), victim = k.fighters[1];
  victim.attackMs = 500; victim.hp = 1; k.freeze = 0;
  k.hit(0, 'heavy'); k.advance(500);
  assert.equal(victim.hp, 0); assert.equal(victim.attack, null);
  assert.equal(k.reason, 'K.O.'); assert.equal(k.phase, 'roundOver');
});
