const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createLanServer}=require('../server/lan-server.cjs');
test('LAN rooms enforce ownership, readiness, capacity and release departed slots',async()=>{
 const server=createLanServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 const api=async(name,data={})=>{const res=await fetch(base+'/api/'+name,{method:'POST',body:JSON.stringify(data)});return {status:res.status,...await res.json()};};
 const controllers=[];
 try{
  const a=await api('create'),b=await api('join',{code:a.room.code});
  assert.equal(a.side,0);assert.equal(b.side,1);
  assert.equal((await api('join',{code:a.room.code})).status,400);
  assert.equal((await api('input',{token:'invalid'})).status,400);
  const streams=[];
  for(const p of [a,b]){const controller=new AbortController();controllers.push(controller);const res=await fetch(base+'/api/stream?token='+p.token,{signal:controller.signal});const messages=[];streams.push(messages);
   (async()=>{try{for await(const chunk of res.body)messages.push(Buffer.from(chunk).toString());}catch{}})();}
  await api('choose',{token:a.token,arena:6,character:6});await api('choose',{token:b.token,arena:1,character:8});
  await api('ready',{token:a.token,ready:true});await api('ready',{token:b.token,ready:true});
  await new Promise(r=>setTimeout(r,80));
  const text=streams[0].join('');const prepare=text.match(/event: prepare\ndata: ([^\n]+)/);assert.ok(prepare);
  const packet=JSON.parse(prepare[1]);assert.deepEqual(packet.config.characters,[6,8]);assert.equal(packet.config.settings.arena,6);
  for(const p of [a,b])await api('loaded',{token:p.token,generation:packet.generation});
  assert.equal((await api('restart',{token:b.token})).status,400);
  assert.equal((await api('choose',{token:a.token,character:5})).status,400);
  await api('pause',{token:b.token,paused:true});await api('lobby',{token:a.token});
  await api('leave',{token:b.token});assert.equal((await api('join',{code:a.room.code})).side,1);
  const forbidden=await fetch(base+'/src/app.js');assert.equal(forbidden.status,404);
 }finally{controllers.forEach(c=>c.abort());server.shutdown();server.closeAllConnections();}
});
