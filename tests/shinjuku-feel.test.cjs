const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Match,ROSTER,MOVES,FEEL}=require('../src/engine.js');
const {Camera}=require('../src/camera.js');
const scale=235/54;
function setup(character=0){const m=new Match({mode:'duel',characters:[character,0]});m.start();m.advance(1000);m.fighters[1].x=1500;m.fighters[0].energy=100;return m;}
test('baseline walking, air speed and screen scale match reference body-normalized values',()=>{
  const m=setup(),a=m.fighters[0],x=a.x;m.advance(1000,{right:true});
  assert.ok(Math.abs((a.x-x)/(109.2*scale)-1)<.025);
  a.y=180;a.vy=200;m.advance(60,{right:true});assert.ok(Math.abs(a.vx/(82.8*scale)-1)<.025);
  const c=new Camera();a.y=0;m.fighters[1].x=a.x+400;c.reset(m);
  assert.ok(Math.abs(235*c.zoom/540-.25)<.012);
});
test('jump height and flight time match reference and a second press gives exactly one air jump',()=>{
  const m=setup(),a=m.fighters[0];m.advance(10,{jump:true});let top=a.y,time=10;
  while(!m.grounded(a)&&time<1200){m.advance(10);top=Math.max(top,a.y);time+=10;}
  const target=275*275/(2*760)*scale;
  assert.ok(Math.abs(top/target-1)<.05,{top,target});assert.ok(time>=690&&time<=760,time);
  m.advance(10,{jump:true});m.advance(220);m.advance(10,{jump:true});assert.ok(a.vy>900);
  m.advance(50);const before=a.vy;m.advance(10,{jump:true});assert.ok(a.vy<before,'third jump must not reset velocity');
});
test('air dash has reference distance, cooldown and initial invulnerability without defying gravity',()=>{
  const m=setup(),a=m.fighters[0];m.advance(10,{jump:true});m.advance(130);const x=a.x,y=a.y;
  m.advance(10,{dash:true,right:true});assert.ok(a.dashMs>0);m.hit(1,'light');assert.equal(a.hp,200);
  m.advance(120);m.hit(1,'light');assert.equal(a.hp,194,'late dash recovery can be punished');
  const n=setup(),b=n.fighters[0];n.advance(10,{jump:true});n.advance(130);const start=b.x;n.advance(10,{dash:true,right:true});n.advance(170);
  assert.ok(Math.abs((b.x-start)/(5.15*11*scale)-1)<.05);assert.notEqual(b.y,y);assert.ok(b.dashCooldown>=400&&b.dashCooldown<=440);
});
test('successive light presses branch into three attacks on whiff and on hit',()=>{
  for(const character of [0,1,2,3]){
    const m=setup(character),a=m.fighters[0];m.advance(10,{light:true});m.advance(130);m.advance(10,{light:true});
    assert.equal(MOVES[a.attack].chain,2);m.advance(150);m.advance(10,{light:true});assert.equal(MOVES[a.attack].chain,3);
  }
  for(const character of [0,1,2,3,'penguin'])for(const guard of [false,true]){
    const m=setup(character==='penguin'?2:character),a=m.fighters[0],b=m.fighters[1];
    if(character==='penguin')a.penguin={ms:20000};b.x=a.x+130;
    const defender={guard};m.advance(10,{light:true},defender);
    while(a.attackMs<140)m.advance(10,{},defender);
    m.advance(10,{light:true},defender);assert.equal(MOVES[a.attack].chain,2);
    while(a.attackMs<150)m.advance(10,{},defender);
    m.advance(10,{light:true},defender);assert.equal(MOVES[a.attack].chain,3);
    while(a.attackMs<210)m.advance(10,{},defender);
    const hits=m.drainEvents().filter(e=>e.type==='hit');assert.equal(hits.length,3,JSON.stringify({character,guard,hits}));
    assert.equal(a.combo,guard?0:3);if(!guard)assert.ok(b.vy>500);
  }
});
test('special input buffers for 300ms while a whiff recovers, without re-triggering held keyboard attacks',()=>{
  const m=setup(),a=m.fighters[0];a.energy=100;m.advance(10,{light:true});m.advance(150);m.advance(10,{wave:true});m.advance(260);
  assert.equal(a.attack,'wave');
  const n=setup();n.advance(900,{light:true});assert.equal(n.drainEvents().filter(e=>e.type==='attack').length,1);
});
test('hitstop matches four/five/eight reference frames and stronger simultaneous impacts win',()=>{
  const values=[];for(const key of ['light','medium','heavy']){const m=setup();m.hit(0,key);values.push(m.freeze);}
  assert.deepEqual(values,[70,80,130]);
  const m=setup();m.hit(0,'heavy');m.hit(0,'light');assert.equal(m.freeze,130);
  const block=setup();block.fighters[1].guard=true;block.hit(0,'light');assert.equal(block.freeze,50);assert.equal(block.fighters[1].stun,150);
});
test('ground recoil stops linearly, while air recoil survives hitstun and air hits relaunch',()=>{
  const m=setup(),b=m.fighters[1],start=b.x;m.hit(0,'light');m.freeze=0;m.advance(100);
  assert.equal(b.pushVx,0);assert.ok(b.x-start>8&&b.x-start<11);
  b.y=300;b.vy=0;m.hit(0,'heavy');m.freeze=0;const vx=b.pushVx;
  m.advance(20);assert.ok(Math.abs(b.pushVx-(vx-FEEL.airDrag*.02))<.001);
  assert.ok(b.vy>0);b.stun=0;m.advance(10);assert.ok(b.pushVx>0);
});
test('launched third hit creates heavy landing, down protection and a wakeup window',()=>{
  const m=setup(),b=m.fighters[1];m.hit(0,'anonJab3');m.freeze=0;let landed;
  for(let i=0;i<100;i++){m.advance(10);landed=m.drainEvents().find(e=>e.type==='landing'&&e.heavy);if(landed)break;}
  assert.ok(landed);assert.equal(b.knockdown,400);assert.equal(b.stun,0);
  const hp=b.hp;m.hit(0,'heavy');assert.equal(b.hp,hp);
  m.advance(410);assert.equal(b.knockdown,0);m.hit(0,'heavy');assert.equal(b.hp,hp);
  m.advance(220);m.hit(0,'heavy');assert.equal(b.hp,hp);
  m.advance(150);m.hit(0,'heavy');assert.ok(b.hp<hp);
});
test('standing jab advances into range and body separation is skipped only during a dash',()=>{
  const m=setup(),a=m.fighters[0],b=m.fighters[1],x=a.x;b.x=x+205;
  m.advance(10,{light:true});m.advance(100);assert.ok(a.x>x+15);assert.equal(b.hp,194);
  const n=setup(),c=n.fighters[0],d=n.fighters[1];d.x=c.x+10;n.advance(10);assert.ok(d.x-c.x>=FEEL.bodyGap-.001);
  c.dashMs=100;c.dashInvuln=100;c.x=d.x-10;n.separate();assert.equal(d.x-c.x,10);
});
test('air normals can recover into a second air normal and held touch light chains without keyboard autorepeat',()=>{
  const m=setup(),a=m.fighters[0];m.advance(10,{jump:true});m.advance(50);m.advance(10,{light:true});m.advance(310);
  m.advance(10,{light:true});assert.equal(a.attack,'air_light');assert.ok(a.y>0);
  const n=setup();n.advance(700,{light:true,touchLight:true});
  const names=n.drainEvents().filter(e=>e.type==='attack').map(e=>e.attack);assert.deepEqual(names.slice(0,3),['light','anonJab2','anonJab3']);
});
test('strong impact camera briefly focuses, recovers, stays inside bounds and pauses exactly',()=>{
  const m=setup();m.fighters[1].x=600;const c=new Camera();c.reset(m);const base=c.zoom;
  c.impact({weight:2,x:600});c.update(m,50);assert.ok(c.zoom>base&&c.zoom<base*1.148);
  m.setPaused(true);const snap=c.snapshot(),pulse={...c.pulse};c.update(m,1000);assert.deepEqual(c.snapshot(),snap);assert.deepEqual(c.pulse,pulse);
  m.setPaused(false);for(let i=0;i<200;i++)c.update(m,16);assert.ok(Math.abs(c.zoom-base)<.001);assert.equal(c.pulse,null);
  c.impact({weight:3,x:1600});m.fighters[0].x=-650;m.fighters[1].x=1600;c.update(m,16);assert.ok(c.zoom<base*.6);
});
test('landing during air dash retains its remaining travel',()=>{
  const m=setup(),a=m.fighters[0];m.advance(10,{jump:true});m.advance(650);
  const x=a.x;m.advance(10,{dash:true,right:true});m.advance(170);
  assert.ok(m.grounded(a));assert.ok(Math.abs((a.x-x)/(5.15*11*scale)-1)<.04);
});
test('a fresh same-button edge survives frozen held input and is consumed only once',()=>{
  const m=setup(),a=m.fighters[0];m.fighters[1].x=a.x+130;
  m.advance(90,{light:true,pressIds:{light:1}});assert.ok(m.freeze>0);assert.equal(m.previous[0].light,true);
  const ticks=m.inputTick;m.advance(10,{light:true,pressIds:{light:2}});assert.equal(m.inputTick,ticks);
  m.advance(200,{light:true,pressIds:{light:2}});assert.equal(MOVES[a.attack]?.chain,2);
  assert.equal(m.drainEvents().filter(e=>e.type==='attack').length,2);
});
