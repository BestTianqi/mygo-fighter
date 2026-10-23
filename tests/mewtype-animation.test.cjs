const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, MOVES } = require('../src/engine.js');
const { createAnimator } = require('../src/animation.js');
const { CHARACTERS, schemeFor, normalFor, prefixFor } = require('../src/mewtype.js');

const COMMON = ['idle','walk-contact','walk-pass','guard-standing','guard-crouch','dash-forward','dash-back',
  'jump-rise','jump-fall','landing','hit-high','hit-low','knockdown-fall','knockdown-ground','getup','victory','throw-windup','throw-release'];
const SLOTS = ['jab-1','jab-2','jab-3','heavy','crouch-light','crouch-heavy','air-light','air-heavy','skill-u','skill-i','skill-o','super'];
const CANONICAL = new Set([...COMMON,...SLOTS.flatMap(slot=>['windup','impact','recover'].map(phase=>`${slot}-${phase}`))]);
function fight(id,side=0){const m=new Match({mode:'duel',characters:side?[0,id]:[id,0]});m.start();m.advance(1000);return m;}
test('all five MewType characters choose the complete 54-frame virtual vocabulary for both players',()=>{
  assert.equal(CANONICAL.size,54);
  for(const c of CHARACTERS)for(const side of[0,1]){
    const m=fight(c.id,side),f=m.fighters[side],choose=createAnimator(),seen=new Set();
    const moves=[...schemeFor(f).base,schemeFor(f).super,
      ...['standing','crouch','air'].flatMap(stance=>['light','heavy'].map(button=>normalFor(f,button,stance))),
      prefixFor(f)+'Jab2',prefixFor(f)+'Jab3'];
    for(const attack of moves){f.attack=attack;const move=MOVES[attack];for(const[at,phase]of[[0,'windup'],[move.start,'impact'],[move.end+1,'recover']]){
      f.attackMs=at;const pose=choose(m,side);assert.equal(pose,move.visualSlot+'-'+phase,`${c.id}/${side}/${attack}`);assert.ok(CANONICAL.has(pose));seen.add(pose);
    }}
    assert.equal(seen.size,36);assert.ok(![...seen].some(pose=>pose.includes('transform')));
  }
});
test('MewType movement, reactions, landing and throw poses stay inside the 54 authored drawings',()=>{
  for(const c of CHARACTERS){const m=fight(c.id),f=m.fighters[0],choose=createAnimator(),seen=new Set();
    const take=expected=>{const pose=choose(m,0);assert.equal(pose,expected,`${c.key}/${expected}`);seen.add(pose);};
    take('idle');f.vx=400;for(const time of[1100,1210]){m.elapsed=time;const pose=choose(m,0);assert.ok(['walk-pass','walk-contact'].includes(pose));seen.add(pose);}
    f.dashMs=100;f.vx=f.facing*400;take('dash-forward');f.vx=-f.facing*400;take('dash-back');f.dashMs=0;f.vx=0;
    f.guard=true;take('guard-standing');f.crouch=true;take('guard-crouch');f.guard=false;f.stun=200;take('hit-low');
    f.stun=0;f.crouch=false;choose(m,0);f.stun=200;take('hit-high');f.stun=0;
    f.y=180;f.vy=200;take('jump-rise');f.vy=-200;take('jump-fall');f.knockdown=300;take('knockdown-fall');
    f.y=f.vy=0;take('knockdown-ground');f.knockdown=100;take('getup');f.knockdown=0;m.elapsed+=120;choose(m,0);
    f.y=100;f.vy=-50;choose(m,0);f.y=f.vy=0;m.elapsed+=10;take('landing');m.elapsed+=120;
    f.attack='throw';f.attackMs=0;take('throw-windup');f.attackMs=MOVES.throw.start;take('throw-release');f.attack=null;
    m.phase='roundOver';m.winner=0;take('victory');assert.deepEqual([...seen].sort(),[...COMMON].sort());
  }
});
test('MewType H has no form or animation, real J presses branch through three drawings, and pause freezes selection',()=>{
  for(const c of CHARACTERS){const m=fight(c.id),f=m.fighters[0],choose=createAnimator();f.energy=100;
    m.advance(10,{unified:true,transform:true});assert.equal(f.stageForm,null);assert.equal(f.energy,100);assert.equal(choose(m,0),'idle');
    m.advance(10);for(const chain of[1,2,3]){m.advance(10,{unified:true,light:true});m.advance(chain===3?140:90);
      assert.equal(choose(m,0),`jab-${chain}-impact`);if(chain<3)m.advance(chain===1?40:50);
    }
    m.setPaused(true);const before=JSON.stringify(f),pose=choose(m,0);m.advance(2000);assert.equal(JSON.stringify(f),before);assert.equal(choose(m,0),pose);
  }
});
test('MewType KO, time-over loss and draws always select authored result drawings',()=>{
  for(const c of CHARACTERS)for(const phase of['roundOver','finished']){const m=new Match({mode:'duel',characters:[c.id,c.id]}),choose=createAnimator();
    m.phase=phase;m.winner=0;m.fighters[1].hp=0;assert.equal(choose(m,0),'victory');assert.equal(choose(m,1),'knockdown-ground');
    m.fighters[1].hp=50;assert.equal(choose(m,1),'hit-low');m.winner=-1;assert.equal(choose(m,0),'idle');assert.equal(choose(m,1),'idle');
  }
});
