const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, MOVES } = require('../src/engine.js');
const { createAnimator } = require('../src/animation.js');
const { CHARACTERS, schemeFor, normalFor } = require('../src/mujica.js');

test('all ten Mujica forms select distinct windup, impact and recovery art for every combat input', () => {
  for (const c of CHARACTERS) for (const form of ['normal', 'stage']) {
    const m = new Match({ mode: 'duel', characters: [c.id, 0] }); m.start(); m.advance(1000);
    const f = m.fighters[0], choose = createAnimator();
    if (form === 'stage') f.stageForm = { ms: 19000 };
    const moves = [...schemeFor(f).base, schemeFor(f).super,
      ...['standing', 'crouch', 'air'].flatMap(stance => ['light', 'heavy'].map(button => normalFor(f, button, stance))),
      `mujica_${c.id}_${form}Jab2`, `mujica_${c.id}_${form}Jab3`];
    for (const attack of moves) {
      f.attack = attack; const move = MOVES[attack]; assert.ok(move, attack);
      for (const [at, phase] of [[0,'windup'],[move.start,'impact'],[move.end + 1,'recover']]) {
        f.attackMs = at; assert.equal(choose(m,0), move.crawl ? ({windup:'crawl-windup',impact:'crawl-a',recover:'crawl-recover'})[phase] : move.visualSlot + '-' + phase, attack);
      }
    }
    f.attack = 'throw';f.attackMs = 0;assert.equal(choose(m,0),'throw-windup');
    f.attackMs = MOVES.throw.start;assert.equal(choose(m,0),'throw-release');
    f.attack = null;assert.equal(choose(m,0),'idle');
  }
});
test('Mujica movement, guard, hit and knockdown select actual named poses', () => {
  const m = new Match({ mode:'duel', characters:[6,9] });m.start();m.advance(1000);
  const f=m.fighters[0],choose=createAnimator();assert.equal(choose(m,0),'idle');
  f.vx=400;assert.ok(['walk-pass','walk-contact'].includes(choose(m,0)));
  f.dashMs=100;f.vx=-100;assert.equal(choose(m,0),'dash-back');
  f.dashMs=0;f.vx=0;f.guard=true;assert.equal(choose(m,0),'guard-standing');
  f.crouch=true;assert.equal(choose(m,0),'guard-crouch');
  f.guard=f.crouch=false;f.y=180;f.vy=50;assert.equal(choose(m,0),'jump-rise');
  f.vy=-50;assert.equal(choose(m,0),'jump-fall');
  f.knockdown=300;assert.equal(choose(m,0),'knockdown-fall');
  f.y=f.vy=0;assert.equal(choose(m,0),'knockdown-ground');
  f.knockdown=100;assert.equal(choose(m,0),'getup');
});

test('round results keep a named drawing for both Mujica fighters, including a draw', () => {
  for (const character of CHARACTERS) for (const phase of ['roundOver', 'finished']) {
    const m = new Match({ mode:'duel', characters:[character.id, character.id] }), choose = createAnimator();
    m.phase=phase;m.winner=0;m.fighters[1].hp=0;
    assert.equal(choose(m,0),'victory');assert.equal(choose(m,1),'knockdown-ground');
    m.fighters[1].hp=50;assert.equal(choose(m,1),'hit-low');
    m.winner=-1;assert.equal(choose(m,0),'idle');assert.equal(choose(m,1),'idle');
  }
});
