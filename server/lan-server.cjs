/* LAN relay and authoritative simulation. No npm packages required. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const { Match, ROSTER } = require('../src/engine.js');
const ROOT = path.resolve(__dirname, '..');
const stages = JSON.parse(fs.readFileSync(path.join(__dirname, 'stages.json'), 'utf8'));
const actions = ['left','right','jump','crouch','light','heavy','blink','skill1','skill2','skill3','transform','super'];
const TEAM_SIZE = 3;
function validTeam(team) {
  return Array.isArray(team) && team.length === TEAM_SIZE && new Set(team).size === TEAM_SIZE &&
    team.every(id => Number.isInteger(id) && id >= 0 && id < ROSTER.length);
}
function defaultTeam(character) { return Array.from({ length: TEAM_SIZE }, (_, i) => (character + i) % ROSTER.length); }
function createLanServer() {
  const rooms = new Map(), sessions = new Map();
  function publicRoom(r) { return { code:r.code, arena:r.arena, terrain:r.terrain, format:r.format, generation:r.generation,
    players:r.players.map(p=>p&&({character:p.character,team:p.team?[...p.team]:[],ready:p.ready,connected:!!p.stream&&p.online})), playing:!!r.match }; }
  function send(p, type, data) {
    if (!p?.stream || p.stream.writableLength > 1024*1024) return;
    p.stream.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  }
  function broadcast(r) { r.players.forEach(p=>send(p,'room',publicRoom(r))); }
  function inputsOff(r) { r.players.forEach(p=>{if(p){p.input={};p.pending={};}}); r.match?.release(); }
  function lobby(r) {r.match=null;r.config=null; r.events=[]; r.generation++; inputsOff(r);r.players.forEach(p=>{if(p){p.ready=false;p.loaded=0;}});broadcast(r);}
  function identify(token) { const p=sessions.get(token); if(!p) throw Error('房间连接已失效，请重新加入。');return [p,rooms.get(p.code)]; }
  function reply(res,status,data) {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
  const server = http.createServer(async(req,res)=>{
    const url=new URL(req.url,'http://localhost');
    if(req.method==='GET'&&url.pathname==='/api/health'){reply(res,200,{app:'mygo-lan',ok:true});return;}
    if(req.method==='GET'&&url.pathname==='/api/stream') {
      try { const [p,r]=identify(url.searchParams.get('token'));p.stream?.end();
        res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});res.write(': connected\n\n');p.stream=res;p.online=true;p.seen=Date.now();broadcast(r);
        req.on('close',()=>{if(p.stream===res){p.stream=null;p.input={};p.pending={};if(r.match)r.match.setPaused(true);else if(r.config)lobby(r);broadcast(r);}});
      } catch(e){reply(res,404,{error:e.message});}return;
    }
    if(req.method==='POST'&&url.pathname.startsWith('/api/')) {
      try {
        if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host) throw Error('请从本机联机服务页面进入。');
        let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>8192)throw Error('请求过大');}
        const data=JSON.parse(raw||'{}'), command=url.pathname.slice(5);
        let p,r;
        if(command==='create'||command==='join') {
          if(command==='create') {if(rooms.size>=20)throw Error('房间已满');const code=crypto.randomBytes(3).toString('hex').toUpperCase();r={code,players:[null,null],arena:0,terrain:true,format:'1v1',generation:0,match:null,events:[],last:Date.now()};rooms.set(code,r);}
          else {r=rooms.get(String(data.code).toUpperCase());if(!r)throw Error('找不到房间，请核对房间码');}
          const side=r.players.findIndex(x=>!x);if(side<0)throw Error('房间已有两名玩家');
          p={token:crypto.randomBytes(24).toString('hex'),code:r.code,side,character:side,team:[side],ready:false,input:{},pending:{},seen:Date.now(),loaded:0};r.players[side]=p;sessions.set(p.token,p);broadcast(r);
          reply(res,200,{token:p.token,side,room:publicRoom(r)});return;
        }
        [p,r]=identify(data.token);p.seen=Date.now();
        if(command==='ping') {if(!p.online&&p.stream){p.online=true;broadcast(r);}}
        else if(command==='input') {
          const next={unified:true,pressIds:{},pressDirections:{}};
          for(const key of actions){next[key]=data.input?.[key]===true;if(next[key]&&!p.input[key])p.pending[key]=true;
            next.pressIds[key]=Number.isSafeInteger(data.input?.pressIds?.[key])?data.input.pressIds[key]:0;
            if(next.pressIds[key]>(p.input.pressIds?.[key]||0))p.pending[key]=true;
            const d=data.input?.pressDirections?.[key];if(d)next.pressDirections[key]=Object.fromEntries(['left','right','jump','crouch'].map(k=>[k,d[k]===true]));}
          p.input=next;
        } else if(command==='choose') {
          if(r.match)throw Error('请先返回房间再选人');r.config=null;r.generation++;
          if(data.format!==undefined){
            if(p.side!==0)throw Error('请由房主选择对战模式');
            if(data.format!=='1v1'&&data.format!=='3v3')throw Error('未知对战模式');
            if(data.format!==r.format){r.format=data.format;r.players.forEach(x=>{if(x){x.team=data.format==='3v3'?defaultTeam(x.character):[x.character];x.ready=false;}});}
          }
          if(p.side===0){if(Number.isInteger(data.arena)&&stages[data.arena])r.arena=data.arena;if(typeof data.terrain==='boolean')r.terrain=data.terrain;}
          if(r.format==='3v3'){
            if(data.team!==undefined){if(!validTeam(data.team))throw Error('阵容需要 3 名不重复的角色');p.team=[...data.team];p.character=p.team[0];}
          } else if(Number.isInteger(data.character)&&data.character>=0&&data.character<ROSTER.length){p.character=data.character;p.team=[data.character];}
          r.players.forEach(x=>{if(x)x.ready=false;});broadcast(r);
        } else if(command==='ready') {
          if(r.match||r.config)throw Error('对战正在准备或进行');
          if(data.ready&&r.format==='3v3'&&!r.players.every(x=>x&&validTeam(x.team)))throw Error('双方各需要 3 名不重复的出战角色');
          p.ready=!!data.ready;broadcast(r);
          if(r.players.every(x=>x?.ready&&x.stream&&x.online)) {
            r.generation++;r.players.forEach(x=>x.loaded=0);
            const config={mode:'duel',format:r.format,characters:r.players.map(x=>x.character),...(r.format==='3v3'?{teams:r.players.map(x=>[...x.team])}:{}),seed:crypto.randomInt(1,2147483647),settings:{arena:r.arena,terrain:r.terrain,difficulty:1,sound:true,dummy:'idle'}};
            r.config=config;r.players.forEach(x=>send(x,'prepare',{config,generation:r.generation}));
          }
        } else if(command==='loaded') {
          if(data.generation===r.generation)p.loaded=data.generation;
          if(!r.match&&r.config&&r.players.every(x=>x?.stream&&x.loaded===r.generation)) {
            r.match=new Match({...r.config,terrain:r.terrain?stages[r.arena].terrain:null});r.match.start();r.last=Date.now();broadcast(r);
          }
        } else if(command==='pause') {
          if(r.match){if(!data.paused&&!r.players.every(x=>x?.stream&&x.online))throw Error('等待对方重新连接');r.match.setPaused(!!data.paused);inputsOff(r);}
        } else if(command==='restart') {if(p.side!==0)throw Error('请由房主重新开战');if(r.match){r.match.restart();r.match.events.push({type:'roundAdvance',characters:[...r.match.options.characters]});inputsOff(r);}}
        else if(command==='lobby'){lobby(r);}
        else if(command==='leave'){sessions.delete(p.token);r.players[p.side]=null;p.stream?.end();lobby(r);if(r.players.every(x=>!x))rooms.delete(r.code);}
        else throw Error('未知操作');
        reply(res,200,{ok:true});
      }catch(e){reply(res,400,{error:e.message});}return;
    }
    if(req.method==='GET'&&(url.pathname==='/'||url.pathname==='/index.html')) {
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});fs.createReadStream(path.join(ROOT,'index.html')).pipe(res);return;
    }
    res.writeHead(404);res.end('Not found');
  });
  let frame=0;
  const timer=setInterval(()=>{
    const now=Date.now();for(const r of rooms.values()) {
      for(const p of r.players)if(p&&now-p.seen>2000&&p.online){p.online=false;p.input={};p.pending={};if(r.match)r.match.setPaused(true);broadcast(r);}
      if(r.match){const before=r.match.inputTick; r.match.advance(Math.min(50,now-r.last),...r.players.map(p=>({...p?.input,...p?.pending})));r.last=now;
        if(before!==r.match.inputTick)r.players.forEach(p=>{if(p)p.pending={};});r.events.push(...r.match.drainEvents());
        if(frame%2===0){const state={...r.match,events:[]};const packet={generation:r.generation,state,events:r.events.splice(0)};r.players.forEach(p=>send(p,'state',packet));}
      }
      if(frame%60===0)r.players.forEach(p=>p?.stream?.write(': heartbeat\n\n'));
      if(r.players.every(p=>!p||!p.stream)&&now-r.last>30*60*1000){r.players.forEach(p=>{if(p)sessions.delete(p.token)});rooms.delete(r.code);}
    }frame++;
  },1000/60);
  server.on('close',()=>clearInterval(timer));
  server.shutdown=()=>{for(const p of sessions.values())p.stream?.end();server.close();};
  return server;
}
function lanAddresses(){const list=[];for(const entries of Object.values(os.networkInterfaces()))for(const address of entries||[])if(address.family==='IPv4'&&!address.internal&&!/^(169\.254\.|198\.1[89]\.)/.test(address.address))list.push(address.address);return list;}
if(require.main===module){
  const port=Number(process.env.PORT||8765);
  const server=createLanServer();
  server.on('error',e=>{
    if(e.code!=='EADDRINUSE') throw e;
    console.log('The server could not start: port '+port+' is already in use.');
    console.log('');
    console.log('MyGO LAN is most likely ALREADY RUNNING. Do not start a second copy.');
    console.log('Open one of these addresses in your browser:');
    console.log('  http://localhost:'+port);
    for(const address of lanAddresses())console.log('  http://'+address+':'+port);
    console.log('');
    console.log('If the old server window is gone, close the process holding port '+port+' and run this launcher again.');
    console.log('To run a second server on another port: set PORT=8766');
    process.exit(0);
  });
  server.listen(port,'0.0.0.0',()=>{
    console.log('MyGO LAN: http://localhost:'+port);
    for(const address of lanAddresses())console.log('Join: http://'+address+':'+port);
  });
}
module.exports={createLanServer};
