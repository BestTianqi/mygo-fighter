"""Compare actual offline keyboard/touch play to body-normalized reference behavior."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from ui_helpers import select_game_option, start_match, set_game_sound

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'tests/artifacts'
SCALE = 235 / 54
report = {}
errors, remote = [], []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel='msedge')
    page = browser.new_page(viewport={'width':1366,'height':768})
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: remote.append(r.url) if r.url.startswith('http') else None)
    page.add_init_script('''window.noiseStarts=0;const makeSource=AudioContext.prototype.createBufferSource;
      AudioContext.prototype.createBufferSource=function(){const s=makeSource.call(this),start=s.start;
        s.start=function(...args){if(s.buffer?.duration===1)noiseStarts++;return start.apply(this,args)};return s;};''')
    page.clock.install(time='2026-01-01T00:00:00Z')
    page.goto((ROOT/'index.html').as_uri());page.wait_for_function('mygoGame.loaded')
    page.clock.pause_at('2026-01-01T00:01:00Z')
    select_game_option(page,'#mode','duel');page.uncheck('#terrain-enabled');start_match(page);page.clock.run_for(1800)
    set_game_sound(page, True);expect(page.locator('#sound')).to_have_attribute('aria-pressed','true')

    def reset(close=False):
        page.click('#restart');page.clock.run_for(1800)
        page.evaluate('''close => {const m=mygoGame.match;m.fighters[1].x=close?m.fighters[0].x+130:1500;
          window.feelEvents=[];const drain=m.drainEvents;m.drainEvents=function(){const e=drain.call(this);feelEvents.push(...e);return e;};}''',close)

    def until(js, limit=1500):
        for _ in range(limit//10):
            if page.evaluate(js):return
            page.clock.run_for(10)
        raise AssertionError(js)

    reset();x=page.evaluate('mygoGame.match.fighters[0].x')
    page.keyboard.down('d');page.clock.run_for(500);page.keyboard.up('d')
    distance=page.evaluate('mygoGame.match.fighters[0].x')-x
    assert abs(distance/(1.82*30*SCALE)-1)<.04,distance
    page.clock.run_for(50);assert page.evaluate('mygoGame.match.fighters[0].vx')==0
    report['walk_distance_500ms']={'reference_body_heights':1.82*30/54,'actual_body_heights':distance/235}
    page.evaluate('mygoGame.match.fighters[1].x=680');page.clock.run_for(1600)
    height=page.evaluate('235*mygoGame.camera.zoom/540')
    assert abs(height-.25)<.012;report['standing_screen_height']=height
    page.locator('#stage').screenshot(path=str(ART/'shinjuku-own-baseline.png'))

    reset();page.keyboard.press('w');top=0;flight=0
    for _ in range(90):
        page.clock.run_for(10);flight+=10;y=page.evaluate('mygoGame.match.fighters[0].y');top=max(top,y)
        if flight>50 and y==0:break
    assert abs(top/(275**2/(2*760)*SCALE)-1)<.06,top
    assert 690<=flight<=770,flight
    n=int(275/(760/60))
    discrete_top=(n*275/60-760*n*(n+1)/(2*60**2))/54
    assert abs(top/235/discrete_top-1)<.04
    report['jump']={'reference_60hz_apex_body_heights':discrete_top,'actual_apex_body_heights':top/235,'reference_60hz_flight_ms':43/60*1000,'flight_ms':flight}
    page.keyboard.press('w');page.clock.run_for(220);page.keyboard.press('w');page.clock.run_for(30)
    assert page.evaluate('mygoGame.match.fighters[0].vy')>850
    page.locator('#stage').screenshot(path=str(ART/'shinjuku-own-double-jump.png'))
    before=page.evaluate('mygoGame.match.fighters[0].vy');page.keyboard.press('w');page.clock.run_for(30)
    assert page.evaluate('mygoGame.match.fighters[0].vy')<before
    x=page.evaluate('mygoGame.match.fighters[0].x')
    page.keyboard.down('d');page.keyboard.press('ShiftLeft');page.clock.run_for(90)
    assert page.evaluate('mygoGame.match.fighters[0].dashInvuln')>0
    page.locator('#stage').screenshot(path=str(ART/'shinjuku-own-air-dash.png'))
    page.keyboard.up('d');page.clock.run_for(90)
    distance=page.evaluate('mygoGame.match.fighters[0].x')-x
    assert abs(distance/(5.15*11*SCALE)-1)<.06,distance
    report['air_dash_body_heights']={'reference':5.15*11/54,'actual':distance/235}

    reset();page.keyboard.down('d');page.keyboard.press('ShiftLeft');page.clock.run_for(50)
    page.keyboard.press('w');page.clock.run_for(40);assert page.evaluate('mygoGame.match.fighters[0].y')==0
    page.keyboard.up('d');page.clock.run_for(150);assert page.evaluate('mygoGame.match.fighters[0].y')>0
    report['dash_jump_buffer']='pass'
    reset();page.keyboard.press('w');page.clock.run_for(650);x=page.evaluate('mygoGame.match.fighters[0].x')
    page.keyboard.down('d');page.keyboard.press('ShiftLeft');page.clock.run_for(180);page.keyboard.up('d')
    distance=page.evaluate('mygoGame.match.fighters[0].x')-x
    assert page.evaluate('mygoGame.match.grounded(mygoGame.match.fighters[0])')
    assert abs(distance/(5.15*11*SCALE)-1)<.06,distance
    report['air_dash_landing_retains_travel']='pass'

    for character in range(4):
        select_game_option(page,'#player-character',str(character));start_match(page);page.clock.run_for(1800);reset(True)
        page.keyboard.press('j');until('mygoGame.match.fighters[0].attackMs>=140')
        page.keyboard.press('j');until('MygoFighter.MOVES[mygoGame.match.fighters[0].attack]?.chain===2')
        until('mygoGame.match.fighters[0].attackMs>=150');page.keyboard.press('j')
        until('MygoFighter.MOVES[mygoGame.match.fighters[0].attack]?.chain===3')
        until('feelEvents.filter(e=>e.type==="hit").length===3')
        assert page.evaluate('mygoGame.match.fighters[0].combo')==3
        assert page.evaluate('mygoGame.match.fighters[1].vy')>500
        assert page.evaluate('mygoGame.feedback.inkMs')>0
        assert page.evaluate('mygoGame.feedback.motion?.power')>6
        page.clock.run_for(40)
        assert page.evaluate('mygoGame.camera.zoom')>.5745
        if character==0:
            page.locator('#stage').screenshot(path=str(ART/'shinjuku-own-third-impact.png'))
            page.keyboard.press('Space');frozen=page.evaluate('JSON.stringify([mygoGame.feedback,mygoGame.camera,mygoGame.match.fighters])')
            page.clock.run_for(800);assert page.evaluate('JSON.stringify([mygoGame.feedback,mygoGame.camera,mygoGame.match.fighters])')==frozen
            page.keyboard.press('Space')
        until('feelEvents.some(e=>e.type==="landing"&&e.heavy)',2000)
        assert page.evaluate('mygoGame.match.fighters[1].knockdown')>0
    report['four_character_chain_and_heavy_landing']='pass'
    assert page.evaluate('noiseStarts')>5
    report['actual_layered_audio_sources']=page.evaluate('noiseStarts')

    # A quick heavy press during light hitstop is released before the simulation resumes.
    select_game_option(page,'#player-character','0');start_match(page);page.clock.run_for(1800);reset(True)
    page.keyboard.press('j');until('mygoGame.match.freeze>0')
    page.keyboard.press('k');page.clock.run_for(350)
    assert page.evaluate('feelEvents.some(e=>e.type==="attack"&&e.attack==="heavy")')
    assert page.evaluate('mygoGame.match.fighters[0].combo')==2
    report['quick_input_during_hitstop']='pass'
    reset(True);page.keyboard.down('j');until('mygoGame.match.freeze>0');page.keyboard.up('j')
    page.keyboard.press('j');page.clock.run_for(20)
    assert page.evaluate('mygoGame.match.freeze')>0
    page.clock.run_for(220)
    assert page.evaluate('feelEvents.filter(e=>e.type==="attack").map(e=>e.attack)')==['light','anonJab2']
    report['same_button_repress_during_hitstop']='pass'

    # Actual second-player keyboard gets the same chain and movement rules.
    reset(True);page.keyboard.press('Numpad1');page.clock.run_for(220)
    page.keyboard.press('Numpad1');page.clock.run_for(240);page.keyboard.press('Numpad1');page.clock.run_for(300)
    assert page.evaluate('feelEvents.filter(e=>e.type==="hit"&&e.side===1).length')==3
    report['2p_keyboard']='pass'

    mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    phone=mobile.new_page();phone.on('pageerror',lambda e:errors.append(str(e)))
    phone.clock.install(time='2026-01-01T00:00:00Z');phone.goto((ROOT/'index.html').as_uri());phone.wait_for_function('mygoGame.loaded')
    phone.clock.pause_at('2026-01-01T00:01:00Z')
    select_game_option(phone,'#mode','practice');phone.uncheck('#terrain-enabled');start_match(phone);phone.clock.run_for(1800)
    phone.evaluate('mygoGame.match.fighters[1].x=410')
    cdp=mobile.new_cdp_session(phone)
    def touch(kind,keys):
        points=[]
        for i,key in enumerate(keys):
            b=phone.locator(f'[data-key="{key}"]').bounding_box();points.append({'id':i+1,'x':b['x']+b['width']/2,'y':b['y']+b['height']/2})
        cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
    touch('touchStart',['KeyJ']);phone.clock.run_for(1100);touch('touchEnd',[])
    assert phone.evaluate('mygoGame.match.fighters[0].combo')>=3
    phone.clock.run_for(1400);phone.tap('[data-key="KeyW"]');phone.clock.run_for(200)
    phone.tap('[data-key="KeyW"]');phone.clock.run_for(50);assert phone.evaluate('mygoGame.match.fighters[0].vy')>700
    touch('touchStart',['KeyD','ShiftLeft']);phone.clock.run_for(80)
    assert phone.evaluate('mygoGame.match.fighters[0].dashMs')>0
    phone.screenshot(path=str(ART/'shinjuku-own-mobile.png'));touch('touchEnd',[])
    assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
    report['mobile_hold_chain_double_jump_air_dash']='pass'

    reduced=browser.new_context(viewport={'width':1366,'height':768},reduced_motion='reduce')
    quiet=reduced.new_page();quiet.on('pageerror',lambda e:errors.append(str(e)))
    quiet.clock.install(time='2026-01-01T00:00:00Z');quiet.goto((ROOT/'index.html').as_uri());quiet.wait_for_function('mygoGame.loaded')
    quiet.clock.pause_at('2026-01-01T00:01:00Z');select_game_option(quiet,'#mode','duel');quiet.uncheck('#terrain-enabled');start_match(quiet);quiet.clock.run_for(1800)
    quiet.evaluate('mygoGame.match.fighters[1].x=400');quiet.keyboard.press('k');quiet.clock.run_for(230)
    assert quiet.evaluate('mygoGame.match.fighters[1].hp')==184
    assert quiet.evaluate('mygoGame.feedback.motion') is None
    assert quiet.evaluate('mygoGame.camera.zoom')<=.5745
    report['reduced_motion']='pass'
    assert errors==[],errors
    assert remote==[],remote
    report.update(errors=errors,remote_requests=remote)
    (ART/'shinjuku-feel-browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=True))
    browser.close()
