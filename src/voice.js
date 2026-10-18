/* Two independent recorded-voice channels; combat remains in engine.js. */
(function(root){
  'use strict';
  function createVoicePlayer(context,buffers){
    const channels=new Map(),gain=context.createGain();
    gain.gain.value=.8;gain.connect(context.destination);
    let enabled=false,paused=false;
    function halt(slot){
      const source=slot.source;slot.source=null;
      if(source){source.onended=null;source.stop();source.disconnect?.();}
    }
    function begin(side,slot){
      const source=context.createBufferSource();source.buffer=slot.buffer;source.connect(gain);
      slot.source=source;slot.startedAt=context.currentTime;
      source.onended=()=>{source.disconnect?.();if(channels.get(side)===slot&&slot.source===source)channels.delete(side);};
      source.start(0,slot.offset);
    }
    function stop(side){
      for(const [key,slot]of channels)if(side===undefined||key===side){halt(slot);channels.delete(key);}
    }
    return {
      play(move,side){
        if(!enabled||paused||!buffers[move])return false;
        stop(side);const slot={buffer:buffers[move],offset:0,source:null};channels.set(side,slot);begin(side,slot);return true;
      },
      stop,
      setEnabled(value){enabled=value;if(!value)stop();},
      setPaused(value){
        if(paused===value)return;paused=value;
        for(const [side,slot]of channels){
          if(value){slot.offset+=context.currentTime-slot.startedAt;halt(slot);}
          else if(slot.offset<slot.buffer.duration)begin(side,slot);
          else channels.delete(side);
        }
      }
    };
  }
  const api={createVoicePlayer};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.MygoVoice=api;
})(typeof globalThis!=='undefined'?globalThis:this);
