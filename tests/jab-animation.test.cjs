const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, MOVES } = require('../src/engine.js');
const { createAnimator } = require('../src/animation.js');
function setup(character) {
  const m = new Match({ mode: 'duel', characters: [character === 'penguin' ? 2 : character, 0] });
  m.start(); m.advance(1000); m.fighters[1].x = 1500;
  if (character === 'penguin') m.fighters[0].penguin = { ms: 20000 };
  return { m, f: m.fighters[0], choose: createAnimator() };
}
test('each human without a guitar has six dedicated drawings for normal chain stages two and three', () => {
  for (const [c, prefix] of [[0, 'anon'], [1, 'soyo'], [2, 'tomori']]) {
    const { m, f, choose } = setup(c), seen = new Set();
    for (const stage of [2, 3]) {
      f.attack = prefix + 'Jab' + stage; const move = MOVES[f.attack];
      for (const [time, phase] of [[0, 'windup'], [move.start, 'impact'], [move.end + 10, 'recover']]) {
        f.attackMs = time; const pose = choose(m, 0);
        assert.equal(pose, `jab-${stage}-${phase}`); seen.add(pose);
      }
    }
    assert.equal(seen.size, 6);
  }
});
test('Rana and penguin visibly change the strike silhouette for each normal chain hit', () => {
  for (const [c, attacks, expected] of [
    [3, ['rana_light', 'ranaJab2', 'ranaJab3'], ['standing-light', 'standing-medium', 'rising-impact']],
    ['penguin', ['penguin_light', 'penguinJab2', 'penguinJab3'], ['flipper-light', 'kick-light', 'flipper-heavy']],
  ]) {
    const { m, f, choose } = setup(c), poses = attacks.map(attack => { f.attack = attack; f.attackMs = MOVES[attack].start; return choose(m, 0); });
    assert.deepEqual(poses, expected); assert.equal(new Set(poses).size, 3);
    f.attack = attacks[1]; f.attackMs = 0; const secondWindup = choose(m, 0);
    f.attack = attacks[2]; f.attackMs = 0; assert.notEqual(choose(m, 0), secondWindup);
  }
});
test('real repeated light input enters distinct new chain drawings without changing combat timing', () => {
  for (const [c, prefix] of [[0, 'anon'], [1, 'soyo'], [2, 'tomori']]) {
    const { m, f, choose } = setup(c);
    m.advance(10, { light: true }); m.advance(130); m.advance(10, { light: true });
    assert.equal(f.attack, prefix + 'Jab2'); assert.equal(choose(m, 0), 'jab-2-windup');
    m.advance(90); assert.equal(choose(m, 0), 'jab-2-impact');
    m.advance(70); assert.equal(choose(m, 0), 'jab-2-recover');
    m.advance(10, { light: true }); assert.equal(f.attack, prefix + 'Jab3');
    assert.equal(choose(m, 0), 'jab-3-windup'); m.advance(140);
    assert.equal(choose(m, 0), 'jab-3-impact'); m.advance(80);
    assert.equal(choose(m, 0), 'jab-3-recover');
    m.setPaused(true); const before = JSON.stringify(f); m.advance(1000);
    assert.equal(choose(m, 0), 'jab-3-recover'); assert.equal(JSON.stringify(f), before);
    f.attack = null; f.stun = 100; assert.equal(choose(m, 0), 'hit-high');
  }
});
