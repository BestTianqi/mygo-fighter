const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Match,MOVES}=require('../src/engine.js');
const controls=require('../src/controls.js');
const {createAnimator}=require('../src/animation.js');
function fight(id=8,side=0){const m=new Match({mode:'duel',characters:side?[0,id]:[id,0]});m.start();m.advance(1000);m.fighters.forEach((f,i)=>{f.energy=100;f.x=400+i*160;});return m;}
function press(m,side,input,ms=10){m.advance(ms,side?{}:{unified:true,...input},side?{unified:true,...input}:{});}
test('normal hits restore twelve resonance while specials restore only two',()=>{
 for(const id of [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14]){
  const m=fight(id),a=m.fighters[0];a.energy=0;m.fighters[1].x=a.x+100;
  press(m,0,{light:true});m.advance(200);assert.equal(a.energy,12,`${id} normal`);
 }
 for(const attack of ['sonic','throw','mujica_8_stage_toddler','mujica_8_stage_burger']){const m=fight(),a=m.fighters[0];a.energy=0;m.hit(0,attack);assert.equal(a.energy,2,attack);}
 const m=fight(),a=m.fighters[0];a.energy=99;m.hit(0,'light');assert.equal(a.energy,100);
});
test('Mortis down U and down I are stage-only additions preserving her three base skills',()=>{
 const stage={character:8,stageForm:{ms:19000}},normal={character:8};
 assert.deepEqual(controls.schemeFor(stage).base,['mujica_8_stage_u','mujica_8_stage_i','mujica_8_stage_o']);
 for(const [button,attack,cost]of[['skill1','mujica_8_stage_toddler',20],['skill2','mujica_8_stage_burger',25]])for(const side of[0,1]){
  const m=fight(8,side),a=m.fighters[side];a.stageForm={ms:19000};a.energy=cost-1;press(m,side,{crouch:true,[button]:true});assert.equal(a.attack,null);
  m.release();a.energy=cost;press(m,side,{crouch:true,[button]:true});assert.equal(a.attack,attack);assert.equal(a.energy,0);
  for(const id of[0,7,8,9]){const n=fight(id),b=n.fighters[0];b.buffer=attack;b.bufferMs=100;n.advance(10);assert.equal(b.attack,null,`${id} cannot inject a stage move`);}
 }
 assert.deepEqual(controls.schemeFor(normal).variants,{});
});
test('toddler cry hits front and rear once while the burger is a real forward projectile',()=>{
 for(const behind of[false,true]){const m=fight(),[a,b]=m.fighters;a.stageForm={ms:19000};b.x=a.x+(behind?-150:150);press(m,0,{crouch:true,skill1:true});m.advance(1400);const es=m.drainEvents().filter(e=>e.type==='hit'&&e.attack==='mujica_8_stage_toddler');assert.equal(es.length,1);assert.equal(es[0].damage,14);}
 for(const side of[0,1]){const m=fight(8,side),a=m.fighters[side],b=m.fighters[1-side];a.stageForm={ms:19000};b.x=a.x+(side?-1:1)*400;press(m,side,{crouch:true,skill2:true});m.advance(200);assert.equal(m.waves.length,1);assert.equal(Math.sign(m.waves[0].vx),side?-1:1);m.advance(1500);assert.equal(b.hp,182);}
});
test('all five H transformations show take, raise and settle mask drawings without delaying attacks',()=>{
 for(let id=5;id<10;id++){const m=fight(id),a=m.fighters[0],choose=createAnimator();press(m,0,{transform:true});assert.equal(a.energy,50);assert.equal(choose(m,0),'mask-take');m.advance(240);assert.equal(choose(m,0),'mask-raise');m.advance(220);assert.equal(choose(m,0),'mask-settle');m.setPaused(true);const state=JSON.stringify(a);m.advance(2000);assert.equal(JSON.stringify(a),state);m.setPaused(false);press(m,0,{skill1:true});assert.equal(a.attack,`mujica_${id}_stage_u`);}
});
