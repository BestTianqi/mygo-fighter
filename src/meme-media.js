/* Recorded skill presentations and two independent, muted video cutins. */
(function(root){
  'use strict';
  const baseSlots=['u','i','o'];
  function resolve(assets,fighter,attack,scheme){
    const character=assets?.memeSkills?.[String(fighter?.character)];
    if(!character||!scheme||!attack)return null;
    let slot=null;
    if(attack===scheme.super)slot='p';
    else if(attack===scheme.transform)slot='h';
    else{
      const index=(scheme.base||[]).indexOf(attack);
      if(index>=0)slot=baseSlots[index];
      else for(const [gesture,move]of Object.entries(scheme.variants||{})){
        if(move===attack){slot=baseSlots[Number(gesture.slice(-1))-1];break;}
      }
    }
    const variants=character.variants||{};
    const variant=fighter.stageForm&&Object.prototype.hasOwnProperty.call(variants,'stage_'+attack)?'stage_'+attack:attack;
    const entry=Object.prototype.hasOwnProperty.call(variants,variant)?variants[variant]:character.slots?.[slot];
    return entry?{...entry,...(entry.videoRef?{video:assets[entry.videoRef]}:{}),slot:slot||entry.slot||null}:null;
  }
  function createCutinPlayer(panels){
    const active=new Map();
    function play(video){
      try{video.play()?.catch(()=>{});}catch(error){/* Autoplay restrictions do not stop combat. */}
    }
    function stop(side){
      for(const [key,state]of active)if(side===undefined||side===key){
        active.delete(key);state.video.onended=null;state.video.pause();
        state.video.currentTime=0;state.panel.hidden=true;
      }
    }
    return {
      start(side,presentation,owner){
        stop(side);
        const panel=panels[side],video=panel?.querySelector('video');
        if(!video||!presentation?.video||!owner)return false;
        const state={panel,video,character:owner.character,paused:false};
        active.set(side,state);video.muted=true;video.loop=false;
        if(video.src!==presentation.video)video.src=presentation.video;
        video.defaultPlaybackRate=1;
        video.playbackRate=1;
        video.currentTime=0;panel.hidden=false;
        video.onended=()=>{if(active.get(side)===state)stop(side);};
        play(video);return true;
      },
      stop,
      sync(fighters,paused,phase){
        if(phase!=='fighting'){stop();return;}
        for(const [side,state]of active){
          const fighter=fighters[side];
          if(!fighter||fighter.character!==state.character){stop(side);continue;}
          if(state.paused===!!paused)continue;
          state.paused=!!paused;state.panel.hidden=state.paused;
          if(state.paused)state.video.pause();else play(state.video);
        }
      }
    };
  }
  const api={resolve,createCutinPlayer};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.MygoMemeMedia=api;
})(typeof globalThis!=='undefined'?globalThis:this);
