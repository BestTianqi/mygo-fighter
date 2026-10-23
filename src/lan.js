(function(root){
  'use strict';
  function createLan({assets,roster,onPrepare,onState,onLobby,onDisconnect}) {
    const $=id=>document.getElementById(id), dialog=$('lan-dialog');
    let token=null,side=0,room=null,stream=null,active=false,preparing=false,lastInput='',lastSent=0,inflight=false,queued=null,generation=0,connecting=false,lastDirections={};
    const status=text=>$('lan-status').textContent=text;
    async function api(command,data={}) {
      const response=await fetch('/api/'+command,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,...data})});
      const result=await response.json();if(!response.ok)throw Error(result.error||'连接失败');return result;
    }
    function render(){
      $('lan-connect').hidden=!!token;$('lan-room').hidden=!token;
      if(!room)return;
      $('lan-code').textContent=room.code;$('lan-side').textContent=side===0?'你是房主 · 1P':'你是 2P';
      $('lan-character').value=room.players[side]?.character??side;
      $('lan-arena').value=room.arena;$('lan-arena').disabled=side!==0||preparing||room.playing;
      $('lan-terrain').checked=room.terrain;$('lan-terrain').disabled=side!==0||preparing||room.playing;
      $('lan-character').disabled=preparing||room.playing;
      $('lan-players').textContent=room.players.map((p,i)=>`${i+1}P · ${p?roster[p.character].name+' · '+(p.connected?(p.ready?'已准备':'未准备'):'连接中'):'等待加入'}`).join('　 /　 ');
      $('lan-ready').disabled=preparing||room.playing||!room.players.every(p=>p?.connected);
      $('lan-ready').textContent=room.players[side]?.ready?'取消准备':'准备开战';
    }
    async function connect(command){
      if(connecting||token)return;connecting=true;
      try{
        status('正在连接…');const result=await api(command,{code:$('lan-join-code').value.trim()});token=result.token;side=result.side;room=result.room;render();
        stream=new EventSource('/api/stream?token='+encodeURIComponent(token));
        stream.addEventListener('room',event=>{room=JSON.parse(event.data);
          if(preparing&&room.generation!==generation){preparing=false;active=false;onLobby();if(!dialog.open)dialog.showModal();}
          render();
          $('lan-battle-status').textContent=`局域网 · 你是 ${side+1}P · ${room.players.every(p=>p?.connected)?'双方在线':'对方已断线，等待重连'}`;
          if(!room.playing&&!preparing&&active){active=false;onLobby();if(!dialog.open)dialog.showModal();}
          status(room.players.every(p=>p?.connected)?'双方已连接，选好角色后各自准备。':'分享此页面地址和房间码，等待另一台电脑加入。');});
        stream.addEventListener('prepare',async event=>{
          const packet=JSON.parse(event.data);generation=packet.generation;preparing=true;active=false;lastDirections={};render();status('正在准备双方角色…');
          try{await onPrepare(packet.config);if(!token||generation!==packet.generation)return;await api('loaded',{generation});}
          catch(e){preparing=false;status(e.message);await api('lobby').catch(()=>{});render();}
        });
        stream.addEventListener('state',event=>{const packet=JSON.parse(event.data);if(packet.generation!==generation)return;
          if(preparing){preparing=false;active=true;dialog.close();lastInput='';}
          if(active)onState(packet.state,packet.events);});
        stream.onerror=()=>{status('连接中断，正在重连；对战已暂停。');onDisconnect();};
      }catch(e){status(e.message);}finally{connecting=false;}
    }
    function open(){
      if(location.protocol==='file:'){status('请先双击「启动局域网联机.cmd」，再从显示的 http 地址进入游戏。');$('lan-create').disabled=$('lan-join').disabled=true;}
      else status('同一 Wi-Fi / 局域网下，一人创建房间，另一人输入房间码。');
      if(!dialog.open)dialog.showModal();render();
    }
    async function command(name,data={}){try{await api(name,data);}catch(e){status(e.message);}}
    function leave(){if(token)api('leave').catch(()=>{});token=null;stream?.close();stream=null;active=preparing=false;room=null;generation++;$('lan-battle-status').textContent='';dialog.close();onLobby();}
    root.addEventListener('pagehide',()=>{if(token)navigator.sendBeacon('/api/leave',new Blob([JSON.stringify({token})],{type:'application/json'}));});
    setInterval(()=>{if(token)api('ping').catch(()=>{onDisconnect();});},500);
    for(const c of roster){const option=document.createElement('option');option.value=c.id??roster.indexOf(c);option.textContent=c.name;$('lan-character').append(option);}
    assets.stages.forEach((s,i)=>{const option=document.createElement('option');option.value=i;option.textContent=s.name;$('lan-arena').append(option);});
    $('menu-lan').addEventListener('click',open);$('lan-create').addEventListener('click',()=>connect('create'));$('lan-join').addEventListener('click',()=>connect('join'));
    $('lan-ready').addEventListener('click',()=>{document.dispatchEvent(new Event('lan-unlock-audio'));command('ready',{ready:!room.players[side]?.ready});});
    $('lan-character').addEventListener('change',()=>command('choose',{character:Number($('lan-character').value)}));
    $('lan-arena').addEventListener('change',()=>command('choose',{arena:Number($('lan-arena').value)}));
    $('lan-terrain').addEventListener('change',()=>command('choose',{terrain:$('lan-terrain').checked}));
    $('lan-leave').addEventListener('click',leave);$('lan-close').addEventListener('click',()=>{if(token)leave();else dialog.close();});
    dialog.addEventListener('cancel',event=>{event.preventDefault();if(token)leave();else dialog.close();});
    return {open,leave,command,get connected(){return !!token;},get active(){return active;},get side(){return side;},
      sendInput(input){if(!active)return;lastDirections={...lastDirections,...input.pressDirections};input={...input,pressDirections:lastDirections};const now=performance.now(),encoded=JSON.stringify(input);if(encoded===lastInput&&now-lastSent<250)return;
        lastInput=encoded;lastSent=now;queued=input;
        if(inflight)return;
        (async()=>{inflight=true;try{while(queued&&token){const value=queued;queued=null;await api('input',{input:value});}}catch(e){onDisconnect();}finally{inflight=false;}})();
      }};
  }
  root.MygoLan={createLan};
})(window);
