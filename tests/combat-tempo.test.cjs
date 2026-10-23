const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, MOVES } = require('../src/engine.js');
function fight(character=0) {
  const m=new Match({mode:'duel',characters:[character,0]});m.start();m.advance(1000);
  m.fighters.forEach((f,i)=>{f.energy=100;f.x=400+i*150;});return m;
}
test('normal attacks trade lower damage for a longer recovery',()=>{
  assert.equal(MOVES.light.damage,6);assert.equal(MOVES.light.duration,380);
  assert.equal(MOVES.anonJab3.damage,13);assert.equal(MOVES.anonJab3.duration,530);
  const m=fight();m.hit(0,'heavy');assert.equal(m.fighters[1].hp,188);
});
test('normal hits gain twelve resonance and skills gain only two',()=>{
  for(const move of ['light','sonic','throw']){
    const m=fight();m.fighters[0].energy=0;m.hit(0,move);assert.equal(m.fighters[0].energy,move==='light'?12:2,move);
  }
});
test('blink and dash cost ten once and fail without enough resonance',()=>{
  for(const unified of [false,true]){
    const m=fight(),a=m.fighters[0];a.energy=9;const x=a.x;
    m.advance(10,{unified,right:true,[unified?'blink':'dash']:true});assert.equal(a.dashCooldown,0);assert.equal(a.energy,9);
    m.release();a.energy=10;m.advance(10,{unified,right:true,[unified?'blink':'dash']:true});
    assert.ok(a.x>x);assert.equal(a.energy,0);
    m.advance(100,{unified,right:true,[unified?'blink':'dash']:true});assert.equal(a.energy,0);
  }
});
test('penguin releases all five radial waves within one real second even when they connect',()=>{
  const m=fight(2),a=m.fighters[0];a.penguin={ms:20000};
  m.advance(10,{unified:true,super:true});m.advance(1000);
  assert.equal(m.drainEvents().filter(e=>e.type==='voicePulse'&&e.attack==='penguinSuper').length,5);
});
test('Uika crawls forward for one second, hits five times for exactly ten, and then recovers',()=>{
  for(const stage of [false,true]){
    const m=fight(7),a=m.fighters[0],b=m.fighters[1];if(stage)a.stageForm={ms:20000};const x=a.x;
    m.advance(10,{unified:true,super:true});const attack=a.attack;m.advance(1000);
    assert.equal(a.attack,null);assert.ok(a.x>x);
    assert.deepEqual(m.drainEvents().filter(e=>e.type==='hit'&&e.attack===attack).map(e=>e.damage),[10,10,10,10,10]);
    assert.equal(b.hp,150);
  }
});
test('supers speed up while Anon and Soyo hard-control duration retain their authored timing',()=>{
  assert.equal(MOVES.tomoriSuper.duration,3600);assert.equal(MOVES.rikiSuper.duration,2200);
  assert.equal(MOVES.mujica_8_stage_super.duration,4150);assert.equal(MOVES.mewtype_12_virtual_super.duration,5750);
  assert.equal(MOVES.super.duration,2600);assert.equal(MOVES.soyoSuper.hardStun,2000);
});
