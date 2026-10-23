const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Match,MOVES,WORLD,moveList}=require('../src/engine.js');
const {schemeFor}=require('../src/controls.js');
const {createAnimator}=require('../src/animation.js');
function fight(character,side=0,stage=false,penguin=false,terrain){
  const m=new Match({mode:'duel',characters:side?[0,character]:[character,0],terrain});m.start();m.advance(1000);
  const a=m.fighters[side],b=m.fighters[1-side];a.energy=100;a.x=side?700:300;b.x=side?540:460;
  if(stage)a.stageForm={ms:20000};if(penguin)a.penguin={ms:20000};return m;
}
function press(m,side,input){m.advance(10,side?{}:{unified:true,...input},side?{unified:true,...input}:{});}
function finish(m,attack,side=0,guard=false){m.advance(MOVES[attack].duration+4000,side&&guard?{guard:true}:{},!side&&guard?{guard:true}:{});}
test('fast combat recovers independently of each original-speed recording',()=>{
  const catalog=require('../assets/meme-media/manifest.json').characters;
  for(let character=0;character<15;character++)for(const stage of character>=5&&character<10?[false,true]:[false]){
    const attack=schemeFor({character,stageForm:stage?{ms:20000}:null}).super,clip=catalog[character].slots.p;
    if(character===1)assert.equal(clip.duration,2.8); // Preserve the legacy presentation duration.
    else assert.ok(Math.abs(clip.duration-(clip.source.end-clip.source.start))<.001);
    assert.equal(clip.videoRate,1);
    if(character>0)assert.ok(MOVES[attack].duration<clip.duration*1000,`${character}/${stage} recovers before the film ends`);
  }
});

test('Rana encore keeps the real recorded phrase visible through its recovery',()=>{
  const m=fight(3);m.fighters[1].x=1400;press(m,0,{super:true});m.advance(MOVES.ranaSuper.duration-200);
  assert.equal(m.fighters[0].attack,'ranaSuper');
  m.advance(1000);assert.equal(m.fighters[0].attack,null);
});
test('Tomori super is listed for its own form and CPU can cast both recorded encores',()=>{
  for(const penguin of [false,true]){
    const own=penguin?'penguinSuper':'tomoriSuper',other=penguin?'tomoriSuper':'penguinSuper';
    assert.ok(moveList(2,penguin).some(m=>m.key===own));assert.ok(!moveList(2,penguin).some(m=>m.key===other));
    const m=fight(2,1,false,penguin);m.options.mode='cpu';m.aiThink=0;m.advance(10);
    assert.equal(m.fighters[1].attack,own);assert.equal(m.fighters[1].energy,0);
  }
});
test('Tomori and penguin P are separate owned full-cost ground supers on either player',()=>{
  for(const side of [0,1])for(const penguin of [false,true]){
    const m=fight(2,side,false,penguin),a=m.fighters[side],s=schemeFor(a);assert.equal(s.super,penguin?'penguinSuper':'tomoriSuper');
    a.energy=99;press(m,side,{super:true});assert.equal(a.attack,null);assert.equal(a.energy,99);m.advance(10);a.buffer=null;a.energy=100;
    press(m,side,{super:true});assert.equal(a.attack,s.super);assert.equal(a.energy,0);assert.equal(a.hp,200);
    const n=fight(2,side,false,penguin);n.fighters[side].y=150;press(n,side,{super:true});assert.equal(n.fighters[side].attack,null);
    const foreign=fight(0,side);foreign.fighters[side].buffer=s.super;foreign.fighters[side].bufferMs=100;foreign.advance(10);assert.equal(foreign.fighters[side].attack,null);
  }
  for(const penguin of [false,true]){
    const m=fight(2,0,false,penguin),a=m.fighters[0];a.buffer=penguin?'tomoriSuper':'penguinSuper';a.bufferMs=100;m.advance(10);assert.equal(a.attack,null);
  }
});
test('Tomori P sings three separated damaging waves, penguin P emits its own chorus, and guard works',()=>{
  for(const penguin of [false,true])for(const side of [0,1])for(const guarded of [false,true]){
    const m=fight(2,side,false,penguin),a=m.fighters[side],b=m.fighters[1-side];press(m,side,{super:true});const attack=a.attack;
    assert.ok(attack);finish(m,attack,side,guarded);
    const events=m.drainEvents(),pulses=events.filter(e=>e.type==='voicePulse'&&e.attack===attack),hits=events.filter(e=>e.type==='hit'&&e.attack===attack);
    assert.equal(pulses.length,penguin?5:3);assert.equal(hits.length,penguin?5:3);assert.ok(b.hp<200);assert.ok(hits.every(e=>e.blocked===guarded));assert.equal(a.energy,0);
    if(guarded)assert.ok(b.hp>=190);else assert.ok(b.hp<=160);
    const move=MOVES[attack];assert.equal(move.duration,penguin?1500:3600);assert.ok(penguin?move.shots.at(-1)<=1000:move.shots.at(-1)-move.shots[0]>move.duration*.5);
  }
});
test('new Tomori P poses use existing art and pause preserves chorus timers and emitted waves',()=>{
  for(const penguin of [false,true]){
    const m=fight(2,0,false,penguin),a=m.fighters[0],choose=createAnimator();press(m,0,{super:true});const move=MOVES[a.attack];assert.ok(move);
    a.attackMs=0;assert.equal(choose(m,0),penguin?'call-windup':'echo-windup');a.attackMs=move.start;assert.equal(choose(m,0),penguin?'call-release':'chorus-release');
    a.attackMs=move.end+150;assert.equal(choose(m,0),'normal-recover');a.attackMs=move.start-10;m.advance(10);assert.ok(m.waves.length);
    m.setPaused(true);const before=JSON.stringify(m);m.advance(10000);assert.equal(JSON.stringify(m),before);m.setPaused(false);
    m.hit(1,'heavy');m.freeze=0;const emitted=m.waves[0];m.advance(50);assert.equal(a.attack,penguin?'penguinSuper':'tomoriSuper');assert.ok(a.hp<200);assert.ok(m.waves.includes(emitted));
    m.restart();assert.equal(m.waves.length,0);assert.equal(m.fighters[0].hp,200);
  }
});
test('Mujica and MewType meme supers preserve the full clip and spread real pulses through it',()=>{
  const specs={5:['练习结束后再吵',1700],6:['我来成为神明',3200],7:['Saki酱！Saki酱！',1000],8:['从来没觉得玩乐队开心过',4150],9:['完美笑容·摘下面具',1750],10:['U咩哇帕瓦',1500],11:['杂鱼～杂鱼～',1550],12:['临兵斗者皆阵列在前',5750],13:['不要丢下我',1400],14:['病娇国王',2580]};
  for(const [id,[name,duration]]of Object.entries(specs))for(const stage of Number(id)<10?[false,true]:[false]){
    const m=fight(Number(id),0,stage),a=m.fighters[0],move=MOVES[schemeFor(a).super];assert.equal(move.name,Number(id)===8&&stage?'Mortis·双生剧场':name);assert.equal(move.duration,duration);assert.equal(move.cost,100);
    assert.ok(move.pulses.at(-1).at>duration*.75);assert.ok(duration-move.end>=(Number(id)===7?50:150));assert.ok(move.invuln<=200);
    press(m,0,{super:true});a.attackMs=duration/2;assert.equal(m.invulnerable(a),false);
  }
});
test('Uika P really crawls 480 to 560 units in either direction with two alternating low poses',()=>{
  for(const side of [0,1])for(const stage of [false,true]){
    const m=fight(7,side,stage),a=m.fighters[side],b=m.fighters[1-side];b.x=side?-300:1300;const x=a.x;press(m,side,{super:true});const attack=a.attack,move=MOVES[attack],choose=createAnimator();
    assert.equal(move.projectile,undefined);assert.equal(move.targetArea,undefined);assert.equal(move.level,'low');assert.equal(choose(m,side),'crawl-windup');
    a.attackMs=move.start;assert.equal(choose(m,side),'crawl-a');a.attackMs=move.start+160;assert.equal(choose(m,side),'crawl-b');a.attackMs=0;
    m.advance(move.duration+100);assert.ok(Math.abs(a.x-x)>=480&&Math.abs(a.x-x)<=560,`${side}/${stage}: ${a.x-x}`);assert.equal(m.waves.length,0);assert.equal(a.attack,null);
    a.attack=attack;a.attackMs=move.end+1;assert.equal(choose(m,side),'crawl-recover');
  }
});
test('Uika crawl advances forward, hits low multiple times and crouch guard stops it',()=>{
  for(const side of [0,1])for(const crouch of [false,true]){
    const m=fight(7,side),a=m.fighters[side],b=m.fighters[1-side];b.x=a.x+(side?-1:1)*230;press(m,side,{super:true});const attack=a.attack;
    m.advance(400,side?{guard:true,crouch}:{},side?{}:{guard:true,crouch});assert.equal(a.crouch,true);m.setPaused(true);const before=JSON.stringify(a);m.advance(2000);assert.equal(JSON.stringify(a),before);m.setPaused(false);
    m.advance(MOVES[attack].duration+3000,side?{guard:true,crouch}:{},side?{}:{guard:true,crouch});
    const hits=m.drainEvents().filter(e=>e.type==='hit'&&e.attack===attack);assert.equal(hits.length,5);assert.ok(hits.every(e=>e.blocked===crouch));assert.ok(b.hp<200);
  }
});
test('Uika low hurtbox evades a high projectile but remains vulnerable to a ground note',()=>{
  for(const high of [true,false]){
    const m=fight(7),a=m.fighters[0];press(m,0,{super:true});a.attackMs=400;a.crouch=true;a.wakeInvuln=0;
    m.waves.push({x:a.x,y:a.y+(high?130:35),vx:0,owner:1,life:100,age:0,rx:20,ry:12,attack:'tomoriNote'});
    m.updateWaves();assert.equal(a.hp<200,!high);assert.equal(a.attack,'mujica_7_normal_super');
  }
});
test('crawl respects world and platform edges through armored hits and ends on reset',()=>{
  const terrain={platforms:[{left:200,right:500,height:200}]};
  const m=fight(7,0,false,false,terrain),a=m.fighters[0],b=m.fighters[1];a.x=400;a.y=200;b.x=900;press(m,0,{super:true});m.advance(600);
  assert.ok(a.x>=480&&a.x<=500);assert.equal(a.y,200);m.hit(1,'heavy');m.freeze=0;const x=a.x;m.advance(100);assert.equal(a.attack,'mujica_7_normal_super');assert.ok(a.hp<200);assert.equal(a.x,x);assert.equal(a.y,200);
  const n=fight(7),f=n.fighters[0];f.x=WORLD.right-100;n.fighters[1].x=WORLD.right-45;press(n,0,{super:true});n.advance(5000);assert.ok(f.x<=WORLD.right-45);n.restart();assert.equal(n.fighters[0].attack,null);
});
test('body separation at a platform edge cannot push an active crawl into the air',()=>{
  const m=fight(7,0,false,false,{platforms:[{left:200,right:500,height:200}]}),[a,b]=m.fighters;
  a.x=482;a.y=b.y=200;b.x=470;a.attack=schemeFor(a).super;a.attackMs=400;a.crouch=true;
  m.separate();assert.ok(a.x<=482&&a.x>=218);assert.equal(m.grounded(a),true);
});
test('Miyako nine-character mantra emits nine marked hits with a raw budget of forty eight',()=>{
  for(const side of [0,1]){
    const m=fight(12,side),a=m.fighters[side],b=m.fighters[1-side];press(m,side,{super:true});const attack=a.attack,move=MOVES[attack];
    assert.equal(move.pulses.length,9);assert.equal(move.pulses.reduce((sum,p)=>sum+p.damage,0),48);assert.equal(move.pulses.map(p=>p.glyph).join(''),'临兵斗者皆阵列在前');
    assert.equal(a.energy,0);finish(m,attack,side);const events=m.drainEvents(),hits=events.filter(e=>e.type==='hit'&&e.attack===attack),runes=events.filter(e=>e.type==='memePulse'&&e.attack===attack);
    assert.equal(hits.length,9);assert.equal(runes.map(e=>e.glyph).join(''),'临兵斗者皆阵列在前');assert.ok(b.hp<200&&b.hp>=152);
  }
});
test('Miyako mantra is a fixed bounded area, can be guarded or escaped, and armor preserves all nine runes',()=>{
  for(const situation of ['guard','escape','far','high','armor']){
    const m=fight(12),a=m.fighters[0],b=m.fighters[1];if(situation==='far')b.x=a.x+421;
    if(situation==='high'){m.options.terrain={platforms:[{left:400,right:800,height:301}]};b.y=301;}
    press(m,0,{super:true});const attack=a.attack;if(situation==='escape')b.x=a.x+400;
    if(situation==='armor'){a.attackMs=MOVES[attack].start;m.hit(1,'heavy');}
    finish(m,attack,0,situation==='guard');const events=m.drainEvents(),hits=events.filter(e=>e.type==='hit'&&e.attack===attack);
    if(situation==='guard'){assert.equal(hits.length,9);assert.ok(hits.every(e=>e.blocked));assert.ok(b.hp>=180);}else if(situation==='armor'){assert.equal(hits.length,9);assert.ok(a.hp<200);}else assert.equal(hits.length,0,situation);
    if(situation==='armor')assert.equal(events.filter(e=>e.type==='memePulse').length,9);
  }
});
