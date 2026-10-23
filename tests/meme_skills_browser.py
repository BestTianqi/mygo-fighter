"""Exercise recorded skills, real cutin playback and meme combat offline.

Run only after building the integrated game:
    python tests/meme_skills_browser.py [--file PATH] [--channel msedge]
"""
import argparse
import json
import time
from pathlib import Path

from playwright.sync_api import sync_playwright
from ui_helpers import select_game_option, start_match

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'tests/artifacts'
PROBE = r"""(() => {
  const p=window.memeProbe={decoded:[],starts:[],stops:[],active:new Map(),events:[],draws:[],runes:[],expected:{}};
  const names=new WeakMap();let fingerprints,serial=0;
  function signature(bytes){let h=2166136261;for(const v of bytes)h=Math.imul(h^v,16777619);return bytes.length+':'+(h>>>0);}
  function recordings(){
    if(fingerprints)return fingerprints;fingerprints=new Map();
    const all={...MYGO_ASSETS.penguinVoices,...MYGO_ASSETS.soyoVoices,...MYGO_ASSETS.memeVoices,...MYGO_ASSETS.summonVoices,...MYGO_ASSETS.transformMusic};
    for(const [key,url]of Object.entries(all)){
      if(typeof url!=='string'||!url.startsWith('data:audio/'))continue;
      const binary=atob(url.slice(url.indexOf(',')+1)),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0)),hash=signature(bytes);
      if(!fingerprints.has(hash))fingerprints.set(hash,[]);fingerprints.get(hash).push(key);
    }
    return fingerprints;
  }
  const proto=AudioContext.prototype,decode=proto.decodeAudioData,create=proto.createBufferSource;
  proto.decodeAudioData=function(bytes,...rest){
    const keys=recordings().get(signature(new Uint8Array(bytes)))||[];
    return decode.call(this,bytes,...rest).then(buffer=>{
      if(keys.length){names.set(buffer,keys);let energy=0,peak=0;const samples=buffer.getChannelData(0);
        for(const v of samples){energy+=v*v;peak=Math.max(peak,Math.abs(v));}
        p.decoded.push({keys,duration:buffer.duration,rms:Math.sqrt(energy/samples.length),peak});}
      return buffer;
    });
  };
  proto.createBufferSource=function(){
    const source=create.call(this),start=source.start,stop=source.stop,id=++serial,context=this;
    source.start=function(...args){
      const keys=names.get(this.buffer);if(keys){const row={id,keys,offset:args[1]||0,duration:this.buffer.duration,time:context.currentTime};p.starts.push(row);p.active.set(id,row);}
      return start.apply(this,args);
    };
    source.stop=function(...args){const keys=names.get(this.buffer);if(keys){p.stops.push({id,keys});p.active.delete(id);}return stop.apply(this,args);};
    source.addEventListener('ended',()=>p.active.delete(id));return source;
  };
  p.clear=()=>{p.starts=[];p.stops=[];p.events=[];p.draws=[];p.runes=[];p.expected={};};
})();"""

VISUAL_PROBE = r"""() => {
  const p=memeProbe,ctx=document.querySelector('#game').getContext('2d'),draw=ctx.drawImage,text=ctx.fillText,cache=new WeakMap();
  const groups=[];
  function collect(node,path=[]){
    if(!node||typeof node!=='object')return;
    if(typeof node.atlas==='string'&&Array.isArray(node.frames))groups.push({atlas:node.atlas,frames:node.frames,path:path.join('/')});
    else for(const [key,value]of Object.entries(node))if(typeof value==='object')collect(value,[...path,key]);
  }
  collect(MYGO_ASSETS.memeCrawlForms);
  ctx.drawImage=function(...args){
    const image=args[0];if(image&&typeof image==='object'&&!cache.has(image))cache.set(image,groups.find(g=>g.atlas===image.src)||null);
    const group=image&&cache.get(image);
    if(group){const frame=group.frames.find(f=>f.x===args[1]&&f.y===args[2]);if(frame){p.draws.push({path:group.path,name:frame.name,decoded:image.naturalWidth>0&&image.naturalHeight>0,alpha:ctx.globalAlpha});if(p.draws.length>1000)p.draws.shift();}}
    return draw.apply(this,args);
  };
  ctx.fillText=function(value,...args){if('临兵斗者皆阵列在前'.includes(String(value))&&String(value).length===1&&ctx.globalAlpha>.1)p.runes.push(String(value));return text.call(this,value,...args);};
  p.watchMatch=()=>{
    const match=mygoGame.match;if(match.__memeProbe)return;match.__memeProbe=true;
    const drain=match.drainEvents;match.drainEvents=function(){const events=drain.call(this);p.events.push(...events);return events;};
  };
  p.watchMatch();return groups.map(g=>({path:g.path,names:g.frames.map(f=>f.name)}));
}"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--file', type=Path, default=ROOT / 'index.html')
    parser.add_argument('--channel', default='msedge')
    parser.add_argument('--characters', nargs='+', type=int, default=list(range(15)))
    args = parser.parse_args()
    if not args.characters or any(character not in range(15) for character in args.characters):
        parser.error('characters must be IDs 0 through 14')
    ART.mkdir(parents=True, exist_ok=True)
    report = {'file': str(args.file.resolve()), 'forms': [], 'errors': [], 'remote_requests': [], 'failed_requests': []}
    began = time.monotonic()
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel=args.channel, headless=True)
        page = None

        def require(condition, detail):
            assert condition, detail

        def real_wait(target, predicate, label, timeout=20):
            # Media decoding and audio use the real clock, even with JS timers paused.
            deadline = time.monotonic() + timeout
            while time.monotonic() < deadline:
                value = target.evaluate(predicate)
                if value:
                    return value
                time.sleep(.025)
            raise AssertionError(f'{label}: {target.evaluate(predicate)!r}')

        def load(target):
            target.on('pageerror', lambda error: report['errors'].append(str(error)))
            target.on('console', lambda message: report['errors'].append(message.text) if message.type == 'error' else None)
            target.on('request', lambda request: report['remote_requests'].append(request.url) if request.url.startswith(('https:', 'http:')) else None)
            target.on('requestfailed', lambda request: report['failed_requests'].append({'url': request.url[:120], 'error': request.failure}))
            target.add_init_script(PROBE)
            target.clock.install(time='2026-01-01T00:00:00Z')
            target.goto(args.file.resolve().as_uri(), wait_until='load', timeout=120000)
            real_wait(target, '!!window.mygoGame?.loaded', 'initial assets', timeout=120)
            target.clock.pause_at('2026-01-01T00:01:00Z')
            require(target.evaluate('Object.keys(MYGO_ASSETS.memeSkills).length') == 15, 'fifteen recorded kits must be embedded')
            require(target.evaluate('Object.keys(MYGO_ASSETS.memeVoices).length') >= 60, 'at least sixty actual skill recordings')
            groups = target.evaluate(VISUAL_PROBE)
            require(groups and all({'crawl-windup', 'crawl-a', 'crawl-b', 'crawl-recover'} <= set(g['names']) for g in groups), groups)

        def await_started(target, character, opponent):
            real_wait(target, f'''document.querySelector('#loading').hidden&&mygoGame.match.fighters[0].character==={character}&&mygoGame.match.fighters[1].character==={opponent}''', 'selected fighters loaded')
            target.evaluate('memeProbe.watchMatch()')
            target.clock.run_for(1800)
            require(target.evaluate('mygoGame.match.phase') == 'fighting', 'wait until ready countdown has completed')
            target.locator('#stage').focus()

        def configure(target, character, opponent=None):
            opponent = character if opponent is None else opponent
            select_game_option(target, '#player-character', str(character))
            select_game_option(target, '#opponent-character', str(opponent))
            select_game_option(target, '#mode', 'duel')
            target.uncheck('#terrain-enabled')
            start_match(target)
            await_started(target, character, opponent)

        def sound_on(target):
            if target.locator('#sound').get_attribute('aria-pressed') != 'true':
                target.click('#sound')
            real_wait(target, '''document.querySelector('#sound').getAttribute('aria-pressed')==='true'&&Object.keys(MYGO_ASSETS.memeVoices).every(key=>memeProbe.decoded.some(row=>row.keys.includes(key)))''', 'recordings decoded', timeout=60)
            decoded = target.evaluate('memeProbe.decoded')
            require(all(row['duration'] > .1 and row['rms'] > .0001 and row['peak'] <= 1.01 for row in decoded), decoded)

        def reset(target, form='normal', both=False):
            characters = target.evaluate('mygoGame.match.fighters.map(f=>f.character)')
            target.click('#restart')
            await_started(target, *characters)
            target.evaluate('''()=>{const m=mygoGame.match;m.fighters.forEach((f,i)=>{f.energy=100;f.x=i?1350:200;f.y=0;f.vy=0;});}''')
            if form in ('stage', 'penguin'):
                for side in ([0, 1] if both else [0]):
                    target.keyboard.press('h' if side == 0 else 'Numpad7')
                    target.clock.run_for(40)
                    state = target.evaluate('side=>{const f=mygoGame.match.fighters[side];return {energy:f.energy,stage:!!f.stageForm,penguin:!!f.penguin}}', side)
                    require(state['energy'] == 50 and state[form], (form, side, state))
                target.evaluate('mygoGame.match.fighters.forEach(f=>f.energy=100)')
            target.evaluate('memeProbe.clear()')
            target.locator('#stage').focus()

        def expected(target, key, side=0):
            return target.evaluate('''({key,side})=>{
              const f=mygoGame.match.fighters[side],scheme=MygoControls.schemeFor(f),attack=key==='p'?scheme.super:scheme.base['uio'.indexOf(key)];
              const entry=MygoMemeMedia.resolve(MYGO_ASSETS,f,attack,scheme);
              if(!entry?.voice||!MYGO_ASSETS.memeVoices[entry.voice]&&!MYGO_ASSETS.penguinVoices?.[entry.voice]&&!MYGO_ASSETS.soyoVoices?.[entry.voice])throw Error('Unrecorded skill '+f.character+'/'+attack);
              memeProbe.expected[side]=entry;
              return {character:f.character,attack,voice:entry.voice,label:entry.label,duration:MygoFighter.MOVES[attack].duration,cost:MygoFighter.MOVES[attack].cost||0};
            }''', {'key': key, 'side': side})

        def voice_rows(target):
            return target.evaluate('memeProbe.starts.filter(row=>!row.keys.includes("tensoraOhYeah"))')

        def require_one_voice(target, entry):
            rows = voice_rows(target)
            require(len(rows) == 1 and entry['voice'] in rows[0]['keys'], (entry, rows))

        def cutin(target, side=0):
            # Soyo deliberately retains her existing film containers.
            state = real_wait(target, f'''()=>{{const entry=memeProbe.expected[{side}],nodes=[document.querySelector('#meme-cutin-{side}'),document.querySelector('#soyo-cutin-{side}')];
              const visible=nodes.filter(n=>n&&!n.hidden&&getComputedStyle(n).display!=='none');if(visible.length!==1)return false;
              const panel=visible[0],video=panel.querySelector('video'),frames=video?.getVideoPlaybackQuality?.().totalVideoFrames||0;
              if(!video||video.paused||video.readyState<2||video.videoWidth<=0||frames<=0)return false;
              return {{panel:panel.id,muted:video.muted,loop:video.loop,time:video.currentTime,frames,width:video.videoWidth,title:panel.querySelector('strong')?.textContent||'',sourceMatches:video.src===entry.video}};}}''', 'a displayed, decoded original video')
            require(state['muted'] and not state['loop'], state)
            require(state['sourceMatches'], state)
            return state

        def visible_count(target):
            return target.evaluate('''[...document.querySelectorAll('[id^="meme-cutin-"],[id^="soyo-cutin-"]')].filter(n=>!n.hidden&&getComputedStyle(n).display!=='none').length''')

        def touch(target, key):
            button = target.locator(f'[data-key="{key}"]')
            require(button.is_visible(), key)
            box = button.bounding_box()
            require(box and box['width'] > 0 and box['height'] > 0, key)
            session = target.context.new_cdp_session(target)
            session.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': box['x'] + box['width'] / 2, 'y': box['y'] + box['height'] / 2}]})
            target.clock.run_for(40)
            session.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
            session.detach()

        try:
            page = browser.new_page(viewport={'width': 1366, 'height': 768})
            load(page)
            configure(page, 0)
            sound_on(page)
            report['decoded_recordings'] = page.evaluate('memeProbe.decoded')
            for character in args.characters:
                configure(page, character)
                forms = ['normal'] + (['stage'] if 5 <= character <= 9 else ['penguin'] if character == 2 else [])
                for form in forms:
                    proof = {'character': character, 'form': form, 'skills': []}
                    for key in ('u', 'i', 'o', 'p'):
                        reset(page, form)
                        entry = expected(page, key)
                        if character == 12 and key == 'p':
                            page.evaluate('mygoGame.match.fighters[1].x=mygoGame.match.fighters[0].x+160')
                        x = page.evaluate('mygoGame.match.fighters[0].x')
                        page.keyboard.press(key)
                        page.clock.run_for(60)
                        state = page.evaluate('({attack:mygoGame.match.fighters[0].attack,energy:mygoGame.match.fighters[0].energy})')
                        require(state == {'attack': entry['attack'], 'energy': 100 - entry['cost']}, (entry, state))
                        require_one_voice(page, entry)
                        item = {**entry, 'recorded_audio_started': True}
                        if key == 'p':
                            item['cutin'] = cutin(page)
                            require(item['cutin']['panel'] == ('soyo-cutin-0' if character == 1 else 'meme-cutin-0'), item)
                            if character == 4:
                                page.clock.run_for(3500)
                                late_video = real_wait(page, '''()=>{const video=document.querySelector('#meme-cutin-0 video');return !video.paused&&video.currentTime>3.5&&video.currentTime;}''', 'complete Taki reaction clip beyond old cutoff')
                                require(page.evaluate('mygoGame.match.fighters[0].attack') == 'rikiSuper', 'Taki clip outlived its super')
                                item['recorded_video_past_old_cutoff'] = late_video
                            if character in (2, 4, 7, 11, 12):
                                page.locator('#stage').screenshot(path=str(ART / f'meme-p-{character}-{form}.png'))
                            if character == 7:
                                page.clock.run_for(750)
                                draws = page.evaluate('memeProbe.draws.filter(d=>d.decoded&&d.alpha>.6)')
                                require({'crawl-windup', 'crawl-a', 'crawl-b'} <= {d['name'] for d in draws}, (form, draws))
                                require(page.evaluate('mygoGame.match.fighters[0].x') > x + 10, 'crawl must actually advance')
                                item['actual_crawl_draws'] = sorted({d['name'] for d in draws})
                            if character == 1:
                                page.clock.run_for(1150)
                                before = page.evaluate('mygoGame.match.fighters[0].hp')
                                page.evaluate("mygoGame.match.hit(1,'heavy')");page.clock.run_for(30)
                                require(page.evaluate('mygoGame.match.fighters[0].attack===null&&!!mygoGame.match.fighters[0].soyoSuper'), 'Soyo release must free her ordinary action')
                                require(page.evaluate('mygoGame.match.fighters[0].hp') < before, 'released Soyo remains damageable')
                                cutin(page);require_one_voice(page, entry)
                                item['released_control_presentation_survives_hit'] = True
                            else:
                                # Damage must preserve both the real P voice and its movie in every form.
                                vulnerable_in = page.evaluate('''()=>{const m=mygoGame.match,f=m.fighters[0];return m.freeze+Math.max(0,(MygoFighter.MOVES[f.attack].invuln||0)-f.attackMs)+50;}''')
                                page.clock.run_for(vulnerable_in)
                                stops_before_hit = page.evaluate('memeProbe.stops.length')
                                armor = page.evaluate('''()=>{const m=mygoGame.match,a=m.fighters[0],b=m.fighters[1],before={hp:a.hp,x:a.x,y:a.y,attack:a.attack};b.backThrow=true;m.hit(1,'throw');return {before,hp:a.hp,x:a.x,y:a.y,attack:a.attack,stun:a.stun,knockdown:a.knockdown};}''')
                                page.clock.run_for(30)
                                require(armor['hp'] < armor['before']['hp'] and armor['attack'] == entry['attack'], armor)
                                require(armor['x'] == armor['before']['x'] and armor['y'] == armor['before']['y'] and armor['stun'] == armor['knockdown'] == 0, armor)
                                require(visible_count(page) == 1 and page.evaluate('memeProbe.stops.length') == stops_before_hit, ('armor stopped P media', character, form, page.evaluate('memeProbe.stops')))
                                require_one_voice(page, entry)
                                cutin(page)
                                item['super_armor_preserves_damage_action_and_media'] = armor
                        page.clock.run_for(entry['duration'] + 2500)
                        require_one_voice(page, entry)  # Projectile/voice pulses must not replay the whole clip.
                        if character == 12 and key == 'p':
                            runes = page.evaluate('memeProbe.events.filter(e=>e.type==="memePulse").map(e=>e.glyph)')
                            drawn = page.evaluate('[...new Set(memeProbe.runes)]')
                            hits = page.evaluate('memeProbe.events.filter(e=>e.type==="hit"&&e.attack==="mewtype_12_virtual_super").length')
                            require(''.join(runes) == '临兵斗者皆阵列在前' and hits == 9, (runes, hits))
                            require(set(drawn) == set('临兵斗者皆阵列在前'), ('actual canvas rune glyphs', drawn))
                            item['nine_real_hits_and_drawn_runes'] = runes
                        proof['skills'].append(item)
                    report['forms'].append(proof)

            # Rejected resource use must not start either media channel.
            configure(page, 11)
            reset(page)
            page.evaluate('mygoGame.match.fighters[0].energy=99')
            page.keyboard.press('p');page.clock.run_for(100)
            require(not voice_rows(page) and visible_count(page) == 0, 'insufficient energy emitted media')
            report['insufficient_energy'] = 'pass'

            # One clip is paused on its real clock, then resumed at the stored audio offset.
            reset(page)
            entry = expected(page, 'p');page.keyboard.press('p');page.clock.run_for(160)
            state = cutin(page);time.sleep(.15)
            page.click('#pause')
            paused = page.evaluate('''()=>{const v=document.querySelector('#meme-cutin-0 video');return {time:v.currentTime,paused:v.paused,starts:memeProbe.starts,stops:memeProbe.stops,state:JSON.stringify(mygoGame.match.fighters)}}''')
            require(paused['paused'] and len(paused['stops']) == 1 and visible_count(page) == 0, paused)
            time.sleep(.12);page.clock.run_for(1000)
            require(page.evaluate('JSON.stringify(mygoGame.match.fighters)') == paused['state'], 'paused combat advanced')
            require(abs(page.evaluate('document.querySelector("#meme-cutin-0 video").currentTime') - paused['time']) < .04, 'paused video advanced')
            page.click('#pause');page.clock.run_for(40);resumed = cutin(page)
            rows = voice_rows(page)
            require(len(rows) == 2 and rows[1]['offset'] > 0 and rows[1]['offset'] < entry['duration'] / 1000, rows)
            require(resumed['time'] >= paused['time'] - .04, 'resume restarted the film')
            page.click('#sound')
            require(page.evaluate('memeProbe.stops.length') == 2, 'mute did not stop the resumed real source')
            require(visible_count(page) == 1, 'mute should preserve the silent film')
            sound_on(page)
            report['pause_resume_real_media_offset_and_mute'] = 'pass'

            # Different and identical P moves both retain independent sources and video elements.
            for characters in [(0, 11), (14, 14)]:
                configure(page, *characters);reset(page)
                entries = [expected(page, 'p', side) for side in (0, 1)]
                page.keyboard.press('p');page.keyboard.press('Numpad8');page.clock.run_for(160)
                films = [cutin(page, side) for side in (0, 1)]
                rows = voice_rows(page)
                require(len(rows) == 2 and all(any(entry['voice'] in row['keys'] for row in rows) for entry in entries), (entries, rows))
                require(visible_count(page) == 2 and page.evaluate('memeProbe.stops.length') == 0, films)
                hp_before = page.evaluate('mygoGame.match.fighters[0].hp')
                page.evaluate('''()=>{const m=mygoGame.match,a=m.fighters[0];a.attackMs=Math.max(a.attackMs,(MygoFighter.MOVES[a.attack].invuln||0)+10);m.hit(1,'throw');}''')
                page.clock.run_for(40)
                require(page.evaluate('mygoGame.match.fighters[0].hp') < hp_before, 'armored target took no damage')
                require(visible_count(page) == 2 and page.evaluate('memeProbe.stops.length') == 0, 'armor stopped either player presentation')
                cutin(page, 0)
                cutin(page, 1)
            report['independent_players_and_identical_moves'] = 'pass'

            configure(page, 11);reset(page)
            entry = expected(page, 'u');page.keyboard.press('u');page.clock.run_for(60)
            require_one_voice(page, entry)
            page.evaluate("mygoGame.match.hit(1,'heavy')");page.clock.run_for(30)
            require(page.evaluate('mygoGame.match.fighters[0].attack===null&&mygoGame.match.fighters[0].stun>0'), 'ordinary skill gained super armor')
            require(page.evaluate('memeProbe.stops.length') == 1, 'ordinary skill interruption did not stop its voice')
            report['ordinary_skill_still_interrupts_and_stops_voice'] = 'pass'

            # An actual P2 H and P use the stage kit and its own channel.
            configure(page, 7);reset(page, 'stage', both=True)
            entry = expected(page, 'p', 1);page.keyboard.press('Numpad8');page.clock.run_for(160)
            require_one_voice(page, entry);cutin(page, 1)
            require(page.evaluate('mygoGame.match.fighters[1].attack') == 'mujica_7_stage_super', 'P2 stage P')
            report['physical_P2_stage_H_and_P'] = 'pass'
            page.evaluate('mygoGame.match.fighters[1].stageForm.ms=10')
            page.clock.run_for(50)
            require(page.evaluate('mygoGame.match.fighters[1].stageForm===null&&mygoGame.match.fighters[1].attack===null'), 'stage expiry did not interrupt P')
            require(visible_count(page) == 0, 'expired stage video remained visible')
            require(page.evaluate('voice=>memeProbe.stops.some(row=>row.keys.includes(voice))', entry['voice']), 'expired stage voice kept playing')
            report['stage_expiry_stops_recorded_voice'] = 'pass'

            # Menu pauses the current presentation; restart and round end clear it.
            configure(page, 11)
            for cleanup in ('restart', 'home', 'round'):
                reset(page);entry=expected(page, 'p');page.keyboard.press('p');page.clock.run_for(160);cutin(page)
                if cleanup == 'home':
                    real_wait(page, 'document.querySelector("#meme-cutin-0 video").currentTime>.12', 'film advanced before opening menu')
                    before_home=page.evaluate('''()=>{const v=document.querySelector('#meme-cutin-0 video');memeProbe.menuVideo=v;memeProbe.menuSource=v.src;return v.currentTime;}''')
                    require_one_voice(page,entry)
                    page.click('#home');page.clock.run_for(40)
                    paused=page.evaluate('''()=>{const v=document.querySelector('#meme-cutin-0 video');return {time:v.currentTime,paused:v.paused,gamePaused:mygoGame.match.paused,state:JSON.stringify(mygoGame.match.fighters),starts:memeProbe.starts,stops:memeProbe.stops};}''')
                    require(paused['paused'] and paused['gamePaused'] and visible_count(page)==0, ('menu must pause and hide the film',paused))
                    require(paused['time']>=before_home-.04 and len(paused['starts'])==1 and len(paused['stops'])==1, paused)
                    require(paused['starts'][0]['id']==paused['stops'][0]['id'], 'menu must pause the source that was actually playing')
                    page.clock.run_for(1000)
                    require(page.evaluate('JSON.stringify(mygoGame.match.fighters)')==paused['state'], 'fighters advanced in the menu')
                    require(abs(page.evaluate('document.querySelector("#meme-cutin-0 video").currentTime')-paused['time'])<.04, 'menu video advanced while paused')
                    page.click('#menu-start')
                    require(page.locator('#character-select').is_visible(), 'new game must open selection')
                    page.click('#selection-back')
                    require(page.locator('#main-menu').is_visible(), 'selection back must return to menu')
                    require(page.evaluate('JSON.stringify(mygoGame.match.fighters)')==paused['state'], 'selection cancel changed the retained fight')
                    page.click('#menu-resume');page.clock.run_for(40)
                    resumed=cutin(page)
                    real_wait(page, f'''()=>{{const v=document.querySelector('#meme-cutin-0 video');return v===memeProbe.menuVideo&&v.src===memeProbe.menuSource&&v.currentTime>{paused['time']+.02};}}''', 'the same film continued from its menu timestamp')
                    rows=voice_rows(page)
                    require(len(rows)==2 and rows[0]['offset']==0 and rows[1]['offset']>0 and rows[1]['offset']<rows[1]['duration'], ('menu must resume, not restart, the original voice',rows))
                    require(rows[1]['keys']==rows[0]['keys'] and entry['voice'] in rows[1]['keys'], rows)
                    require(visible_count(page)==1 and resumed['time']>=paused['time']-.04, 'menu resume rewound or duplicated the cutin')
                    require(page.evaluate('memeProbe.stops.length')==1, 'resuming the menu stopped another source')
                    report['menu_pause_resume_offset']={'video_before_menu':before_home,'video_paused_at':paused['time'],'audio_resume_offset':rows[1]['offset'],'voice_keys':rows[1]['keys'],'same_video_continued':True,'fighters_frozen':True}
                    continue
                if cleanup == 'round':
                    page.evaluate('mygoGame.match.fighters[1].hp=0');page.clock.run_for(40)
                else:
                    page.click('#' + cleanup)
                    page.clock.run_for(40)
                require(visible_count(page) == 0 and page.evaluate('memeProbe.stops.length') >= 1, cleanup)
                page.clock.run_for(1800)
                require(visible_count(page)==0 and len(voice_rows(page))==1, cleanup+' replayed a cleared presentation')
            report['restart_round_cleanup'] = 'pass'

            report['mobile'] = []
            for width, height, character, stage in [(390, 844, 12, False), (844, 390, 7, True)]:
                phone = browser.new_page(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True)
                load(phone);configure(phone, character);sound_on(phone);reset(phone)
                if stage:
                    touch(phone, 'KeyH');phone.clock.run_for(40)
                    require(phone.evaluate('!!mygoGame.match.fighters[0].stageForm&&mygoGame.match.fighters[0].energy===50'), 'mobile H')
                    phone.evaluate('mygoGame.match.fighters[0].energy=100;memeProbe.clear()')
                entry = expected(phone, 'p');touch(phone, 'KeyP');phone.clock.run_for(80)
                require_one_voice(phone, entry);film = cutin(phone)
                require(phone.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'mobile horizontal overflow')
                phone.screenshot(path=str(ART / f'meme-mobile-{width}x{height}.png'))
                report['mobile'].append({'viewport': [width, height], 'character': character, 'stage_H': stage, 'cutin': film})
                phone.close()
            require(not report['errors'], report['errors'])
            require(not report['remote_requests'], report['remote_requests'])
            require(not report['failed_requests'], report['failed_requests'])
            expected_forms = sum(2 if character == 2 or 5 <= character <= 9 else 1 for character in args.characters)
            require(len(report['forms']) == expected_forms, 'requested native, stage and penguin forms were not all exercised')
            report['status'] = 'pass'
        except Exception as error:
            report['status'] = 'fail'
            report['failure'] = str(error)
            if page:
                try:
                    page.screenshot(path=str(ART / 'meme-skills-failure.png'))
                except Exception:
                    pass
            raise
        finally:
            report['elapsed_seconds'] = round(time.monotonic() - began, 2)
            report_name = 'meme-skills-browser-report.json' if args.characters == list(range(15)) else 'meme-skills-' + '-'.join(map(str, args.characters)) + '-browser-report.json'
            (ART / report_name).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
            print(json.dumps({'status': report.get('status'), 'forms': len(report['forms']), 'elapsed_seconds': report['elapsed_seconds'], 'failure': report.get('failure')}, ensure_ascii=False))
            browser.close()


if __name__ == '__main__':
    main()
