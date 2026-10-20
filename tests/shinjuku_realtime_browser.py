"""Real-clock responsiveness and animation sampling, without a virtual clock."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from ui_helpers import select_game_option, start_match

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'tests/artifacts'
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,channel='msedge')
    page=browser.new_page(viewport={'width':1366,'height':768})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto((ROOT/'index.html').as_uri());page.wait_for_function('mygoGame.loaded')
    select_game_option(page,'#mode','duel');page.uncheck('#terrain-enabled')
    page.evaluate('''document.addEventListener('keydown',e=>{if(e.code==='KeyD'&&window.realTiming?.active)realTiming.pending=performance.now()})''')
    results=[]
    # Return to Anon after the large Rana and penguin atlases have been used.
    for character in [0,1,2,3,4,0]:
        select_game_option(page,'#player-character',str(character));start_match(page)
        if not results:
            page.click('#sound');page.wait_for_function('document.querySelector("#sound").getAttribute("aria-pressed")==="true"')
        page.wait_for_function('mygoGame.match.phase==="fighting"');page.wait_for_timeout(500)
        page.evaluate('''() => {
          mygoGame.match.fighters[1].x=1500;
          const r=window.realTiming={active:true,frames:[],longFrames:[],latencies:[],last:performance.now(),pending:null,previousX:mygoGame.match.fighters[0].x};
          function observe(now){if(!r.active)return;const f=mygoGame.match.fighters[0],x=f.x,dt=now-r.last;r.frames.push(dt);r.last=now;
            if(dt>45)r.longFrames.push({ms:dt,attack:f.attack,attackMs:f.attackMs,penguinMs:f.penguin?.ms,effects:mygoGame.feedback.effects});
            if(r.pending!==null&&x!==r.previousX){r.latencies.push(performance.now()-r.pending);r.pending=null;}
            r.previousX=x;requestAnimationFrame(observe);}requestAnimationFrame(observe);
        }''')
        page.keyboard.down('d');page.wait_for_timeout(450);page.keyboard.up('d')
        page.keyboard.press('w',delay=60);page.wait_for_timeout(140)
        page.keyboard.press('w',delay=60);page.wait_for_timeout(180)
        page.keyboard.down('d');page.keyboard.press('l',delay=60);page.wait_for_timeout(200);page.keyboard.up('d')
        page.wait_for_timeout(1000)
        page.evaluate('mygoGame.match.fighters[1].x=mygoGame.match.fighters[0].x+130')
        page.keyboard.press('j',delay=60);page.wait_for_timeout(140)
        page.keyboard.press('j',delay=60);page.wait_for_timeout(180)
        page.keyboard.press('j',delay=60);page.wait_for_timeout(180)
        assert page.evaluate('mygoGame.match.fighters[0].combo')==3
        page.wait_for_timeout(1000)
        if character==2:
            page.evaluate('mygoGame.match.fighters[0].energy=100');page.keyboard.press('h',delay=60);page.wait_for_timeout(100)
            assert page.evaluate('!!mygoGame.match.fighters[0].penguin')
            page.keyboard.down('d');page.wait_for_timeout(150);page.keyboard.up('d')
            page.keyboard.down('d');page.keyboard.press('u',delay=60);page.keyboard.up('d');page.wait_for_timeout(400)
        raw=page.evaluate('() => {realTiming.active=false;return realTiming}');frames=sorted(raw['frames'][2:])
        result={'character':character,'frames':len(frames),'median_frame_ms':frames[len(frames)//2],
          'p95_frame_ms':frames[int(len(frames)*.95)],'max_frame_ms':frames[-1],
          'movement_input_to_simulation_ms':raw['latencies'],'long_frames':raw['longFrames'],'three_real_time_hits':'pass'}
        assert len(frames)>120,result
        assert result['median_frame_ms']<25,result
        assert result['p95_frame_ms']<40,result
        assert result['max_frame_ms']<80,result
        assert raw['latencies'] and max(raw['latencies'])<70,result
        results.append(result);print(json.dumps(result),flush=True)
    assert errors==[],errors
    result={'runs':results,'sound_enabled':True,'errors':errors}
    page.locator('#stage').screenshot(path=str(ART/'shinjuku-own-realtime.png'))
    (ART/'shinjuku-realtime-report.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(json.dumps(result));browser.close()
