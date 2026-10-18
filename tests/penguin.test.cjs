const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, MOVES, moveList } = require('../src/engine.js');
const { createAnimator } = require('../src/animation.js');
function fight(options={}){const m=new Match({mode:'duel',characters:[2,0],...options});m.start();m.advance(1000);m.fighters.forEach(f=>f.energy=100);return m;}
function morph(m,side=0){const input=[{},{}];input[side]={heal:true};m.advance(10,...input);assert.equal(m.fighters[side].attack,null);assert.equal(m.fighters[side].penguin?.ms,20000);m.advance(550);return m.fighters[side];}
test('G transforms Tomori immediately, costs 50, lasts 20 seconds and cannot refresh the form',()=>{
  const m=fight(),a=m.fighters[0];a.hp=55;m.advance(10,{heal:true});assert.equal(a.energy,50);
  assert.equal(a.penguin.ms,20000);assert.equal(a.attack,null);assert.equal(a.cooldown,0);assert.equal(a.hp,55);m.advance(800);const group=a.penguin,ms=group.ms;
  m.advance(10,{heal:true});assert.equal(a.penguin,group);assert.equal(a.penguin.ms,ms-10);assert.equal(a.energy,50);
  m.advance(a.penguin.ms-10);assert.ok(a.penguin);m.advance(10);assert.equal(a.penguin,null);assert.equal(a.hp,55);
});
test('morph requires enough energy and ground; incoming hits no longer interrupt a transformation startup',()=>{
  for(const setup of[a=>a.energy=49,a=>{a.y=120;a.vy=0;},a=>a.character=0,a=>a.character=1]){
    const m=fight(),a=m.fighters[0];setup(a);const energy=a.energy;m.advance(10,{penguinTransform:true});m.advance(400);assert.equal(a.penguin,null);assert.equal(a.energy,energy);
  }
  const m=fight();m.fighters[0].x=420;m.fighters[1].x=485;m.advance(10,{heal:true},{light:true});m.advance(500);
  assert.ok(m.fighters[0].penguin);assert.equal(m.fighters[0].energy,58);assert.ok(m.fighters[0].hp<100);
});
test('instant transformation allows movement, dash, jump and an immediate follow-up skill',()=>{
  for(const action of ['right','dash','jump']){
    const m=fight(),a=m.fighters[0],x=a.x;m.fighters[1].x=1200;
    m.advance(10,{heal:true,[action]:true});assert.ok(a.penguin);assert.equal(a.attack,null);
    if(action==='jump')assert.ok(a.y>0);else assert.ok(a.x>x);
  }
  const m=fight();m.advance(10,{heal:true});m.advance(10,{wave:true});assert.equal(m.fighters[0].attack,'penguinHey');
});
test('pause freezes form and attacks, while expiry cancels form-only attacks without changing resources',()=>{
  const m=fight(),a=morph(m);a.energy=100;m.advance(10,{sonic:true});m.advance(100);m.setPaused(true);
  const before=JSON.stringify(m);m.advance(5000);assert.equal(JSON.stringify(m),before);m.setPaused(false);
  a.penguin.ms=30;const hp=a.hp,energy=a.energy;m.advance(30);assert.equal(a.penguin,null);assert.equal(a.attack,null);assert.equal(a.hp,hp);assert.equal(a.energy,energy);
  m.advance(200);m.advance(10,{sonic:true});assert.equal(a.attack,'tomoriEcho');
});
test('restart and round end clear the form; two Tomoris have independent forms and timers',()=>{
  const m=fight({characters:[2,2]});const a=morph(m),b=m.fighters[1];assert.equal(b.penguin,null);morph(m,1);
  assert.notEqual(a.penguin,b.penguin);assert.ok(a.penguin.ms<b.penguin.ms);b.hp=0;m.advance(10);assert.equal(m.phase,'roundOver');assert.ok(m.fighters.every(f=>!f.penguin));
  m.restart();m.advance(1000);m.fighters[0].energy=100;morph(m);m.restart();assert.equal(m.fighters[0].penguin,null);
});
test('form has eighteen stance normals plus five video-inspired skills, isolated from other characters',()=>{
  const moves=moveList(2,true);assert.equal(moves.filter(m=>m.penguinNormal).length,18);
  for(const key of['penguinKick','penguinCry','penguinHey','penguinLaugh','penguinCall'])assert.ok(moves.some(m=>m.key===key));
  assert.ok(!moves.some(m=>m.key==='tomoriChorus'||m.key==='penguinTransform'));
  assert.ok(moveList(2).some(m=>m.key==='penguinTransform'));assert.ok(!moveList(2).some(m=>m.penguinOnly));
  for(const c of[0,1])assert.ok(!moveList(c).some(m=>m.penguinOnly||m.key==='penguinTransform'));
  const n=fight();n.advance(10,{penguinHey:true});assert.equal(n.fighters[0].attack,null);
});
test('all six buttons resolve standing, crouching and airborne penguin normals',()=>{
  const buttons=['light','medium','heavy','lightKick','mediumKick','heavyKick'];
  for(const stance of['standing','crouch','air'])for(const button of buttons){
    const m=fight(),a=morph(m);if(stance==='air'){a.y=100;a.vy=0;}
    m.advance(10,{[button]:true,crouch:stance==='crouch'});
    assert.equal(a.attack,'penguin_'+(stance==='standing'?'':stance+'_')+button);
    assert.equal(MOVES[a.attack].cost||0,0);
  }
});
test('penguin controls map to the five skills with distinct costs, leaving normal Tomori intact',()=>{
  for(const [input,attack,cost]of[['thrust','penguinKick',10],['shield','penguinCry',15],['wave','penguinHey',10],['sonic','penguinLaugh',20],['special','penguinCall',40]]){
    const m=fight(),a=morph(m);a.energy=100;m.advance(10,{[input]:true});assert.equal(a.attack,attack);assert.equal(a.energy,100-cost);
  }
  const n=fight();n.advance(10,{wave:true});assert.equal(n.fighters[0].attack,'tomoriNote');
});
test('cry counters one frontal strike with a returning wave, but startup, rear hits and throws beat it',()=>{
  const m=fight(),a=morph(m);a.x=420;m.fighters[1].x=485;a.energy=100;
  m.advance(10,{shield:true});m.advance(120);m.hit(1,'heavy');assert.equal(a.hp,100);assert.equal(a.attack,null);
  assert.ok(m.waves.some(w=>w.owner===0&&w.attack==='penguinCryWave'));m.advance(1000);assert.ok(m.fighters[1].hp<100);
  for(const mode of['startup','rear','throw']){
    const n=fight(),p=morph(n);p.x=420;n.fighters[1].x=485;p.energy=100;n.advance(10,{shield:true});
    if(mode!=='startup')n.advance(120);if(mode==='rear')n.fighters[1].x=350;
    n.hit(1,mode==='throw'?'throw':'heavy');assert.ok(p.hp<100);assert.ok(!n.waves.some(w=>w.attack==='penguinCryWave'));
  }
});
test('hey hits once; laughter covers nearby opponents on either side and respects guard',()=>{
  const m=fight(),a=morph(m);a.x=300;m.fighters[1].x=470;a.energy=100;m.advance(10,{wave:true});m.advance(1200);
  assert.equal(m.fighters[1].hp,90);
  for(const rear of[false,true]){const n=fight(),p=morph(n);p.x=480;n.fighters[1].x=rear?350:610;p.energy=100;
    n.advance(10,{sonic:true});n.advance(700);assert.equal(n.fighters[1].hp,88);}
  const g=fight(),p=morph(g);p.x=400;g.fighters[1].x=520;p.energy=100;g.advance(10,{sonic:true},{guard:true});g.advance(700,{}, {guard:true});assert.equal(g.fighters[1].hp,97);
  const r=fight(),q=morph(r);q.x=480;r.fighters[1].x=610;q.energy=100;r.advance(10,{sonic:true});r.fighters[1].x=350;r.advance(200);
  assert.ok(r.fighters[1].vx<0,'a rear shock must push away from its center');
});
test('gugugaga releases three real projectiles, can be blocked and stops unreleased pulses when interrupted',()=>{
  const m=fight(),a=morph(m);a.x=300;m.fighters[1].x=470;a.energy=100;m.advance(10,{special:true});m.advance(1900);
  const hits=m.drainEvents().filter(e=>e.type==='hit'&&e.attack==='penguinCall');assert.equal(hits.length,3);assert.equal(a.hitMarks.length,3);
  const n=fight(),p=morph(n);n.fighters[1].x=900;p.energy=100;n.advance(10,{special:true});n.advance(200);assert.equal(n.waves.length,1);
  n.hit(1,'light');n.advance(500);assert.equal(p.hitMarks.length,1);assert.equal(n.waves.length,1);
});
test('flying kick moves forward, can hit, lands with recovery and cannot be repeated in one jump',()=>{
  const m=fight(),a=morph(m);a.x=300;m.fighters[1].x=460;a.energy=100;m.advance(10,{thrust:true});assert.ok(a.vy>0);assert.ok(a.airUsed);
  m.advance(700);assert.ok(a.x>350);assert.ok(m.fighters[1].hp<100);assert.ok(m.grounded(a));
  const n=fight(),p=morph(n);p.y=150;p.vy=0;p.energy=100;p.airUsed=true;n.advance(10,{thrust:true});assert.equal(p.attack,null);assert.equal(p.energy,100);
});
test('landing after a full penguin jump restores the air action for the next jump',()=>{
  const m=fight(),a=morph(m);m.fighters[1].x=1000;
  for(const button of ['light','lightKick']){
    m.advance(10,{jump:true});m.advance(170);m.advance(10,{[button]:true});
    assert.equal(a.attack,'penguin_air_'+button);assert.equal(a.airUsed,true);
    m.advance(1200);assert.ok(m.grounded(a));assert.equal(a.airUsed,false);assert.equal(a.vy,0);
  }
});
test('the form moves faster, supports low ground and elevated platforms, and is usable by CPU',()=>{
  const m=fight({terrain:{ground:[{x:-720,y:-160},{x:1680,y:-160}],platforms:[{left:200,right:500,height:-80}]}}),a=m.fighters[0];
  a.y=-80;morph(m);m.advance(1000,{left:true});assert.ok(a.x<40);assert.ok(m.grounded(a));assert.equal(a.y,-160);
  const c=fight({mode:'cpu',characters:[0,2]});c.fighters[1].hp=50;c.aiThink=0;c.advance(10);assert.ok(c.fighters[1].penguin);assert.equal(c.fighters[1].attack,null);
});
test('penguin uses a separate animated silhouette and returns to the normal microphone idle on expiry',()=>{
  const m=fight(),a=morph(m),choose=createAnimator();assert.equal(choose(m,0),'idle');
  for(const [attack,pose]of[['penguinKick','flying-kick'],['penguinCry','cry-counter'],['penguinHey','hey-release'],['penguinLaugh','laugh-release'],['penguinCall','call-release'],['penguin_light','flipper-light'],['penguin_heavyKick','kick-heavy']]){
    a.attack=attack;a.attackMs=MOVES[attack]?.start||200;assert.equal(choose(m,0),pose);
  }
  a.attack='penguin_crouch_light';a.attackMs=100;assert.equal(choose(m,0),'crouch-flipper');
  a.attack='penguin_air_lightKick';a.attackMs=100;assert.equal(choose(m,0),'air-kick');
  a.attack=null;a.penguin.ms=10;m.advance(10);assert.equal(a.penguin,null);assert.equal(choose(m,0),'idle');
});
