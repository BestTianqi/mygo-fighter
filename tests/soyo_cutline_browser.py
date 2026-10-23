"""Play Soyo cutline using actual keyboard and multitouch controls, offline."""
import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright
from ui_helpers import select_game_option, start_match, set_game_sound
from meme_skills_browser import PROBE

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'tests/artifacts'
report = {'errors': [], 'remote_requests': [], 'cases': []}


def prepare(page):
    page.add_init_script(PROBE)
    page.on('pageerror', lambda error: report['errors'].append(str(error)))
    page.on('request', lambda request: report['remote_requests'].append(request.url) if request.url.startswith('http') else None)
    page.clock.install(time='2026-01-01T00:00:00Z')
    page.goto((ROOT / 'index.html').as_uri())
    page.wait_for_function('mygoGame.loaded')
    page.clock.pause_at('2026-01-01T00:01:00Z')
    select_game_option(page, '#player-character', '1')
    select_game_option(page, '#opponent-character', '1')
    select_game_option(page, '#mode', 'duel')
    page.uncheck('#terrain-enabled');start_match(page);page.clock.run_for(1800)
    set_game_sound(page, True)
    deadline=time.monotonic()+30
    while not page.evaluate('Object.keys(MYGO_ASSETS.memeVoices).every(key=>memeProbe.decoded.some(row=>row.keys.includes(key)))'):
        assert time.monotonic()<deadline, 'recorded voices failed to decode'
        time.sleep(.025)
    assert page.evaluate('memeProbe.decoded.some(row=>row.keys.includes("meme_1_cutline")&&row.duration>3.4&&row.rms>.001)'), 'missing cut clothes recording'
    page.evaluate('''()=>{
      window.cutProbe={events:[],poses:[],lines:0}; const m=mygoGame.match,drain=m.drainEvents.bind(m);
      m.drainEvents=()=>{const events=drain();cutProbe.events.push(...events);return events;};
      const ctx=document.querySelector('#game').getContext('2d'),draw=ctx.drawImage,stroke=ctx.stroke,cache=new WeakMap();
      ctx.drawImage=function(...args){const image=args[0];if(!cache.has(image))cache.set(image,
        image.src===MYGO_ASSETS.soyoActions.atlas?MYGO_ASSETS.soyoActions.frames:
        image.src===MYGO_ASSETS.jabActions[1].atlas?MYGO_ASSETS.jabActions[1].frames:[]);
        const frame=cache.get(image).find(f=>f.x===args[1]&&f.y===args[2]);if(frame)cutProbe.poses.push(frame.name);
        return draw.apply(this,args);};
      ctx.stroke=function(...args){if(this.strokeStyle==='#fff6df')cutProbe.lines++;return stroke.apply(this,args);};
    }''')


def reset(page, reverse=False):
    page.evaluate('''reverse=>{const m=mygoGame.match;m.freeze=0;m.fighters.forEach((f,i)=>{
      f.x=420+(reverse?1-i:i)*280;f.y=0;f.vx=f.vy=f.pushVx=0;f.hp=200;f.energy=100;
      f.attack=null;f.buffer=null;f.stun=f.hardStun=f.cooldown=f.knockdown=f.landingRecovery=0;
      f.facing=(i===0)!==reverse?1:-1;f.combo=f.comboMs=0;});m.waves=[];
      cutProbe.events=[];cutProbe.poses=[];cutProbe.lines=0;memeProbe.clear();}''', reverse)


with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1366,'height':768})
    try:
        prepare(page)
        for side, reverse, direction, key in [(0,False,'d','i'),(0,True,'a','i'),(1,False,'ArrowLeft','Numpad5')]:
            reset(page,reverse);page.keyboard.down(direction);page.keyboard.press(key);page.keyboard.up(direction)
            page.clock.run_for(20)
            assert page.evaluate(f'mygoGame.match.fighters[{side}].attack')=='soyoCutline'
            assert page.evaluate(f'mygoGame.match.fighters[{side}].energy')==75
            assert page.evaluate('memeProbe.starts.length===1&&memeProbe.starts[0].keys.includes("meme_1_cutline")'), 'wrong voice for cutline'
            page.clock.run_for(470)
            page.locator('#stage').screenshot(path=str(ART/f'soyo-cutline-p{side+1}-{"left" if reverse or side else "right"}.png'))
            page.clock.run_for(500)
            assert page.evaluate(f'mygoGame.match.fighters[{1-side}].hp')==181
            assert page.evaluate('cutProbe.events.filter(e=>e.type==="hit"&&e.attack==="soyoCutline").length')==2
            assert page.evaluate('cutProbe.lines')>0
            assert page.evaluate('["normal-windup","jab-2-impact","palm-heavy","normal-recover"].every(n=>cutProbe.poses.includes(n))')
            report['cases'].append(f'keyboard-p{side+1}-{"left" if reverse or side else "right"}')
        page.click('#moves')
        assert '剪切线' in page.locator('#moves-content').inner_text()
        assert '前＋I' in page.locator('#moves-content').inner_text()
        page.click('#close-moves')
        reset(page);page.keyboard.press('i');page.clock.run_for(20)
        assert page.evaluate('mygoGame.match.fighters[0].attack')=='wave'
        page.clock.run_for(800);reset(page)
        page.evaluate('mygoGame.match.fighters[0].hp=100')
        page.keyboard.down('s');page.keyboard.press('i');page.keyboard.up('s');page.clock.run_for(20)
        assert page.evaluate('mygoGame.match.fighters[0].attack')=='heal'
        report['cases'].append('move-list-base-I-and-down-I-preserved')

        phone=browser.new_page(viewport={'width':844,'height':390},is_mobile=True,has_touch=True)
        prepare(phone);reset(phone)
        cdp=phone.context.new_cdp_session(phone)
        points=[]
        for finger,key in [(1,'KeyD'),(2,'KeyI')]:
            box=phone.locator(f'[data-key="{key}"]').bounding_box()
            points.append({'id':finger,'x':box['x']+box['width']/2,'y':box['y']+box['height']/2})
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':points})
        phone.clock.run_for(20)
        assert phone.evaluate('mygoGame.match.fighters[0].attack')=='soyoCutline'
        assert phone.evaluate('memeProbe.starts.length===1&&memeProbe.starts[0].keys.includes("meme_1_cutline")'), 'touch did not play the dedicated recording'
        cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        phone.clock.run_for(470);phone.screenshot(path=str(ART/'soyo-cutline-mobile.png'))
        phone.clock.run_for(500)
        assert phone.evaluate('mygoGame.match.fighters[1].hp')==181
        assert phone.evaluate('cutProbe.lines')>0
        assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
        report['cases'].append('mobile-native-two-finger-forward-I')
        assert report['errors']==[] and report['remote_requests']==[],report
        report['status']='pass'
    except Exception as error:
        report.update(status='fail',failure=str(error));page.screenshot(path=str(ART/'soyo-cutline-failure.png'))
        raise
    finally:
        (ART/'soyo-cutline-browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps(report,ensure_ascii=False));browser.close()
