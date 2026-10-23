const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, MOVES } = require('../src/engine.js');
const { createAnimator, createMujicaMotion, mujicaBodyOffset } = require('../src/animation.js');

function setup(character = 6) {
  const match = new Match({ mode: 'duel', characters: [character, 0] });
  match.start(); match.advance(1000);
  return { match, f: match.fighters[0], motion: createMujicaMotion(), choose: createAnimator() };
}

test('Mujica gait follows distance, holds at a wall, and restarts with a planted contact', () => {
  const { match, f, choose } = setup();
  choose(match, 0); f.vx = 345;
  assert.equal(choose(match, 0), 'walk-contact');
  for (let n = 0; n < 12; n++) { match.elapsed += 20; assert.equal(choose(match, 0), 'walk-contact'); }
  f.x += 25; choose(match, 0); f.x += 25;
  assert.equal(choose(match, 0), 'walk-pass');
  match.elapsed += 300; assert.equal(choose(match, 0), 'walk-pass');
  f.vx = 0; assert.equal(choose(match, 0), 'idle');
  f.vx = -345; assert.equal(choose(match, 0), 'walk-contact');
});

test('torso motion leaves shoes and lower legs fixed and preserves face proportions', () => {
  const data = { lean: 6, lift: 1.1 };
  for (const height of [-.1, 0, .1, .24]) assert.deepEqual(mujicaBodyOffset(data, height), { x: 0, y: -0 });
  assert.deepEqual(mujicaBodyOffset(data, .9), mujicaBodyOffset(data, 1));
  assert.deepEqual(mujicaBodyOffset(data, .9), { x: 6, y: -1.1 });
});

test('Mujica breathing and follow through freeze during pause and hitstop without mutating combat', () => {
  const { match, motion } = setup();
  motion(match, 0, 'idle'); match.elapsed += 40;
  const before = JSON.stringify(match), result = motion(match, 0, 'idle');
  assert.equal(JSON.stringify(match), before);
  match.freeze = 100;
  for (let i = 0; i < 10; i++) { match.elapsed += 10; assert.deepEqual(motion(match, 0, 'idle'), result); }
  match.freeze = 0; match.paused = true;
  match.elapsed += 40; assert.deepEqual(motion(match, 0, 'idle'), result);
  match.paused = false; match.elapsed += 40; assert.notDeepEqual(motion(match, 0, 'idle'), result);
});

test('reduced motion and authored mask/crawl/hit/jump drawings bypass torso motion', () => {
  const { match, f, motion } = setup();
  assert.equal(motion(match, 0, 'idle', true), null);
  for (const pose of ['mask-take', 'mask-raise', 'mask-settle', 'crawl-a', 'landing', 'jump-rise', 'getup']) {
    assert.equal(motion(match, 0, pose), null, pose);
  }
  f.stun = 100; assert.equal(motion(match, 0, 'hit-high'), null);
  f.stun = 0; f.y = 100; assert.equal(motion(match, 0, 'air-light-impact'), null);
  const other = setup(4); assert.equal(other.motion(other.match, 0, 'idle'), null);
});

test('all five characters keep authored attack phases with distinct anticipation and smooth return', () => {
  const distinct = new Set();
  for (let id = 5; id <= 9; id++) {
    const { match, f, motion, choose } = setup(id);
    f.attack = `mujica_${id}_normal_light`; const move = MOVES[f.attack];
    f.attackMs = move.start - 1;
    assert.equal(choose(match, 0), 'jab-1-windup');
    assert.ok(motion(match, 0, 'jab-1-windup').lean < 0);
    f.attackMs = move.start;
    assert.equal(choose(match, 0), 'jab-1-impact');
    const impact = motion(match, 0, 'jab-1-impact').lean; assert.ok(impact > 0); distinct.add(impact);
    f.attackMs = move.end + (move.duration - move.end) * .5;
    assert.equal(choose(match, 0), 'jab-1-recover');
    const recover = motion(match, 0, 'jab-1-recover').lean; assert.ok(recover > 0 && recover < impact);
    f.attackMs = move.duration;
    assert.equal(motion(match, 0, 'jab-1-recover').lean, 0);
  }
  assert.equal(distinct.size, 5);
});
