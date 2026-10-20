const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, MOVES, moveList } = require('../src/engine.js');
const { createAnimator } = require('../src/animation.js');
function game(side=0,extra={}) {const m=new Match({mode:'duel',characters:side?[0,3]:[3,0],...extra});m.start();m.advance(1000);m.fighters[side].energy=100;return m;}
function cast(m,side=0) {m.advance(10,...(side?[{}, {rush:true}]:[{rush:true},{}]));}
test('parfait belongs to Rana, V costs 25, requires ground and appears with 2P End',()=>{
  const m=game();cast(m);assert.equal(m.fighters[0].attack,'ranaParfait');assert.equal(m.fighters[0].energy,75);
  for(const kind of ['low','air']){const n=game();if(kind==='low')n.fighters[0].energy=24;else n.fighters[0].y=130;cast(n);assert.equal(n.fighters[0].attack,null);}
  const move=moveList(3).find(m=>m.key==='ranaParfait');assert.ok(move.command.includes('End'));assert.equal(move.cost,25);
  for(const c of [0,1,2])assert.ok(moveList(c).every(m=>m.key!=='ranaParfait'));
});
test('parfait rises then falls, hits exactly once for 18 in both directions and explodes once',()=>{
  for(const side of [0,1]){
    const m=game(side),a=m.fighters[side],b=m.fighters[1-side];b.x=a.x+a.facing*600;
    cast(m,side);m.advance(230);assert.equal(m.waves.length,1);const first=m.waves[0].y;
    assert.equal(m.waves[0].gravity,420);m.advance(400);assert.ok(m.waves[0].y>first);
    const top=m.waves[0].y;m.advance(200);assert.ok(m.waves[0].y<top);
    m.advance(1200);assert.equal(b.hp,182);assert.equal(m.waves.length,0);
    const events=m.drainEvents();assert.equal(events.filter(e=>e.type==='hit'&&e.attack==='ranaParfait').length,1);
    assert.equal(events.filter(e=>e.type==='parfaitSplash').length,1);
  }
});
test('parfait can be guarded, intercepted by frontal steel and clashed by another projectile',()=>{
  const m=game();m.fighters[1].x=700;cast(m);m.advance(1700,{}, {guard:true});assert.equal(m.fighters[1].hp,198);
  const s=game();s.fighters[1].x=700;s.fighters[1].shield={hp:40,ms:3000,hitMs:0};cast(s);s.advance(1700);
  assert.equal(s.fighters[1].hp,200);assert.equal(s.fighters[1].shield.hp,22);
  const c=game();c.spawnWave(0,'ranaParfait');const cup=c.waves[0];c.waves.push({...cup,attack:'wave',owner:1,vx:-cup.vx});c.updateWaves();
  assert.equal(c.waves.length,0);assert.equal(c.drainEvents().filter(e=>e.type==='parfaitSplash').length,1);
});
test('whiff lands on terrain, clears without damage and does not alter straight projectiles',()=>{
  const m=game();m.fighters[1].x=1500;cast(m);m.advance(1800);
  assert.equal(m.waves.length,0);assert.equal(m.fighters[1].hp,200);
  assert.equal(m.drainEvents().filter(e=>e.type==='parfaitSplash').length,1);
  m.spawnWave(0,'ranaPick');const y=m.waves[0].y;m.updateWaves();assert.equal(m.waves[0].y,y);
  const t=game(0,{terrain:{ground:[{x:-720,y:0},{x:600,y:260},{x:1680,y:260}]}});
  t.fighters[1].x=1500;cast(t);t.advance(2200);assert.equal(t.waves.length,0);
});
test('pause freezes parabola and restart clears cup; interruption before release emits nothing',()=>{
  const m=game();cast(m);m.advance(260);m.setPaused(true);const frozen=JSON.stringify(m.waves);m.advance(1000);assert.equal(JSON.stringify(m.waves),frozen);
  m.setPaused(false);m.advance(100);assert.notEqual(JSON.stringify(m.waves),frozen);m.restart();assert.equal(m.waves.length,0);
  const n=game();cast(n);n.hit(1,'light');n.advance(1000);assert.equal(n.waves.length,0);assert.equal(n.fighters[0].energy,83);
});
test('throw animation has ready, windup, release, recovery; CPU can cast from range',()=>{
  const m=game();cast(m);const choose=createAnimator();
  for(const [ms,name] of [[0,'parfait-ready'],[120,'parfait-windup'],[240,'parfait-release'],[450,'parfait-recover']]){
    m.fighters[0].attackMs=ms;assert.equal(choose(m,0),name);
  }
  const c=game(1,{mode:'cpu',seed:128});c.fighters[1].energy=30;c.fighters[1].x=850;c.aiThink=0;c.advance(30);
  assert.equal(c.fighters[1].attack,'ranaParfait');
});
