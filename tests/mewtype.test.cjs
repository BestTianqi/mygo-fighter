const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, ROSTER, MOVES, moveList, FEEL } = require('../src/engine.js');
const mewtype = require('../src/mewtype.js');
const controls = require('../src/controls.js');
function fight(id=10, side=0, terrain) {
  const m=new Match({mode:'duel',characters:side?[0,id]:[id,0],terrain});m.start();m.advance(1000);m.fighters.forEach(f=>f.energy=100);return m;
}
function press(m,side,input){m.advance(10,side?{}:{unified:true,...input},side?{unified:true,...input}:{});}

test('a projectile emission retains its sound identity when interrupted on the same tick',()=>{
  const m=fight(),[a,b]=m.fighters;
  b.x=a.x+100;b.facing=-1;
  a.attack='mewtype_10_virtual_i';a.attackMs=150;
  b.attack='heavy';b.attackMs=MOVES.heavy.start-10;
  m.drainEvents();m.advance(10);
  assert.equal(a.attack,null,'the opponent interrupts after the emission');
  const pulse=m.drainEvents().find(e=>e.type==='voicePulse'&&e.side===0);
  assert.ok(pulse,'an already emitted wave still has a sound event');
  assert.equal(pulse.attack,'mewtype_10_virtual_i');
});
test('MewType expands the roster to fifteen and exposes a single isolated virtual kit',()=>{
  assert.equal(ROSTER.length,15);assert.deepEqual(mewtype.CHARACTERS.map(c=>c.id),[10,11,12,13,14]);
  for(const c of mewtype.CHARACTERS){const f={character:c.id};assert.equal(mewtype.formFor(f),'virtual');assert.equal(c.band,'mewtype');assert.equal(ROSTER[c.id].speed,FEEL.walk);
    const list=moveList(c.id),scheme=controls.schemeFor(f);assert.equal(scheme.transform,undefined);assert.deepEqual(scheme.base.map(k=>MOVES[k].cost),[20,25,30]);assert.equal(MOVES[scheme.super].cost,100);
    assert.ok(list.every(m=>m.key==='throw'||m.ownerCharacter===c.id&&m.form==='virtual'));assert.deepEqual(moveList(c.id,true),list);
    for(const legacy of [0,1,2,3,4,5,6,7,8,9])assert.ok(moveList(legacy).every(m=>m.ownerCharacter!==c.id));
    assert.ok(!controls.bindingList(f).some(row=>row.key==='H'));assert.equal(controls.bindingList(f).find(row=>row.key==='P').move,scheme.super);
  }
});
test('both players get owned stance normals, distinct J-chain slots and no transformation',()=>{
  for(let id=10;id<15;id++)for(const side of [0,1]){
    const m=fight(id,side),f=m.fighters[side];press(m,side,{transform:true});assert.equal(f.stageForm,null);assert.equal(f.energy,100);assert.equal(f.attack,null);m.advance(10);
    press(m,side,{light:true});assert.equal(MOVES[f.attack].visualSlot,'jab-1');m.advance(120);press(m,side,{light:true});assert.equal(MOVES[f.attack].visualSlot,'jab-2');m.advance(130);press(m,side,{light:true});assert.equal(MOVES[f.attack].visualSlot,'jab-3');
    for(const stance of ['standing','crouch','air'])for(const button of ['light','heavy']){const move=MOVES[mewtype.normalFor(f,button,stance)];assert.equal(move.stance,stance);assert.equal(move.ownerCharacter,id);}
  }
});
test('all MewType skills obey costs, ground gates and both player input on decks',()=>{
  const terrain={platforms:[{left:0,right:1000,height:200}]};
  for(let id=10;id<15;id++)for(const side of [0,1])for(const [button,cost]of[['skill1',20],['skill2',25],['skill3',30],['super',100]]){
    const m=fight(id,side,terrain),f=m.fighters[side];f.y=200;f.energy=cost-1;press(m,side,{[button]:true});assert.equal(f.attack,null);assert.equal(f.energy,cost-1);
    f.buffer=null;m.advance(10);f.energy=cost;press(m,side,{[button]:true});assert.equal(f.energy,0);assert.equal(MOVES[f.attack].ownerCharacter,id);assert.equal(MOVES[f.attack].form,'virtual');
    const n=fight(id,side),a=n.fighters[side];a.y=100;press(n,side,{[button]:true});assert.equal(a.attack,null);assert.equal(a.energy,100);
  }
});
test('new and existing bands reject foreign moves and MewType cannot queue a Mujica transformation',()=>{
  for(let id=0;id<15;id++)for(const key of ['mewtype_10_virtual_u','mewtype_14_virtual_super','mujica_6_normal_o','mujicaTransform','rising']){
    if(MOVES[key]?.ownerCharacter===id||key==='mujicaTransform'&&id>=5&&id<10||key==='rising'&&id===0)continue;
    const m=fight(id),f=m.fighters[0];f.buffer=key;f.bufferMs=300;m.advance(10);assert.equal(f.attack,null,`${id}/${key}`);assert.equal(f.stageForm,null);
  }
});
test('base skills and common directional throws resolve for either facing without introducing H or changing keys',()=>{
  assert.equal(controls.KEYS1.light,'KeyJ');assert.equal(controls.KEYS1.heavy,'KeyK');assert.equal(controls.KEYS1.blink,'KeyL');
  for(let id=10;id<15;id++)for(const facing of [-1,1]){
    const f={character:id,facing},s=controls.schemeFor(f);
    for(let i=1;i<=3;i++)assert.equal(controls.resolveSkill(f,{},k=>k==='skill'+i,false),s.base[i-1]);
    const forward=facing>0?'right':'left',back=facing>0?'left':'right';
    assert.equal(controls.resolveSkill(f,{[back]:true},k=>k==='skill1',false),'throw');assert.equal(controls.resolveSkill(f,{[forward]:true},k=>k==='skill3',false),'throw');
    assert.equal(controls.resolveSkill(f,{},k=>k==='transform',false),undefined);
  }
  const m=fight(10);press(m,0,{transform:true,skill1:true});assert.equal(m.fighters[0].attack,'mewtype_10_virtual_u');
});
test('all fifteen characters retain 200 HP and MewType uses ordinary jump, blink and guarded throws',()=>{
  for(let id=10;id<15;id++)for(const side of[0,1]){
    const m=fight(id,side),f=m.fighters[side];assert.equal(f.hp,200);assert.equal(f.stageForm,null);const x=f.x;
    press(m,side,{blink:true});assert.ok(Math.abs(f.x-x)>100);assert.equal(m.drainEvents().filter(e=>e.type==='blink').length,1);
    m.advance(800);press(m,side,{jump:true});assert.ok(f.y>0);m.advance(1200);assert.equal(f.y,0);
    const b=m.fighters[1-side];f.x=side?500:300;b.x=side?413:387;m.advance(10);press(m,side,{skill1:true,[side?'right':'left']:true});m.advance(500,side?{guard:true}:{},side?{}:{guard:true});
    assert.ok(b.hp<200);
  }
});
test('Arale emits one U and two I notes, Miyako paper follows a parabola, and Yuno disc stays on its deck',()=>{
  for(const [id,slot,count]of[[10,1,1],[10,2,2],[12,1,1]])for(const side of[0,1]){
    const m=fight(id,side),f=m.fighters[side];f.x=side?1000:0;m.fighters[1-side].x=side?0:1000;press(m,side,{['skill'+slot]:true});m.advance(360);
    assert.equal(m.waves.length,count,`${id}/${slot}/${side}`);assert.ok(m.waves.every(w=>w.owner===side&&Math.sign(w.vx)===(side?-1:1)));
    if(id===12){assert.ok(m.waves[0].y>135);assert.ok(m.waves[0].vy<230);}
  }
  const terrain={platforms:[{left:100,right:500,height:180}]},m=fight(13,0,terrain),f=m.fighters[0];f.y=180;f.x=300;press(m,0,{skill1:true});m.advance(180);assert.equal(m.waves[0].y,220);m.advance(500);assert.equal(m.waves.length,0);
});
test('Ritsu counters front strikes only in her window and loses to rear, startup and throws',()=>{
  for(const situation of['front','rear','startup','throw']){
    const m=fight(11),f=m.fighters[0],b=m.fighters[1];press(m,0,{skill2:true});f.attackMs=situation==='startup'?40:180;f.facing=1;b.x=f.x+(situation==='rear'?-110:110);
    m.hit(1,situation==='throw'?'throw':'heavy');
    if(situation==='front'){assert.equal(f.hp,200);assert.equal(m.waves.length,1);assert.equal(MOVES[m.waves[0].attack].damage,18);}
    else assert.ok(f.hp<200);
  }
});
test('Yuno shield has independent durability and cooldown and throws or rear hits bypass it',()=>{
  const m=fight(13),f=m.fighters[0],b=m.fighters[1];press(m,0,{skill2:true});m.advance(130);assert.equal(f.shield.hp,24);assert.ok(f.moveCooldowns.mewtype_13_virtual_i>0);
  b.x=f.x+110;m.hit(1,'heavy');assert.equal(f.hp,200);assert.equal(f.shield.hp,12);m.freeze=0;m.hit(1,'throw');assert.equal(f.hp,182);assert.equal(f.shield.hp,12);
  const rear=fight(13),a=rear.fighters[0],attacker=rear.fighters[1];press(rear,0,{skill2:true});rear.advance(130);attacker.x=a.x-110;rear.hit(1,'light');assert.ok(a.hp<200);assert.equal(a.shield.hp,24);
});
test('Miyako trap is owned, warned, limited to one and stays on the appropriate terrain layer',()=>{
  const terrain={platforms:[{left:100,right:900,height:100}]};
  for(const deck of[false,true])for(const targetDeck of[false,true]){
    const m=fight(12,0,terrain),f=m.fighters[0],b=m.fighters[1];f.y=deck?100:0;f.x=300;b.x=450;b.y=targetDeck?100:0;press(m,0,{skill2:true});m.advance(150);
    const area=m.areas[0];assert.equal(area.owner,0);assert.equal(area.y,deck?100:0);assert.ok(area.warning>0);assert.equal(b.hp,200);
    const warning=area.warning;m.setPaused(true);m.advance(1000);assert.equal(area.warning,warning);m.setPaused(false);m.advance(1200);
    assert.equal(b.hp<200,deck===targetDeck);f.energy=100;press(m,0,{skill2:true});assert.equal(f.attack,null);assert.equal(f.energy,100);
    m.restart();assert.equal(m.areas.length,0);assert.deepEqual(m.fighters[0].moveCooldowns,{});
  }
});
test('Miyako pulls only on an unblocked hit; Yuno low disc and Nonoka overhead use the correct guard',()=>{
  for(const guarded of[false,true]){
    const m=fight(12),f=m.fighters[0],b=m.fighters[1];b.x=f.x+300;b.guard=guarded;const x=b.x;m.hit(0,'mewtype_12_virtual_o');assert.equal(x-b.x,guarded?0:100);
  }
  for(const[id,slot,low]of[[13,'u',true],[14,'o',false]])for(const crouch of[false,true]){
    const m=fight(id),b=m.fighters[1];b.guard=true;b.crouch=crouch;m.hit(0,`mewtype_${id}_virtual_${slot}`);assert.equal(m.drainEvents().find(e=>e.type==='hit').blocked,low?crouch:!crouch);
  }
});
test('Nonoka and Ritsu movement travels its authored distance and respects bounds',()=>{
  for(const[id,slot,distance]of[[11,3,220],[14,2,240]])for(const side of[0,1]){
    const m=fight(id,side),f=m.fighters[side];f.x=side?1000:0;m.fighters[1-side].x=side?0:1000;const x=f.x;press(m,side,{['skill'+slot]:true});m.advance(500);assert.ok(Math.abs(Math.abs(f.x-x)-distance)<1);
  }
  const m=fight(14),f=m.fighters[0];f.x=1620;m.fighters[1].x=1630;press(m,0,{skill2:true});m.advance(600);assert.ok(f.x<=1635);
});
test('authored multi-hit skills and supers strike the expected times in either direction with normal scaling',()=>{
  for(const[id,button,count]of[[10,'skill2',2],[13,'skill3',3],[14,'skill1',2],...[10,11,12,13,14].map(id=>[id,'super',id===14?6:id===12?9:3])])for(const side of[0,1]){
    const m=fight(id,side),f=m.fighters[side],b=m.fighters[1-side];f.x=side?500:300;b.x=side?345:455;press(m,side,{[button]:true});const attack=f.attack;m.advance(MOVES[attack].duration+3000);
    const hits=m.drainEvents().filter(e=>e.type==='hit'&&e.attack===attack);assert.equal(hits.length,count,`${id}/${button}/${side}`);assert.ok(b.hp<200);assert.ok(hits.every(e=>!e.blocked));
  }
});
test('every offensive U/I/O causes its authored real hits in both directions',()=>{
  const specs=[[10,1,1],[10,2,2],[10,3,1],[11,1,1],[11,3,1],[12,1,1],[12,2,1],[12,3,1],[13,1,1],[13,3,3],[14,1,2],[14,2,1],[14,3,1]];
  for(const[id,slot,count]of specs)for(const side of[0,1]){
    const m=fight(id,side),f=m.fighters[side],b=m.fighters[1-side];f.x=side?500:300;b.x=side?360:440;press(m,side,{['skill'+slot]:true});const attack=f.attack;m.advance(5000);
    const hits=m.drainEvents().filter(e=>e.type==='hit'&&e.attack===attack);assert.equal(hits.length,count,`${id}/${slot}/${side}`);assert.ok(b.hp<200);
  }
});
test('the five supers express projectile, rising guitar, nine marked runes, radial DJ and six-hit rabbit mechanics',()=>{
  const get=id=>MOVES[controls.schemeFor({character:id}).super];
  assert.equal(get(10).projectile,true);assert.equal(get(11).pulses.at(-1).launch>0,true);assert.equal(get(12).targetArea,true);assert.equal(get(12).pulses.length,9);assert.equal(get(13).omni,true);assert.equal(get(14).pulses.length,6);
  for(const behind of[false,true]){const m=fight(13),f=m.fighters[0],b=m.fighters[1];f.facing=1;f.x=400;b.x=behind?200:600;press(m,0,{super:true});f.facing=1;m.advance(5000);assert.ok(b.hp<200);}
});
test('supers can be guarded, obey strict 420 by 300 bounds, and reach legal elevated targets',()=>{
  for(let id=10;id<15;id++)for(const situation of['guard','far','high','inside']){
    const m=fight(id),f=m.fighters[0],b=m.fighters[1];f.x=200;b.x=situation==='far'?621:350;
    if(situation==='high'||situation==='inside'){const height=situation==='high'?301:260;m.options.terrain={platforms:[{left:300,right:700,height}]};b.y=height;}
    press(m,0,{super:true});const attack=f.attack;assert.equal(f.energy,0);m.advance(MOVES[attack].duration+3000,{},situation==='guard'?{guard:true}:{});
    if(situation==='far'||situation==='high')assert.equal(b.hp,200,`${id}/${situation}`);else if(situation==='guard'){const hits=m.drainEvents().filter(e=>e.type==='hit');assert.equal(hits.length,MOVES[attack].pulses.length);assert.ok(b.hp>=200-hits.length*2);assert.ok(hits.every(e=>e.blocked));}else assert.ok(b.hp<200);
  }
});
test('interruptions stop unfinished skills, preserve already emitted notes, and round/reset clears resources',()=>{
  const m=fight(10),f=m.fighters[0];press(m,0,{skill2:true});m.advance(170);assert.equal(m.waves.length,1);const wave=m.waves[0];m.hit(1,'heavy');m.freeze=0;m.advance(200);assert.equal(m.waves.length,1);assert.equal(m.waves[0],wave);
  const n=fight(14),a=n.fighters[0];press(n,0,{skill3:true});const pending=a.attack;a.attackMs=50;n.hit(1,'heavy');assert.equal(a.attack,null);n.advance(3000);assert.ok(!n.drainEvents().some(e=>e.type==='hit'&&e.attack===pending));
  m.endRound();assert.equal(m.waves.length,0);assert.equal(m.areas.length,0);m.restart();assert.equal(m.fighters[0].stageForm,null);assert.equal(m.fighters[0].hp,200);
});
test('confirmed normals can cancel into owned MewType specials/supers and pause freezes every timer',()=>{
  for(let id=10;id<15;id++){
    const m=fight(id),f=m.fighters[0];f.attack=mewtype.normalFor(f,'light');f.attackMs=100;f.hit=true;f.contact=true;f.hitMarks=[0];
    assert.equal(m.canCancel(f,controls.schemeFor(f).base[0]),true);assert.equal(m.canCancel(f,controls.schemeFor(f).super),true);assert.equal(m.canCancel(f,'mujicaTransform'),false);
    f.contact=false;assert.equal(m.canCancel(f,controls.schemeFor(f).super),false);m.setPaused(true);const before=JSON.stringify(m.fighters);m.advance(1500);assert.equal(JSON.stringify(m.fighters),before);
  }
});
test('both players have independent traps/shields/cooldowns and combat never mutates shared move data',()=>{
  const m=new Match({mode:'duel',characters:[12,12]});m.start();m.advance(1000);m.fighters.forEach(f=>f.energy=100);const data=JSON.stringify(MOVES);
  m.advance(10,{unified:true,skill2:true},{unified:true,skill2:true});m.advance(150);assert.equal(m.areas.length,2);assert.notEqual(m.fighters[0].moveCooldowns,m.fighters[1].moveCooldowns);m.advance(1500);assert.equal(JSON.stringify(MOVES),data);
});
test('CPU uses all four owned skills without H or unsupported normals on all maps and climbs every highest deck',()=>{
  for(const map of require('../assets/stages.json'))for(let id=10;id<15;id++){
    const m=fight(id,1,map.terrain);m.options.mode='cpu';m.options.difficulty=2;const slots=new Set();
    for(let i=0;i<20000;i++){
      m.fighters.forEach(f=>{f.hp=200;f.energy=100;});m.remaining=60000;m.advance(10);
      for(const e of m.drainEvents())if(e.type==='attack'&&e.side===1){const move=MOVES[e.attack];assert.ok(e.attack==='throw'||move.ownerCharacter===id&&move.form==='virtual');if(move.slot)slots.add(move.slot);assert.ok(!['medium','lightKick','mediumKick','heavyKick'].some(key=>e.attack.endsWith('_'+key)));}
      assert.equal(m.fighters[1].stageForm,null);if(['u','i','o','super'].every(slot=>slots.has(slot)))break;
    }
    assert.ok(['u','i','o','super'].every(slot=>slots.has(slot)),`${map.id}/${id}/${[...slots]}`);
    const n=fight(id,1,map.terrain);n.options.mode='cpu';n.options.difficulty=2;const target=map.terrain.platforms.reduce((a,b)=>a.height>b.height?a:b);Object.assign(n.fighters[0],{x:(target.left+target.right)/2,y:target.height});let reached=false;
    for(let i=0;i<1500&&n.phase==='fighting';i++){n.advance(10);const a=n.fighters[1];if(n.grounded(a)&&Math.abs(a.y-target.height)<.1&&a.x>=target.left&&a.x<=target.right){reached=true;break;}}
    assert.ok(reached,`${map.id}/${id}`);
  }
});
