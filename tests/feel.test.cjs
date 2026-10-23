const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Match,FEEL}=require('../src/engine.js');
function fight(character=0,terrain=null){const m=new Match({mode:'duel',characters:[character,0],terrain});m.start();m.advance(1000);m.fighters[1].x=1200;m.fighters[0].energy=100;return m;}

test('players can reverse direction and stop drifting in the air with normal attacks still available',()=>{
  for(const character of [0,1,2,'penguin']){
    const m=fight(character==='penguin'?2:character),a=m.fighters[0];if(character==='penguin')a.penguin={ms:20000};
    m.advance(180,{jump:true,right:true});assert.ok(a.vx>0);
    m.advance(80,{left:true});assert.ok(a.vx<0);m.advance(80);assert.ok(Math.abs(a.vx)<1);assert.ok(a.y>0);
    m.advance(10,{light:true});assert.ok(a.attack);
  }
});
test('a jump requested during dash is retained until its eleven-tick movement completes',()=>{
  const m=fight(),a=m.fighters[0];m.advance(60,{dash:true,right:true});assert.ok(a.dashMs>0);
  m.advance(10,{jump:true,right:true});assert.equal(a.y,0);assert.ok(a.dashMs>0);assert.ok(a.jumpBufferMs>0);
  m.advance(120);assert.ok(a.y>0);assert.equal(a.dashMs,0);
  m.advance(80,{left:true});assert.ok(a.vx<0);
});
test('a jump tapped just before landing is buffered once without auto-hopping while held',()=>{
  const m=fight(),a=m.fighters[0];a.y=6;a.vy=-140;a.jumps=0;m.advance(10,{jump:true});m.advance(100);
  assert.ok(a.vy>0);assert.ok(a.y>10);m.advance(1200,{jump:true});assert.ok(m.grounded(a));
});
test('coyote jump keeps full takeoff speed, while intentional drop and late jumps use the air jump',()=>{
  const terrain={platforms:[{left:200,right:400,height:80}]};
  const m=fight(0,terrain),a=m.fighters[0];a.x=398;a.y=80;m.advance(20,{right:true});assert.ok(!m.grounded(a));
  m.advance(10,{jump:true});assert.ok(a.vy>FEEL.jump*.94);
  const n=fight(0,terrain),b=n.fighters[0];b.y=80;n.advance(10,{crouch:true,jump:true});n.advance(10);n.advance(10,{jump:true});
  assert.ok(b.vy>900&&b.vy<FEEL.jump*.9);assert.equal(b.coyoteMs,0);
  const late=fight(0,terrain),c=late.fighters[0];c.x=398;c.y=80;late.advance(140,{right:true});late.advance(10,{jump:true});assert.ok(c.vy>900&&c.vy<FEEL.jump*.9);
});
test('a dash tapped before landing or just before its cooldown expires activates when legal',()=>{
  const m=fight(),a=m.fighters[0];a.y=6;a.vy=-140;m.advance(10,{right:true,dash:true});m.advance(60,{right:true});assert.ok(a.dashMs>0);
  const n=fight(),b=n.fighters[0];n.advance(10,{right:true,dash:true});n.advance(500);n.advance(10,{right:true,dash:true});n.advance(100);
  assert.ok(b.dashMs>0);
});
test('pausing and taking a hit discard queued movement, and specials keep their authored air motion',()=>{
  const m=fight(),a=m.fighters[0];a.y=12;a.vy=-120;a.stun=200;m.advance(10,{jump:true,dash:true});assert.ok(a.jumpBufferMs>0&&a.dashBufferMs>0);
  m.setPaused(true);assert.equal(a.jumpBufferMs,0);assert.equal(a.dashBufferMs,0);m.setPaused(false);
  a.jumpBufferMs=a.dashBufferMs=100;m.hit(1,'light');assert.equal(a.jumpBufferMs,0);assert.equal(a.dashBufferMs,0);
  m.freeze=0;a.stun=0;
  a.y=100;a.vy=0;a.energy=100;m.advance(10,{dive:true});const vx=a.vx;m.advance(20,{left:true});assert.equal(a.vx,vx);
});
test('hitstop differentiates light, medium, heavy and guard and keeps the strongest simultaneous impact',()=>{
  function hit(attack,guard=false){const m=fight();m.fighters[1].guard=guard;m.hit(0,attack);return {m,event:m.drainEvents().find(e=>e.type==='hit')};}
  const light=hit('light'),medium=hit('medium'),heavy=hit('heavy'),block=hit('heavy',true);
  assert.ok(block.m.freeze<light.m.freeze&&light.m.freeze<medium.m.freeze&&medium.m.freeze<heavy.m.freeze);
  assert.equal(light.event.weight,0);assert.equal(heavy.event.weight,2);assert.equal(block.event.blocked,true);
  const freeze=heavy.m.freeze;heavy.m.hit(0,'light');assert.equal(heavy.m.freeze,freeze);
  const punch=hit('light').event.y,kick=hit('lightKick').event.y,low=hit('crouch_light').event.y;
  assert.ok(punch>kick&&kick>low,'contact sparks must follow upper-body, foot and low attacks');
});
