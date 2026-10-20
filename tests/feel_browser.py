"""Play movement assists and differentiated impacts with real keyboard/touch."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from ui_helpers import select_game_option,start_match

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'tests/artifacts'
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,channel='msedge')
    page=browser.new_page(viewport={'width':1366,'height':768})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script('''(() => {window.impactPitches=[];const create=AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator=function(){const osc=create.call(this),set=osc.frequency.setValueAtTime;
        osc.frequency.setValueAtTime=function(pitch,...args){impactPitches.push(pitch);return set.call(this,pitch,...args);};return osc;};})()''')
    page.clock.install(time='2026-01-01T00:00:00Z')
    page.goto((ROOT/'index.html').as_uri());page.wait_for_function('mygoGame.loaded')
    page.clock.pause_at('2026-01-01T00:01:00Z')
    select_game_option(page,'#mode','duel');page.uncheck('#terrain-enabled');start_match(page);page.clock.run_for(1800)
    page.click('#sound');expect(page.locator('#sound')).to_have_attribute('aria-pressed','true')
    def restart():
        page.click('#restart');page.clock.run_for(1800)
        page.evaluate('''() => {const m=mygoGame.match;m.fighters[1].x=1200;window.feelEvents=[];impactPitches=[];
          const drain=m.drainEvents;m.drainEvents=function(){const events=drain.call(this);feelEvents.push(...events);return events;};}''')
    restart();page.keyboard.down('d');page.keyboard.press('w');page.clock.run_for(180);page.keyboard.up('d')
    page.keyboard.down('a');page.clock.run_for(80);assert page.evaluate('mygoGame.match.fighters[0].vx')<0
    page.keyboard.up('a');page.clock.run_for(80);assert page.evaluate('mygoGame.match.fighters[0].vx')==0
    restart();page.keyboard.down('d');page.keyboard.press('ShiftLeft');page.clock.run_for(60)
    page.locator('#stage').screenshot(path=str(ART/'feel-dash.png'))
    page.keyboard.press('w');page.clock.run_for(30)
    assert page.evaluate('mygoGame.match.fighters[0].y===0&&mygoGame.match.fighters[0].dashMs>0')
    page.clock.run_for(120)
    assert page.evaluate('mygoGame.match.fighters[0].y>0&&mygoGame.match.fighters[0].dashMs===0')
    page.keyboard.up('d')
    restart();page.evaluate('Object.assign(mygoGame.match.fighters[0],{y:6,vy:-140})')
    page.keyboard.press('w');page.clock.run_for(110)
    assert page.evaluate('mygoGame.match.fighters[0].vy')>0
    restart();page.evaluate('Object.assign(mygoGame.match.fighters[0],{y:6,vy:-140})')
    page.keyboard.down('d');page.keyboard.press('ShiftLeft');page.clock.run_for(75);page.keyboard.up('d')
    assert page.evaluate('mygoGame.match.fighters[0].dashMs')>0
    for key,weight,pitch in [('j',0,160),('h',1,128),('k',2,96)]:
        restart();page.evaluate('mygoGame.match.fighters[0].x=420;mygoGame.match.fighters[1].x=485')
        page.keyboard.press(key);page.clock.run_for([95,135,185][weight])
        events=page.evaluate('feelEvents.filter(e=>e.type==="hit")');assert len(events)==1 and events[0]['weight']==weight,events
        assert pitch in page.evaluate('impactPitches')
        page.locator('#stage').screenshot(path=str(ART/f'feel-impact-{weight}.png'))
    restart();page.evaluate('mygoGame.match.fighters[0].x=420;mygoGame.match.fighters[1].x=485')
    page.keyboard.down('Numpad0');page.keyboard.press('k');page.clock.run_for(185)
    assert page.evaluate('feelEvents.find(e=>e.type==="hit").blocked')
    assert 1150 in page.evaluate('impactPitches')
    page.locator('#stage').screenshot(path=str(ART/'feel-guard.png'));page.keyboard.up('Numpad0')
    restart();page.evaluate('mygoGame.match.fighters[0].x=420;mygoGame.match.fighters[1].x=485')
    page.keyboard.press('j');page.clock.run_for(90);page.keyboard.press('k');page.clock.run_for(360)
    assert page.evaluate('mygoGame.match.fighters[0].combo')==2

    mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    phone=mobile.new_page();phone.on('pageerror',lambda e:errors.append(str(e)))
    phone.clock.install(time='2026-01-01T00:00:00Z');phone.goto((ROOT/'index.html').as_uri());phone.wait_for_function('mygoGame.loaded')
    phone.clock.pause_at('2026-01-01T00:01:00Z')
    select_game_option(phone,'#mode','practice');phone.uncheck('#terrain-enabled');start_match(phone);phone.clock.run_for(1800)
    cdp=mobile.new_cdp_session(phone)
    def touch(kind,keys):
        points=[]
        for i,key in enumerate(keys):
            b=phone.locator(f'[data-key="{key}"]').bounding_box();points.append({'id':i+1,'x':b['x']+b['width']/2,'y':b['y']+b['height']/2})
        cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
    phone.evaluate('mygoGame.match.fighters[1].x=1200')
    touch('touchStart',['KeyD','KeyW']);phone.clock.run_for(180);touch('touchEnd',[])
    touch('touchStart',['KeyA']);phone.clock.run_for(80);touch('touchEnd',[])
    assert phone.evaluate('mygoGame.match.fighters[0].vx')<0
    phone.clock.run_for(80);assert phone.evaluate('mygoGame.match.fighters[0].vx')==0
    phone.clock.run_for(1000);phone.evaluate('Object.assign(mygoGame.match.fighters[0],{y:6,vy:-140})')
    touch('touchStart',['KeyW']);phone.clock.run_for(20);touch('touchEnd',[]);phone.clock.run_for(100)
    assert phone.evaluate('mygoGame.match.fighters[0].vy')>0
    assert errors==[],errors
    print(json.dumps({'air_control':'pass','dash_jump':'pass','landing_buffers':'pass','three_impact_weights':'pass',
      'actual_impact_audio_pitches':'pass','guard':'pass','hitstop_combo_buffer':'pass','touch':'pass','errors':errors}))
    browser.close()
