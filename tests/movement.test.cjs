const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Match,WORLD,FEEL}=require('../src/engine.js');
function fight(character){const m=new Match({mode:'duel',characters:[character,0]});m.start();m.advance(1000);m.fighters[1].x=1600;return m;}
test('playable characters retain their speed ratios at reference-normalized walking speed',()=>{
  for(const [character,speed]of [[0,FEEL.walk],[1,FEEL.walk],[2,FEEL.walk*315/345],[3,FEEL.walk*390/345]]){
    const m=fight(character),a=m.fighters[0],start=a.x;m.advance(1000,{right:true});assert.ok(Math.abs(a.x-start-speed)<.01);
    m.advance(1000,{left:true});assert.ok(Math.abs(a.x-start)<.01);assert.equal(a.guard,true);
    const x=a.x;m.advance(100,{right:true,guard:true});assert.equal(a.x,x);
  }
});
test('forward and backward dashes travel 5.15 reference units for eleven ticks and recover after 600ms',()=>{
  for(const direction of ['right','left']){
    const m=fight(0),a=m.fighters[0],start=a.x;m.advance(10,{[direction]:true,dash:true});m.advance(170);
    assert.ok(Math.abs(Math.abs(a.x-start)/(5.15*11*235/54)-1)<.025);
    m.advance(420);m.advance(10,{[direction]:true,dash:true});assert.ok(a.dashMs>0);
  }
});
test('fast movement and dashes still stop at world edges and opponent collision',()=>{
  const m=fight(1),a=m.fighters[0];m.advance(10000,{left:true});assert.equal(a.x,WORLD.left+45);
  m.advance(10,{left:true,dash:true});m.advance(200);assert.equal(a.x,WORLD.left+45);
  a.x=1450;m.advance(500,{right:true});assert.ok(m.fighters[1].x-a.x>=55.9);
});
