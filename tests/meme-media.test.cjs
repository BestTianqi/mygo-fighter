const {test}=require('node:test');
const assert=require('node:assert/strict');
const {existsSync}=require('node:fs');
const {join}=require('node:path');
const controls=require('../src/controls.js');

function media(){
  const file=join(__dirname,'../src/meme-media.js');
  assert.ok(existsSync(file),'the meme media module must exist');
  return require(file);
}
function assetsFor(character){
  const slots=Object.fromEntries(['u','i','o','p','h'].map(slot=>[slot,{voice:`${character}-${slot}`,label:`${character} ${slot}`} ]));
  slots.p={...slots.p,video:`data:video/mp4;base64,${character}`,duration:3};
  return {memeSkills:{[character]:{slots,variants:{}}},memeVoices:Object.fromEntries(Object.values(slots).map(entry=>[entry.voice,'recorded-audio']))};
}
function panels(){
  return [0,1].map(()=>{
    const video={src:'',currentTime:0,muted:false,loop:true,paused:true,plays:0,srcWrites:0,
      play(){this.paused=false;this.plays++;return Promise.resolve();},
      pause(){this.paused=true;}};
    let src='';Object.defineProperty(video,'src',{get(){return src;},set(value){src=value;this.srcWrites++;}});
    return {hidden:true,video,querySelector(selector){assert.equal(selector,'video');return video;}};
  });
}

test('every character base skill and directional variant uses its own recorded slot',()=>{
  const {resolve}=media();
  for(let character=0;character<15;character++){
    const fighter={character,attack:null},assets=assetsFor(character),scheme=controls.schemeFor(fighter);
    for(const [index,attack]of scheme.base.entries()){
      const slot=['u','i','o'][index],entry=resolve(assets,fighter,attack,scheme);
      assert.equal(entry.voice,`${character}-${slot}`);assert.equal(entry.slot,slot);
    }
    for(const [gesture,attack]of Object.entries(scheme.variants)){
      const slot=['u','i','o'][Number(gesture.at(-1))-1],entry=resolve(assets,fighter,attack,scheme);
      assert.equal(entry.voice,`${character}-${slot}`,`${character} ${gesture} ${attack}`);
      assert.equal(entry.slot,slot);
    }
  }
});
test('legacy Soyo video references resolve without embedding the movie twice',()=>{
  const {resolve}=media(),fighter={character:1},assets=assetsFor(1),scheme=controls.schemeFor(fighter);
  assets.soyoSuperVideo='data:video/mp4;base64,legacy';
  delete assets.memeSkills[1].slots.p.video;
  assets.memeSkills[1].slots.p.videoRef='soyoSuperVideo';
  assert.equal(resolve(assets,fighter,scheme.super,scheme).video,assets.soyoSuperVideo);
});

test('shared wave chooses character and the explicit event attack even after interruption',()=>{
  const {resolve}=media(),assets=assetsFor(0);Object.assign(assets.memeSkills,assetsFor(1).memeSkills);
  for(const character of [0,1]){
    const fighter={character,attack:null};assert.equal(resolve(assets,fighter,'wave',controls.schemeFor(fighter)).voice,`${character}-i`);
    fighter.attack='wave';assert.equal(resolve(assets,fighter,'light',controls.schemeFor(fighter)),null);
  }
});
test('explicit variant recordings override base fallback, supers carry video and H is optional',()=>{
  const {resolve}=media(),fighter={character:0},scheme={base:['a','b','c'],super:'ultimate',transform:'form',variants:{down2:'heal'}};
  const assets=assetsFor(0),specific={voice:'0-heal',label:'heal meme'};assets.memeSkills[0].variants.heal=specific;
  assert.deepEqual(resolve(assets,fighter,'heal',scheme),{...specific,slot:'i'});
  assert.equal(resolve(assets,fighter,'ultimate',scheme).video,assets.memeSkills[0].slots.p.video);
  assert.equal(resolve(assets,fighter,'ultimate',scheme).duration,3);
  assert.equal(resolve(assets,fighter,'form',scheme).slot,'h');
  delete assets.memeSkills[0].slots.h;assert.equal(resolve(assets,fighter,'form',scheme),null);
  for(const attack of ['light','heavy','hit','unknown',null])assert.equal(resolve(assets,fighter,attack,scheme),null);
  assert.equal(resolve(assets,{character:14},'a',scheme),null);
});
test('both players can show different muted nonlooping cutins and stopping one preserves the other',()=>{
  const {createCutinPlayer}=media(),views=panels(),player=createCutinPlayer(views);
  for(const side of [0,1])assert.equal(player.start(side,{video:`data:video/${side}`},{character:side,attack:'super'}),true);
  for(const view of views){assert.equal(view.hidden,false);assert.equal(view.video.muted,true);assert.equal(view.video.loop,false);assert.equal(view.video.paused,false);}
  views[0].video.currentTime=1;views[1].video.currentTime=2;player.stop(0);
  assert.equal(views[0].hidden,true);assert.equal(views[0].video.currentTime,0);assert.equal(views[0].video.paused,true);
  assert.equal(views[1].hidden,false);assert.equal(views[1].video.currentTime,2);assert.equal(views[1].video.paused,false);
});
test('pause hides cutins and resume preserves progress without repeated play requests',()=>{
  const {createCutinPlayer}=media(),views=panels(),player=createCutinPlayer(views),fighters=[{character:11,attack:'super'}];
  player.start(0,{video:'data:video/ritsu'},fighters[0]);views[0].video.currentTime=1.25;
  player.sync(fighters,true,'fighting');assert.equal(views[0].hidden,true);assert.equal(views[0].video.paused,true);assert.equal(views[0].video.currentTime,1.25);
  player.sync(fighters,false,'fighting');assert.equal(views[0].hidden,false);assert.equal(views[0].video.currentTime,1.25);assert.equal(views[0].video.paused,false);
  player.sync(fighters,false,'fighting');assert.equal(views[0].video.plays,2);
});

test('all cutins retain original speed even if legacy data contains an accelerated rate',()=>{
  const {createCutinPlayer}=media(),views=panels(),player=createCutinPlayer(views),owner={character:7,attack:'super'};
  player.start(0,{video:'data:video/crawl',videoRate:4.947368},owner);
  assert.equal(views[0].video.playbackRate,1);
  assert.equal(views[0].video.defaultPlaybackRate,1);
  player.start(0,{video:'data:video/anon'},owner);
  assert.equal(views[0].video.playbackRate,1);
  assert.equal(views[0].video.defaultPlaybackRate,1);
});
test('cutin ownership snapshots detect character changes and match reset',()=>{
  const {createCutinPlayer}=media();
  for(const change of ['character','phase']){
    const views=panels(),player=createCutinPlayer(views),fighters=[{character:11,attack:'super'}];
    player.start(0,{video:'data:video/ritsu'},fighters[0]);views[0].video.currentTime=1;
    if(change==='attack')fighters[0].attack=null;if(change==='character')fighters[0].character=12;
    player.sync(fighters,true,change==='phase'?'ready':'fighting');
    assert.equal(views[0].hidden,true);assert.equal(views[0].video.currentTime,0);assert.equal(views[0].video.paused,true);
    player.sync([{character:11,attack:'super'}],false,'fighting');assert.equal(views[0].hidden,true);
  }
});
test('restarting a cutin rewinds it without reloading the same video; stop clears both sides',()=>{
  const {createCutinPlayer}=media(),views=panels(),player=createCutinPlayer(views),presentation={video:'data:video/ritsu'};
  player.start(0,presentation,{character:11,attack:'super'});views[0].video.currentTime=2;
  player.start(0,presentation,{character:11,attack:'super'});assert.equal(views[0].video.currentTime,0);assert.equal(views[0].video.srcWrites,1);
  player.start(1,{video:'data:video/yuno'},{character:13,attack:'super'});player.stop();
  assert.ok(views.every(view=>view.hidden&&view.video.paused&&view.video.currentTime===0));
});
test('natural completion hides a cutin and an old completion cannot stop its replacement',()=>{
  const {createCutinPlayer}=media(),views=panels(),player=createCutinPlayer(views),fighter={character:11,attack:'super'};
  player.start(0,{video:'data:video/a'},fighter);const oldEnd=views[0].video.onended;
  player.start(0,{video:'data:video/b'},fighter);oldEnd();assert.equal(views[0].hidden,false);
  views[0].video.onended();assert.equal(views[0].hidden,true);assert.equal(views[0].video.currentTime,0);
  player.sync([fighter],false,'fighting');assert.equal(views[0].hidden,true);
});
test('rejected or synchronously blocked video playback is contained',async()=>{
  const {createCutinPlayer}=media(),views=panels(),player=createCutinPlayer(views);
  views[0].video.play=()=>Promise.reject(new Error('autoplay blocked'));
  assert.doesNotThrow(()=>player.start(0,{video:'data:video/a'},{character:0,attack:'super'}));
  await new Promise(resolve=>setImmediate(resolve));
  views[1].video.play=()=>{throw new Error('media unavailable');};
  assert.doesNotThrow(()=>player.start(1,{video:'data:video/b'},{character:1,attack:'super'}));
  player.stop();
  assert.equal(player.start(0,{voice:'audio-only'},{character:0,attack:'super'}),false);
});

 test('a recovered fighter can move and use another attack while her original-speed cutin continues',()=>{
  const {createCutinPlayer}=media(),views=panels(),player=createCutinPlayer(views);
  const f={character:7,attack:'crawl'};player.start(0,{video:'data:video/crawl'},f);
  views[0].video.currentTime=1.1;f.attack=null;player.sync([f],false,'fighting');
  assert.equal(views[0].hidden,false);assert.equal(views[0].video.currentTime,1.1);
  f.attack='light';player.sync([f],false,'fighting');assert.equal(views[0].hidden,false);
  views[0].video.onended();assert.equal(views[0].hidden,true);
});

test('stage-only recordings override shared H and throw while normal form retains its voice',()=>{
  const {resolve}=media(),a=assetsFor(8),normal={character:8},stage={character:8,stageForm:{ms:19000}};
  a.memeSkills[8].variants.throw={voice:'normal-throw'};
  a.memeSkills[8].variants.stage_throw={voice:'mortis-throw'};
  a.memeSkills[8].variants.stage_mujicaTransform={voice:'mortis-h'};
  assert.equal(resolve(a,normal,'throw',controls.schemeFor(normal)).voice,'normal-throw');
  assert.equal(resolve(a,stage,'throw',controls.schemeFor(stage)).voice,'mortis-throw');
  assert.equal(resolve(a,normal,'mujicaTransform',controls.schemeFor(normal)).voice,'8-h');
  assert.equal(resolve(a,stage,'mujicaTransform',controls.schemeFor(stage)).voice,'mortis-h');
});
