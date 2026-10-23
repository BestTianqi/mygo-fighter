const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, ROSTER, MOVES, moveList, FEEL, WORLD } = require('../src/engine.js');
const mujica = require('../src/mujica.js');
const controls = require('../src/controls.js');
function fight(character = 5, side = 0, terrain) {
  const m = new Match({ mode: 'duel', characters: side ? [0, character] : [character, 0], terrain });
  m.start(); m.advance(1000); m.fighters.forEach(f => f.energy = 100); return m;
}
function press(m, side, input) { m.advance(10, side ? {} : { unified: true, ...input }, side ? { unified: true, ...input } : {}); }
function settle(m, ms) { m.advance(ms); }
test('Mujica keeps its complete profiles and isolated kits within the expanded roster', () => {
  assert.equal(ROSTER.length, 15);
  for (let character = 5; character < 10; character++) {
    assert.equal(ROSTER[character].speed, FEEL.walk);
    for (const stage of [false, true]) {
      const list = moveList(character, stage), f = { character, stageForm: stage ? { ms: 20 } : null };
      for (const id of controls.schemeFor(f).base) assert.ok(list.some(m => m.key === id));
      assert.ok(list.every(m => m.key === 'throw' || m.key === 'mujicaTransform' || m.ownerCharacter === character));
      for (const other of moveList(0)) assert.notEqual(other.ownerCharacter, character);
      assert.equal(controls.bindingList(f).find(m => m.key === 'P').move, controls.schemeFor(f).super);
    }
  }
});
test('H changes either player immediately, costs fifty and never refreshes', () => {
  for (const side of [0, 1]) for (let id = 5; id < 10; id++) {
    const m = fight(id, side), f = m.fighters[side]; press(m, side, { transform: true });
    assert.equal(f.energy, 50); assert.equal(f.stageForm.ms, 20000); assert.equal(f.attack, null); assert.equal(f.cooldown, 0);
    settle(m, 100); press(m, side, { transform: true }); assert.equal(f.energy, 50); assert.ok(f.stageForm.ms < 20000);
  }
});
test('H rejects air, stun, knockdown and attacks without a buffered transformation', () => {
  for (const state of [{ y: 80 }, { stun: 100 }, { knockdown: 100 }, { attack: 'light', cooldown: 100, attackMs: 40 }]) {
    const m = fight(), f = m.fighters[0]; Object.assign(f, state); press(m, 0, { transform: true }); settle(m, 400);
    assert.equal(f.stageForm, null); assert.equal(f.energy, 100);
  }
});
test('form clock freezes during pause and hitstop; expiry cancels attacks and buffers', () => {
  const m = fight(), f = m.fighters[0]; press(m, 0, { transform: true });
  m.setPaused(true); settle(m, 1000); assert.equal(f.stageForm.ms, 20000); m.setPaused(false);
  m.freeze = 100; settle(m, 100); assert.equal(f.stageForm.ms, 20000);
  f.stageForm.ms = 10; f.attack = controls.schemeFor(f).base[0]; f.cooldown = 600; f.buffer = controls.schemeFor(f).super; f.bufferMs = 300;
  settle(m, 10); assert.equal(f.stageForm, null); assert.equal(f.attack, null); assert.equal(f.buffer, null);
});
test('all kits have exact energy prices, six stance normals and a three hit J chain', () => {
  for (let id = 5; id < 10; id++) for (const stage of [false, true]) {
    const m = fight(id), f = m.fighters[0]; if (stage) f.stageForm = { ms: 20000 };
    const s = controls.schemeFor(f); assert.deepEqual(s.base.map(k => MOVES[k].cost), [20, 25, 30]); assert.equal(MOVES[s.super].cost, 100);
    for (const stance of ['standing', 'crouch', 'air']) for (const button of ['light', 'heavy']) assert.equal(MOVES[mujica.normalFor(f, button, stance)].stance, stance);
    press(m, 0, { light: true }); settle(m, 120); press(m, 0, { light: true }); assert.equal(MOVES[f.attack].chain, 2);
    settle(m, 130); press(m, 0, { light: true }); assert.equal(MOVES[f.attack].chain, 3);
  }
});
test('Sakiko shield absorbs from the front and throws bypass it', () => {
  const m = fight(6), f = m.fighters[0], b = m.fighters[1]; press(m, 0, { skill2: true }); settle(m, 150);
  assert.equal(f.shield.hp, 24); const hp = f.hp; b.x = f.x + 100; m.hit(1, 'heavy'); assert.equal(f.hp, hp); assert.equal(f.shield.hp, 12);
  m.hit(1, 'throw'); assert.equal(f.hp, hp - 18);
});
test('stage traps and missiles retain ownership after form expiry', () => {
  const m = fight(6), f = m.fighters[0]; f.stageForm = { ms: 20000 }; press(m, 0, { skill2: true }); settle(m, 150);
  assert.equal(m.areas.length, 1); const area = m.areas[0]; f.stageForm.ms = 10; settle(m, 10); assert.equal(f.stageForm, null); assert.equal(m.areas[0], area);
  settle(m, 1000); assert.equal(m.areas.length, 0);
});
test('a ground trap stays on its cast platform and cannot strike through a different floor', () => {
  const terrain={platforms:[{left:100,right:900,height:100}]};
  for(const casterOnDeck of [false,true])for(const targetOnDeck of [false,true]) {
    const m=fight(6,0,terrain),f=m.fighters[0],b=m.fighters[1];f.stageForm={ms:20000};f.x=300;f.y=casterOnDeck?100:0;b.x=450;b.y=targetOnDeck?100:0;
    press(m,0,{skill2:true});settle(m,150);assert.equal(m.areas[0].y,casterOnDeck?100:0);settle(m,1200);
    assert.equal(b.hp<200,casterOnDeck===targetOnDeck,`${casterOnDeck}/${targetOnDeck}`);
  }
});
test('two Mujica fighters keep form clocks, cooldowns, traps and spawned hits independent', () => {
  const m=new Match({mode:'duel',characters:[6,6]});m.start();m.advance(1000);m.fighters.forEach(f=>{f.energy=100;f.stageForm={ms:20000};});
  m.advance(10,{unified:true,skill2:true},{unified:true,skill2:true});settle(m,150);assert.equal(m.areas.length,2);assert.notEqual(m.fighters[0].moveCooldowns,m.fighters[1].moveCooldowns);
  m.fighters[0].stageForm.ms=10;settle(m,10);assert.equal(m.fighters[0].stageForm,null);assert.ok(m.fighters[1].stageForm.ms>19000);
  const mapBefore=JSON.stringify(MOVES);settle(m,1500);assert.equal(JSON.stringify(MOVES),mapBefore);
  m.endRound();assert.equal(m.fighters[1].stageForm,null);assert.equal(m.areas.length,0);assert.equal(m.waves.length,0);
});
test('every U/I/O/P is legal for either player on an elevated platform and rejects insufficient energy', () => {
  const terrain = { platforms: [{ left: 0, right: 1000, height: 200 }] };
  for (let id = 5; id < 10; id++) for (const stage of [false, true]) for (const side of [0, 1]) for (const [button, cost] of [['skill1',20],['skill2',25],['skill3',30],['super',100]]) {
    const m = fight(id, side, terrain), f = m.fighters[side]; f.y = 200; m.fighters[1-side].x = side ? 0 : 1000;
    if (stage) f.stageForm = { ms: 20000 }; f.energy = cost - 1;
    press(m, side, { [button]: true }); assert.equal(f.attack, null); assert.equal(f.energy, cost-1);
    f.buffer = null; m.advance(10); f.energy = cost; press(m, side, { [button]: true });
    assert.equal(f.energy, 0); assert.equal(MOVES[f.attack].ownerCharacter, id); assert.equal(MOVES[f.attack].form, stage ? 'stage' : 'normal');
  }
});
test('normal and stage ownership gates reject injected foreign and expired form attacks', () => {
  for (let character = 0; character < 10; character++) {
    const m = fight(character), f = m.fighters[0];
    for (const name of ['mujica_5_stage_u', 'mujica_6_normal_o', 'rising', 'light']) {
      if (name === 'mujica_6_normal_o' && character === 6 || name === 'rising' && character === 0 || name === 'light' && character < 5) continue;
      f.buffer = name; f.bufferMs = 300; m.advance(10); assert.equal(f.attack, null); f.buffer = null;
    }
  }
});
test('idol step travels 280 without dealing damage, stun or granting invulnerability', () => {
  const m = fight(7), f = m.fighters[0], b = m.fighters[1]; f.x = 100; b.x = 900; const start = f.x;
  press(m, 0, { skill2: true }); assert.equal(m.invulnerable(f), false); settle(m, 500);
  assert.ok(Math.abs(f.x - start - 280) < 1); assert.equal(b.hp, 200); assert.equal(b.stun, 0); assert.equal(m.invulnerable(f), false);
  const n = fight(7), a = n.fighters[0], target = n.fighters[1]; target.x = a.x + 100;
  press(n, 0, { skill2: true }); settle(n, 500); assert.equal(target.hp, 200); assert.equal(target.stun, 0); assert.equal(a.combo, 0);
});
test('Mujica counter windows use authored return damage and lose to startup, rear attacks and throws', () => {
  for (const [id, stage, raw] of [[5,false,18],[8,true,22]]) for (const situation of ['front','startup','rear','throw']) {
    const m = fight(id), f = m.fighters[0], b = m.fighters[1]; if (stage) f.stageForm = { ms: 20000 };
    press(m, 0, { skill2: true }); f.attackMs = situation === 'startup' ? 30 : 180; f.facing = 1; b.x = f.x + (situation === 'rear' ? -120 : 120);
    const hp = f.hp; m.hit(1, situation === 'throw' ? 'throw' : 'heavy');
    if (situation === 'front') { assert.equal(f.hp, hp); assert.equal(MOVES[m.waves[0].attack].damage, raw); assert.equal(m.drainEvents().filter(e => e.type === 'counter').length, 1); }
    else assert.ok(f.hp < hp);
  }
});
test('pull moves exactly 100 only on an unblocked hit and command grabs bypass guard and steel', () => {
  for (const id of [5,6]) for (const guard of [false,true]) {
    const m = fight(id), f = m.fighters[0], b = m.fighters[1]; f.stageForm={ms:20000}; b.x=f.x+300; b.guard=guard; b.crouch=guard;
    const key=controls.schemeFor(f).base[id===5?1:2], start=b.x; m.hit(0,key); assert.equal(start-b.x,guard?0:100);
  }
  const m = fight(5), f=m.fighters[0], b=m.fighters[1]; f.stageForm={ms:20000}; b.x=f.x+87; b.guard=true; b.shield={hp:40,ms:3000};
  press(m,0,{skill3:true}); settle(m,400); assert.ok(b.hp<200); assert.equal(b.shield.hp,40);
});
test('Mujica low and overhead attacks use standing and crouch guard rules', () => {
  for (const [id,stage,slot,level] of [[8,false,1,'low'],[8,true,2,'high'],[5,true,0,'low']]) for (const crouch of [false,true]) {
    const m=fight(id),f=m.fighters[0],b=m.fighters[1]; if(stage)f.stageForm={ms:20000}; b.guard=true;b.crouch=crouch;
    m.hit(0,controls.schemeFor(f).base[slot]); const hit=m.drainEvents().find(e=>e.type==='hit'); assert.equal(hit.blocked,level==='low'?crouch:!crouch);
  }
});
test('all supers deal authored hit counts, scale normally and continue through armored hits', () => {
  for(let id=5;id<10;id++) for(const stage of [false,true]) for(const side of [0,1]) {
    const m=fight(id,side),f=m.fighters[side],b=m.fighters[1-side]; f.x=side?500:300;b.x=side?330:470;if(stage)f.stageForm={ms:20000};
    press(m,side,{super:true}); const attack=f.attack; settle(m,MOVES[attack].duration+3000);
    const hits=m.drainEvents().filter(e=>e.type==='hit'&&e.attack===attack); assert.equal(hits.length,id===7?5:id===9&&stage?8:3,`${id}/${stage}/${side}`); assert.ok(hits.every(e=>!e.blocked)); assert.ok(b.hp<200);
    const n=fight(id,side),a=n.fighters[side]; if(stage)a.stageForm={ms:20000}; press(n,side,{super:true}); a.attackMs=150; n.hit(1-side,'heavy'); assert.equal(a.attack,attack); assert.ok(a.hp<200); settle(n,MOVES[attack].duration+3000);
    assert.ok(n.drainEvents().some(e=>e.type==='hit'&&e.attack===attack));
  }
});
test('supers miss beyond their full stationary range or crawl travel and vertical separation', () => {
  for(let id=5;id<10;id++) for(const stage of [false,true]) for(const far of ['horizontal','vertical']) {
    const m=fight(id),f=m.fighters[0],b=m.fighters[1];if(stage)f.stageForm={ms:20000};f.x=200;b.x=far==='horizontal'?(id===7?950:621):350;
    if(far==='vertical') { m.options.terrain={platforms:[{left:300,right:600,height:301}]};b.y=301; }
    press(m,0,{super:true});settle(m,MOVES[f.attack].duration+3000);assert.equal(b.hp,200,`${id}/${stage}/${far}`);
  }
});
test('ranged supers reach a legal elevated target while Uika crawl remains a ground attack', () => {
  for(let id=5;id<10;id++)for(const stage of [false,true]) {
    const m=fight(id),f=m.fighters[0],b=m.fighters[1];if(stage)f.stageForm={ms:20000};f.x=200;b.x=350;
    m.options.terrain={platforms:[{left:300,right:600,height:260}]};b.y=260;press(m,0,{super:true});settle(m,MOVES[f.attack].duration+3000);assert.equal(b.hp<200,id!==7,`${id}/${stage}`);
  }
});
test('cooldowns and one-trap limit cannot be bypassed by a fresh button edge; pause freezes warning and reset clears', () => {
  const m=fight(6),f=m.fighters[0];f.stageForm={ms:20000};press(m,0,{skill2:true});settle(m,160);const area=m.areas[0],warning=area.warning,cooldown=f.moveCooldowns[f.attack];
  m.setPaused(true);settle(m,600);assert.equal(area.warning,warning);assert.equal(f.moveCooldowns[f.attack],cooldown);m.setPaused(false);
  settle(m,600);f.energy=100;press(m,0,{skill2:true});assert.equal(f.attack,null);assert.equal(f.energy,100);
  m.restart();assert.equal(m.areas.length,0);assert.equal(m.fighters[0].stageForm,null);assert.deepEqual(m.fighters[0].moveCooldowns,{});
});
test('projectiles survive expiry, travel in either direction and ground waves follow slopes/platform edges', () => {
  for(const side of [0,1]) {
    const m=fight(5,side),f=m.fighters[side];f.stageForm={ms:20000};press(m,side,{skill1:true});settle(m,170);assert.equal(m.waves.length,1);
    const w=m.waves[0],x=w.x;f.stageForm.ms=10;settle(m,10);assert.equal(f.stageForm,null);assert.equal(m.waves[0],w);assert.equal(Math.sign(w.x-x),side?-1:1);
  }
  const terrain={ground:[{x:-100,y:-80},{x:1000,y:100}],platforms:[{left:200,right:500,height:200}]};
  const m=fight(5,0,terrain),f=m.fighters[0];f.stageForm={ms:20000};f.x=300;f.y=200;press(m,0,{skill1:true});settle(m,200);
  assert.equal(m.waves[0].y,240);settle(m,500);assert.equal(m.waves.length,0);
});
test('normal confirms cancel into owned specials and supers, whiffs and H do not cancel', () => {
  for(let id=5;id<10;id++) {
    const m=fight(id),f=m.fighters[0];f.attack=mujica.normalFor(f,'light');f.attackMs=100;f.hit=true;f.contact=true;f.hitMarks=[0];
    assert.equal(m.canCancel(f,controls.schemeFor(f).base[0]),true);assert.equal(m.canCancel(f,controls.schemeFor(f).super),true);assert.equal(m.canCancel(f,'mujicaTransform'),false);
    f.contact=false;assert.equal(m.canCancel(f,controls.schemeFor(f).base[0]),false);
  }
});
test('H allows a simultaneous stage attack or movement and common throws keep the same keys in both forms', () => {
  for(const side of [0,1]) for(const stage of [false,true]) {
    const m=fight(6,side),f=m.fighters[side];if(stage)f.stageForm={ms:20000};
    const back=side?'right':'left',forward=side?'left':'right';
    assert.equal(controls.resolveSkill(f,{[back]:true},k=>k==='skill1',false),'throw');
    assert.equal(controls.resolveSkill(f,{[forward]:true},k=>k==='skill3',false),'throw');
  }
  const m=fight(7),f=m.fighters[0];press(m,0,{transform:true,skill1:true});assert.equal(f.attack,'mujica_7_stage_u');assert.equal(f.energy,30);
  const n=fight(7),a=n.fighters[0],x=a.x;press(n,0,{transform:true,right:true});assert.ok(a.x>x);
});
test('every super respects its matching guard and shields absorb frontal pulses', () => {
  for(let id=5;id<10;id++)for(const stage of [false,true]) {
    const m=fight(id),f=m.fighters[0],b=m.fighters[1];if(stage)f.stageForm={ms:20000};b.x=f.x+160;
    press(m,0,{super:true});const attack=f.attack;m.advance(MOVES[attack].duration+3000,{}, {guard:true,crouch:id===7});
    const hits=m.drainEvents().filter(e=>e.type==='hit'&&e.attack===attack);assert.equal(hits.length,id===7?5:id===9&&stage?8:3);assert.ok(hits.every(e=>e.blocked));assert.ok(b.hp>=184);
    const n=fight(id),a=n.fighters[0],target=n.fighters[1];if(stage)a.stageForm={ms:20000};target.x=a.x+160;target.shield={hp:100,ms:15000,hitMs:0};press(n,0,{super:true});settle(n,MOVES[a.attack].duration+3000);
    assert.equal(target.hp,200);
  }
});
test('CPU reaches the highest deck on every map with all five normalized movement profiles', () => {
  for(const map of require('../assets/stages.json'))for(let id=5;id<10;id++) {
    const target=map.terrain.platforms.reduce((a,b)=>a.height>b.height?a:b);
    const m=fight(id,1,map.terrain);m.options.mode='cpu';m.options.difficulty=2;Object.assign(m.fighters[0],{x:(target.left+target.right)/2,y:target.height});
    let reached=false;
    for(let i=0;i<1500&&m.phase==='fighting';i++){m.advance(10);const a=m.fighters[1];if(m.grounded(a)&&Math.abs(a.y-target.height)<.1&&a.x>=target.left&&a.x<=target.right){reached=true;break;}}
    assert.ok(reached,`${map.id}/${id}`);
  }
});
test('CPU uses each owned kit and both forms without illegal attacks on all shipped maps', () => {
  for(const map of require('../assets/stages.json'))for(let id=5;id<10;id++) {
    const m=fight(id,1,map.terrain);m.options.mode='cpu';m.options.difficulty=2;const forms=new Set(),slots=new Set();
    for(let i=0;i<7000;i++) {
      for(const f of m.fighters){f.hp=200;f.energy=100;}
      m.remaining=60000;m.advance(10);
      for(const e of m.drainEvents())if(e.type==='attack'&&e.side===1){const move=MOVES[e.attack];assert.ok(e.attack==='throw'||move.ownerCharacter===id,`${id}/${e.attack}`);if(move.form)forms.add(move.form);if(move.slot)slots.add(move.slot);}
      if(forms.size===2&&['u','i','o','super'].every(slot=>slots.has(slot)))break;
    }
    assert.deepEqual([...forms].sort(),['normal','stage'],`${map.id}/${id}`);assert.ok(['u','i','o','super'].every(slot=>slots.has(slot)),`${map.id}/${id}: ${[...slots]}`);
  }
});
test('Mujica supers share bounded reach and exact raw pulse damage', () => {
  for (let id = 5; id < 10; id++) for (const stage of [false, true]) {
    const f = { character: id, stageForm: stage ? {} : null }, move = MOVES[controls.schemeFor(f).super];
    assert.equal(move.start, id===7?80:250); assert.equal(move.duration, {5:1700,6:3200,7:1000,8:4150,9:1750}[id]); assert.equal(move.invuln, 50); assert.equal(move.vertical, id===7?90:300);
    assert.ok(move.pulses.every(p => p.reach <= 420)); assert.deepEqual(move.pulses.map(p => p.damage), id === 5 && !stage ? [16,16,16] : id === 7 ? Array(5).fill(10) : id === 9 && stage ? Array(8).fill(6) : [8,12,28]);
  }
});

test('each offensive base skill actually lands its authored hits from either side', () => {
  const utility = new Set(['mujica_5_normal_i','mujica_6_normal_i','mujica_7_normal_i','mujica_8_stage_i']);
  const counts = {mujica_6_stage_u:2,mujica_7_normal_o:3,mujica_8_stage_u:2,mujica_9_normal_o:3,mujica_9_stage_u:2,mujica_9_stage_o:4};
  for (let id=5;id<10;id++) for (const stage of [false,true]) for (const side of [0,1]) for (const slot of ['skill1','skill2','skill3']) {
    const m=fight(id,side),f=m.fighters[side],b=m.fighters[1-side];if(stage)f.stageForm={ms:20000};
    const attack=controls.schemeFor(f).base[['skill1','skill2','skill3'].indexOf(slot)];if(utility.has(attack))continue;
    const direction=side?-1:1;f.x=side?700:300;b.x=f.x+direction*(MOVES[attack].category==='throw'?70:150);
    press(m,side,{[slot]:true});settle(m,4000);
    const hits=m.drainEvents().filter(e=>e.type==='hit'&&e.attack===attack);
    assert.equal(hits.length,counts[attack]||1,`${attack}/${side}`);assert.ok(b.hp<200,`${attack}/${side}`);
    assert.ok(hits.every(e=>e.side===side&&!e.blocked),attack);
  }
});
