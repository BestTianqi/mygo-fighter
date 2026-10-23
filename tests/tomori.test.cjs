const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, ROSTER, MOVES, moveList } = require('../src/engine.js');
const { createAnimator } = require('../src/animation.js');
function fight(options={}) { const m=new Match({mode:'duel',characters:[2,0],...options});m.start();m.advance(1000);m.fighters.forEach(f=>f.energy=100);return m; }
test('Tomori has a full identity, unique voice moves and none of the other girls exclusive skills',()=>{
  assert.equal(ROSTER[2].shortName,'灯');assert.equal(ROSTER[2].role,'主唱');assert.equal(ROSTER[2].skill,'迷途之歌');
  const keys=moveList(2).map(m=>m.key);assert.deepEqual(keys.sort(),['light','heavy','throw','tomoriNote','tomoriEcho','tomoriChorus','tomoriSuper','penguinTransform'].sort());
  for(const character of[0,1])assert.ok(!moveList(character).some(m=>m.tomoriOnly));
  for(const [input,move,cost]of[['wave','tomoriNote',20],['sonic','tomoriEcho',30],['special','tomoriChorus',60]]){
    const m=fight();m.advance(10,{[input]:true});assert.equal(m.fighters[0].attack,move);assert.equal(m.fighters[0].energy,100-cost);
  }
});
test('voice casts require Tomori, enough energy and ground, including elevated platforms',()=>{
  for(const input of['wave','sonic','special'])for(const setup of[a=>a.energy=0,a=>{a.y=100;a.vy=0;}]){
    const m=fight();setup(m.fighters[0]);m.advance(10,{[input]:true});assert.equal(m.fighters[0].attack,null);
  }
  for(const character of[0,1]){const m=fight({characters:[character,2]});m.advance(10,{tomoriEcho:true});assert.equal(m.fighters[0].attack,null);}
  const m=fight({terrain:{platforms:[{left:200,right:500,height:80}]}});m.fighters[0].y=80;m.advance(10,{sonic:true});assert.equal(m.fighters[0].attack,'tomoriEcho');
});
test('I and T produce distinct single projectiles, deal their own damage and travel on either side',()=>{
  for(const [input,damage]of[['wave',12],['sonic',18]])for(const mirror of[false,true]){
    const m=fight(),a=m.fighters[0],b=m.fighters[1];a.x=mirror?650:280;b.x=mirror?350:580;
    m.advance(10,{[input]:true});m.advance(1400);
    assert.equal(b.hp,200-damage);assert.equal(m.drainEvents().filter(e=>e.type==='hit').length,1);
  }
});
test('L sings three separate travelling pulses for one cost, including after the first pulse connects',()=>{
  const m=fight(),a=m.fighters[0],b=m.fighters[1];a.x=300;b.x=470;
  m.advance(10,{special:true});m.advance(1900);
  const hits=m.drainEvents().filter(e=>e.type==='hit'&&e.attack==='tomoriChorus');
  assert.equal(hits.length,3);assert.ok(b.hp<180);assert.equal(a.hitMarks.length,3);
  assert.ok(a.energy<100);assert.equal(m.fighters[0].x,300);
});
test('interrupting singing stops remaining emissions without deleting already released notes',()=>{
  const m=fight(),a=m.fighters[0];m.fighters[1].x=900;m.advance(10,{special:true});m.advance(280);
  assert.equal(m.waves.length,1);m.hit(1,'light');m.advance(450);
  assert.equal(a.attack,null);assert.equal(a.hitMarks.length,1);assert.equal(m.waves.length,1);
});
test('voice projectiles can be guarded, intercepted by steel and cancelled by another projectile',()=>{
  const g=fight();g.advance(10,{sonic:true});g.advance(1600,{}, {guard:true});assert.equal(g.fighters[1].hp,197);
  const s=fight();s.advance(10,{}, {shield:true});s.advance(500);s.advance(10,{sonic:true});s.advance(1600);
  assert.equal(s.fighters[1].hp,200);assert.ok(s.fighters[1].shield.hp<40);
  const c=fight();c.advance(10,{wave:true},{wave:true});c.advance(1600);
  assert.deepEqual(c.fighters.map(f=>f.hp),[200,200]);assert.ok(c.drainEvents().some(e=>e.type==='clash'));
});
test('pause freezes the full chorus and restart clears waves while preserving Tomori selection',()=>{
  const m=fight();m.advance(10,{special:true});m.advance(300);m.setPaused(true);const before=JSON.stringify(m);
  m.advance(3000);assert.equal(JSON.stringify(m),before);m.setPaused(false);m.advance(1000);
  m.restart();assert.equal(m.fighters[0].character,2);assert.equal(m.fighters[0].attack,null);assert.deepEqual(m.waves,[]);
});
test('Tomori normal reach uses her compact profile and U remains a real throw',()=>{
  const m=fight();m.fighters[0].x=300;m.fighters[1].x=530;m.advance(10,{light:true});m.advance(400);
  assert.equal(m.fighters[1].hp,200);
  m.fighters[1].x=360;m.advance(10,{shield:true});m.advance(120);assert.equal(m.fighters[1].hp,182);
});
test('CPU Tomori chooses her voice kit through ordinary input at range',()=>{
  for(const [energy,attack] of [[60,'tomoriChorus'],[100,'tomoriSuper']]){
    const m=fight({mode:'cpu',characters:[0,2],difficulty:2});m.fighters[1].energy=energy;m.aiThink=0;m.advance(10);
    assert.equal(m.fighters[1].attack,attack);assert.equal(m.fighters[1].energy,0);
  }
});
test('Tomori uses microphone idle, compact strikes and all three distinct singing poses',()=>{
  const m=fight(),a=m.fighters[0],choose=createAnimator();assert.equal(choose(m,0),'idle');
  for(const [attack,pose]of[['light','mic-light'],['heavy','mic-heavy'],['tomoriNote','note-release'],['tomoriEcho','echo-release'],['tomoriChorus','chorus-release']]){
    a.attack=attack;a.attackMs=MOVES[attack]?.start||200;assert.equal(choose(m,0),pose);
  }
  a.attack='tomoriEcho';a.attackMs=0;assert.equal(choose(m,0),'echo-windup');
  a.attack='tomoriChorus';a.attackMs=0;assert.equal(choose(m,0),'echo-windup');
  a.attack=null;a.y=10;a.vy=580;assert.equal(choose(m,0),'jump-rise');
  a.y=a.vy=0;a.guard=true;assert.equal(choose(m,0),'guard-standing');
  a.crouch=true;assert.equal(choose(m,0),'guard-crouch');
  m.phase='roundOver';m.winner=0;assert.equal(choose(m,0),'victory');
});
