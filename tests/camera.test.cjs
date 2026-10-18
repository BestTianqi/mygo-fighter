const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, WORLD } = require('../src/engine.js');
const { Camera, SAFE, fighterBounds } = require('../src/camera.js');
function setup(){const m=new Match({mode:'duel',characters:[0,1]});m.start();m.advance(1000);const c=new Camera();c.reset(m);return{m,c};}
function visible(m,c){for(const f of m.fighters){const b=fighterBounds(f);for(const [x,y]of[[b.left,b.top],[b.right,b.bottom]]){const p=c.project(x,y);assert.ok(p.x>=SAFE.left-.01&&p.x<=SAFE.right+.01,JSON.stringify(p));assert.ok(p.y>=SAFE.top-.01&&p.y<=SAFE.bottom+.01,JSON.stringify(p));}}}
test('camera zooms out for separated fighters and smoothly zooms back in for close combat',()=>{
  const{m,c}=setup(),close=c.zoom;m.fighters[0].x=-650;m.fighters[1].x=1600;c.update(m,16);visible(m,c);assert.ok(c.zoom<close*.5);
  const far=c.zoom;m.fighters[0].x=420;m.fighters[1].x=485;c.update(m,16);assert.ok(c.zoom>far&&c.zoom<close);visible(m,c);
  for(let i=0;i<200;i++)c.update(m,16);assert.ok(c.zoom>1);visible(m,c);
});
test('camera follows horizontal and vertical movement while keeping fighters clear of the HUD',()=>{
  const{m,c}=setup(),before=c.snapshot();m.fighters.forEach(f=>{f.x+=700;f.y=500;});c.update(m,100);visible(m,c);
  assert.ok(c.x>before.x);assert.ok(c.y<before.y);
  m.fighters[0].y=-160;m.fighters[1].y=620;c.update(m,16);visible(m,c);
});
test('a settled wide view keeps feet near the meters instead of filling half the view with underground',()=>{
  const{m,c}=setup();m.fighters[0].x=-650;m.fighters[1].x=1600;
  for(let i=0;i<200;i++)c.update(m,16);visible(m,c);
  assert.ok(c.project(m.fighters[0].x,438).y>420);
});
test('opposite world corners and the giant dragon remain visible on the very next frame',()=>{
  const{m,c}=setup();for(const reverse of[false,true]){
    Object.assign(m.fighters[0],{x:WORLD.left+45,y:reverse?WORLD.top:-180,attack:'super'});
    Object.assign(m.fighters[1],{x:WORLD.right-45,y:reverse?-180:WORLD.top});c.update(m,16);visible(m,c);
  }
});
test('pausing holds the camera and reset returns to the current fighters without changing combat',()=>{
  const{m,c}=setup();m.fighters[0].x=-500;c.update(m,16);m.setPaused(true);const before=c.snapshot(),combat=JSON.stringify(m);
  c.update(m,1000);assert.deepEqual(c.snapshot(),before);assert.equal(JSON.stringify(m),combat);
  m.restart();c.reset(m);visible(m,c);assert.equal(c.x,480);
});
test('camera smoothing is stable across frame rates and selecting a view is read-only',()=>{
  const a=setup(),b=setup();for(const m of[a.m,b.m])m.fighters.forEach(f=>f.x+=20);
  const before=JSON.stringify(a.m);for(let i=0;i<100;i++)a.c.update(a.m,10);for(let i=0;i<50;i++)b.c.update(b.m,20);
  assert.ok(Math.abs(a.c.x-b.c.x)<.0001);assert.equal(JSON.stringify(a.m),before);
});
