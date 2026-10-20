const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, MOVES, NORMAL_BUTTONS, moveList } = require('../src/engine.js');
const { createAnimator } = require('../src/animation.js');
function fight(side=0) {
  const m=new Match({mode:'duel',characters:side?[0,3]:[3,0]});m.start();m.advance(1000);
  m.fighters[side].energy=100;return m;
}
function press(m,key,side=0,extra={}) { m.advance(10,...(side?[{}, {[key]:true,...extra}]:[{[key]:true,...extra},{}])); }
test('Rana has eighteen owned normals and her own complete move list',()=>{
  const list=moveList(3);assert.equal(list.filter(m=>m.category==='normal').length,18);
  assert.ok(list.some(m=>m.key==='ranaSuper'));assert.ok(list.some(m=>m.key==='ranaTune'));
  for(const c of [0,1,2])assert.ok(moveList(c).every(m=>!m.ranaOnly));
});
test('all six buttons resolve for every Rana stance and animate their own impact',()=>{
  for(const stance of ['standing','crouch','air'])for(const button of NORMAL_BUTTONS){
    const m=fight(),f=m.fighters[0];if(stance==='air'){f.y=140;f.vy=100;}
    press(m,button,0,{crouch:stance==='crouch'});
    assert.equal(f.attack,'rana_'+(stance==='standing'?'':stance+'_')+button);
    f.attackMs=MOVES[f.attack].start;
    assert.equal(createAnimator()(m,0),stance+'-'+button);
  }
});
test('Rana shortcuts have distinct costs, only owner can use them, and insufficient energy rejects',()=>{
  for(const [key,name,cost] of [['wave','ranaPick',20],['sonic','ranaChord',30],['thrust','ranaRush',15],['rising','ranaRise',25],['shield','ranaSlide',20],['special','ranaSolo',60],['super','ranaSuper',100]]){
    const m=fight();press(m,key);assert.equal(m.fighters[0].attack,name);assert.equal(m.fighters[0].energy,100-cost);
    const low=fight();low.fighters[0].energy=cost-1;press(low,key);assert.equal(low.fighters[0].attack,null);
    const other=new Match({mode:'duel',characters:[0,0]});other.start();other.advance(1000);other.fighters[0].energy=100;press(other,name);assert.notEqual(other.fighters[0].attack,name);
  }
});
test('Rana pick, chord and four-shot solo hit, block and clash as projectiles',()=>{
  for(const key of ['wave','sonic','special']){
    const m=fight();m.fighters[1].x=530;press(m,key);m.advance(2000);
    assert.ok(m.fighters[1].hp<200,key);assert.ok(m.fighters[1].hp>145,key);
    const b=fight();b.fighters[1].x=530;press(b,key);b.advance(2000,{}, {guard:true});assert.ok(b.fighters[1].hp>=188,key);
  }
  const m=fight();m.spawnWave(0,'ranaPick');m.spawnWave(1,'wave');m.advance(800);assert.equal(m.waves.length,0);
});
test('Rana rush moves, rise launches, slide is low, dive has air gate and landing recovery',()=>{
  const m=fight(),f=m.fighters[0],x=f.x;press(m,'thrust');m.advance(180);assert.ok(f.x>x+80);
  const r=fight();press(r,'rising');assert.ok(r.fighters[0].vy>500);
  const s=fight();s.fighters[1].x=380;press(s,'shield');s.advance(300,{}, {guard:true});assert.ok(s.fighters[1].hp<200);assert.ok(s.fighters[1].knockdown>0);
  const d=fight();press(d,'dive');assert.equal(d.fighters[0].attack,null);d.advance(160);d.fighters[0].y=150;d.fighters[0].vy=0;press(d,'dive');assert.equal(d.fighters[0].attack,'ranaDive');
  d.advance(270);assert.equal(d.fighters[0].attack,null);assert.ok(d.fighters[0].landingRecovery>0);
});
test('Rana tune grants energy at release, has cooldown, is interruptible and pause freezes progress',()=>{
  const m=fight(),f=m.fighters[0];f.energy=30;press(m,'heal');assert.equal(f.attack,'ranaTune');
  m.advance(500);assert.equal(f.energy,30);m.setPaused(true);m.advance(2000);assert.equal(f.energy,30);m.setPaused(false);m.advance(350);assert.equal(f.energy,50);
  m.advance(600);press(m,'heal');assert.equal(f.attack,null);assert.ok(f.tuneCooldown>0);
  m.restart();m.advance(1000);assert.equal(m.fighters[0].tuneCooldown,0);
  const n=fight();n.fighters[0].energy=30;press(n,'heal');n.hit(1,'light');n.advance(1300);assert.ok(n.fighters[0].energy<50);
});
test('Rana super consumes 100, deals three hits, has guard chip and follows 2P input',()=>{
  const m=fight();m.fighters[1].x=390;press(m,'super');m.advance(1900);
  assert.equal(m.drainEvents().filter(e=>e.type==='hit'&&e.attack==='ranaSuper').length,3);
  assert.ok(m.fighters[1].hp<165);assert.equal(m.fighters[0].energy,0);
  const b=fight();b.fighters[1].x=390;press(b,'super');b.advance(1900,{}, {guard:true});assert.ok(b.fighters[1].hp>=190);
  const two=fight(1);press(two,'wave',1);assert.equal(two.fighters[1].attack,'ranaPick');
});
