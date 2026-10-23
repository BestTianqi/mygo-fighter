const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, WORLD } = require('../src/engine.js');
const stages = require('../assets/stages.json');
function fight(options = {}) { const m = new Match({ mode: 'duel', characters: [1, 0], ...options }); m.start(); m.advance(1000); return m; }
test('both players can move beyond the former screen and stop at the expanded world edges', () => {
  const m = fight(); m.advance(10000, { left: true }, { right: true });
  assert.ok(m.fighters[0].x < 0); assert.ok(m.fighters[1].x > 960);
  assert.equal(m.fighters[0].x, WORLD.left + 45); assert.equal(m.fighters[1].x, WORLD.right - 45);
  for (const edge of [WORLD.left + 45, WORLD.right - 45]) {
    m.fighters[0].x = edge; m.fighters[1].x = edge; m.advance(10);
    assert.ok(m.fighters.every(f => f.x >= WORLD.left + 45 && f.x <= WORLD.right - 45));
    assert.ok(Math.abs(m.fighters[0].x - m.fighters[1].x) >= 55.9);
  }
});
test('lower ground interpolates ramps, supports jumps, downward drops and low-altitude knockdown', () => {
  const terrain = { ground: [{ x:-720,y:-160 },{ x:-240,y:-160 },{ x:0,y:0 },{ x:1680,y:0 }], platforms: [{ left:-600,right:-340,height:-90 }] };
  const m = fight({ terrain }), a = m.fighters[0]; assert.equal(m.floorHeight(-120), -80);
  Object.assign(a, { x:-450,y:-90 }); Object.assign(m.fighters[1], { x:-385,y:-90 });
  m.advance(10, { crouch:true,jump:true }); m.advance(600); assert.equal(a.y, -160); assert.ok(m.grounded(a));
  m.fighters[1].y = -160; m.fighters[1].x = a.x + 60;
  m.advance(10, {}, { throw:true }); m.advance(90);
  assert.ok(a.knockdown > 0); assert.ok(a.y < -120, 'throw must launch from the lower floor');
  m.advance(1200); assert.equal(a.y, -160);
});
test('projectiles and all three Soyo summons keep working outside the original screen', () => {
  const m = fight(), a = m.fighters[0], b = m.fighters[1]; Object.assign(a,{ x:1150,energy:100 }); b.x=1430;
  m.advance(10,{ wave:true });m.advance(1000);assert.ok(b.hp < 200);
  m.advance(300);a.energy=100;m.advance(10,{ sonic:true });m.advance(3000);
  assert.equal(a.summons.units.length,3);assert.ok(a.summons.units.every(p=>p.x>960));
  assert.ok(m.drainEvents().some(e=>e.type==='minionStrike'));
});
test('ceiling bounds the expanded upward range without locking the fighter in the air', () => {
  const m=fight(),a=m.fighters[0];a.y=WORLD.top-1;a.vy=610;m.advance(50);
  assert.ok(a.y<=WORLD.top);assert.ok(a.vy<=0);m.advance(2000);assert.ok(m.grounded(a));
});
test('all shipped maps have reachable outer tiers, lower ground and an unchanged central spawn area', () => {
  for(const stage of stages){
    const m=fight({terrain:stage.terrain}),p=stage.terrain.platforms;
    assert.ok(p.some(p=>p.left<0));assert.ok(p.some(p=>p.right>960));assert.ok(Math.max(...p.map(p=>p.height))>=400);
    assert.ok(m.floorHeight(-600)<0);assert.ok(m.floorHeight(1560)<0);
    assert.ok(m.fighters.every(f=>f.x>=0&&f.x<=960&&m.grounded(f)));
  }
});
