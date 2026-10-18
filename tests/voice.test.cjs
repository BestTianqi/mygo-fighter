const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createVoicePlayer}=require('../src/voice.js');

function setup(){
  const sources=[];
  const context={currentTime:0,createBufferSource(){const s={buffer:null,connect(){},start(at,offset){this.offset=offset;this.started=true;},stop(){this.stopped=true;this.onended?.();}};sources.push(s);return s;},
    createGain(){return {gain:{value:0},connect(){}};},destination:{}};
  const buffers={penguinKick:{duration:2},penguinCry:{duration:3},penguinHey:{duration:1},penguinLaugh:{duration:2},penguinCall:{duration:2.5}};
  return {player:createVoicePlayer(context,buffers),context,sources};
}
test('each penguin skill plays its recorded buffer, once, only while sound is enabled',()=>{
  const {player,sources}=setup();assert.equal(player.play('penguinKick',0),false);
  player.setEnabled(true);
  for(const name of ['penguinKick','penguinCry','penguinHey','penguinLaugh','penguinCall'])assert.equal(player.play(name,0),true);
  assert.equal(sources.length,5);assert.ok(sources.slice(0,-1).every(s=>s.stopped));
  assert.equal(player.play('tomoriEcho',0),false);assert.equal(sources.length,5);
});
test('players have independent voice channels; pause resumes the remaining clip, mute clears it',()=>{
  const {player,sources,context}=setup();player.setEnabled(true);player.play('penguinCry',0);player.play('penguinHey',1);
  context.currentTime=.4;player.setPaused(true);assert.ok(sources.every(s=>s.stopped));
  context.currentTime=5;player.setPaused(false);assert.equal(sources.length,4);
  assert.equal(sources[2].offset,.4);assert.equal(sources[3].offset,.4);
  player.stop(0);assert.equal(sources[2].stopped,true);assert.ok(!sources[3].stopped);
  player.setEnabled(false);assert.equal(sources[3].stopped,true);player.setEnabled(true);player.setPaused(false);
  assert.equal(sources.length,4);
});
test('natural completion, interruption and reset cannot leave a delayed or stale voice',()=>{
  const {player,sources,context}=setup();player.setEnabled(true);player.play('penguinHey',0);
  sources[0].onended();player.setPaused(true);player.setPaused(false);assert.equal(sources.length,1);
  player.play('penguinCry',0);context.currentTime=.5;player.setPaused(true);player.stop();player.setPaused(false);
  assert.equal(sources.length,2);assert.equal(player.play('penguinCry',0),true);
  player.stop();assert.equal(sources[2].stopped,true);
});
