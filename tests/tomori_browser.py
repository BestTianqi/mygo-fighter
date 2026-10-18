"""Tomori is a real third fighter: sprites, voice kit, 2P, result flow and touch."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from ui_helpers import select_game_option, start_match

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'tests/artifacts'
ART.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,channel='msedge')
    page=browser.new_page(viewport={'width':1366,'height':768})
    errors,remote=[],[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:remote.append(r.url) if r.url.startswith('http') else None)
    page.clock.install(time='2026-01-01T00:00:00Z')
    page.goto((ROOT/'index.html').as_uri());page.wait_for_function('mygoGame.loaded')
    page.clock.pause_at('2026-01-01T00:01:00Z')
    assert page.evaluate('MYGO_ASSETS.characters.length')==3
    select_game_option(page,'#player-character','2');select_game_option(page,'#opponent-character','0')
    select_game_option(page,'#mode','duel');page.uncheck('#terrain-enabled');start_match(page);page.clock.run_for(1800)
    assert page.locator('#name1').inner_text()=='高松灯'
    assert page.locator('[data-key="KeyT"]').inner_text()=='诗句回声'
    assert page.locator('[data-key="KeyL"]').inner_text()=='迷途之歌'
    assert page.locator('[data-key="KeyG"]').evaluate('(button)=>!button.hidden')
    page.evaluate('''() => {window.tomoriDraws=new Set();const ctx=document.querySelector('#game').getContext('2d'),draw=ctx.drawImage,cache=new WeakMap();
      ctx.drawImage=function(...args){const im=args[0];if(!cache.has(im))cache.set(im,im.src===MYGO_ASSETS.tomoriActions.atlas);
        if(cache.get(im)){const f=MYGO_ASSETS.tomoriActions.frames.find(f=>f.x===args[1]&&f.y===args[2]);if(f)tomoriDraws.add(f.name);}return draw.apply(this,args);};}''')
    page.clock.run_for(50);page.locator('#stage').screenshot(path=str(ART/'tomori-idle.png'))
    def restart():
        page.click('#restart');page.clock.run_for(1800)
        page.evaluate('mygoGame.match.fighters[0].energy=100;mygoGame.match.fighters[1].x=850')
    def place():
        page.evaluate('mygoGame.match.fighters[0].x=420;mygoGame.match.fighters[1].x=485')

    restart();page.evaluate('mygoGame.match.fighters[1].x=580')
    page.keyboard.press('t');page.clock.run_for(290)
    assert page.evaluate('mygoGame.match.fighters[0].energy')==70
    assert page.evaluate('mygoGame.match.waves[0].attack')=='tomoriEcho'
    page.locator('#stage').screenshot(path=str(ART/'tomori-poetry-echo.png'))
    page.clock.run_for(1600);assert page.evaluate('mygoGame.match.fighters[1].hp')==82
    restart();page.keyboard.press('i');page.clock.run_for(1000)
    restart();page.evaluate('mygoGame.match.fighters[0].x=300;mygoGame.match.fighters[1].x=470')
    page.keyboard.press('l');page.clock.run_for(350)
    assert page.evaluate('mygoGame.match.fighters[0].energy')==40
    page.locator('#stage').screenshot(path=str(ART/'tomori-chorus.png'))
    page.keyboard.press('Space');frozen=page.evaluate('JSON.stringify(mygoGame.match.fighters)+JSON.stringify(mygoGame.match.waves)')
    page.clock.run_for(1000);assert page.evaluate('JSON.stringify(mygoGame.match.fighters)+JSON.stringify(mygoGame.match.waves)')==frozen
    page.keyboard.press('Space');page.clock.run_for(1700)
    assert page.evaluate('mygoGame.match.fighters[0].hitMarks.length')==3
    assert page.evaluate('mygoGame.match.fighters[1].hp')==79
    page.keyboard.press('F1')
    text=page.locator('#moves-content').inner_text()
    assert all(name in text for name in ['微光音符','诗句回声','迷途之歌','8 × 3'])
    assert 'TGW' not in text and '归心' not in text
    page.click('#close-moves');page.clock.run_for(50)

    restart();page.keyboard.down('d');page.clock.run_for(300)
    page.keyboard.press('ShiftLeft');page.clock.run_for(100);page.keyboard.up('d');page.clock.run_for(650)
    page.keyboard.down('a');page.keyboard.press('ShiftLeft');page.clock.run_for(100);page.keyboard.up('a');page.clock.run_for(650)
    page.keyboard.press('w');page.clock.run_for(1200)
    page.keyboard.press('j');page.clock.run_for(450);page.keyboard.press('k');page.clock.run_for(700)
    page.keyboard.down('o');page.clock.run_for(50);page.keyboard.down('s');page.clock.run_for(50)
    page.keyboard.up('o');page.keyboard.up('s');page.clock.run_for(100)
    restart();place();page.keyboard.press('Numpad1');page.clock.run_for(1100)
    place();page.keyboard.down('s');page.clock.run_for(50);page.keyboard.press('Numpad2');page.clock.run_for(250)
    page.keyboard.up('s');page.clock.run_for(1000)
    place();page.keyboard.press('Numpad5');page.clock.run_for(1400)
    restart();place();page.evaluate('mygoGame.match.fighters[1].hp=1');page.keyboard.press('j');page.clock.run_for(900)
    assert page.evaluate('mygoGame.match.phase')=='roundOver'
    assert '高松灯' in page.locator('#overlay-title').inner_text()
    missing=page.evaluate('MYGO_ASSETS.tomoriActions.frames.map(f=>f.name).filter(n=>!tomoriDraws.has(n))')
    assert missing==[],missing
    page.click('#overlay-action');page.clock.run_for(1800)
    assert page.evaluate('mygoGame.match.fighters[0].character')==2

    select_game_option(page,'#opponent-character','2');start_match(page);page.clock.run_for(1800)
    for key,attack in [('Numpad4','tomoriNote'),('NumpadEnter','tomoriEcho'),('Numpad3','tomoriChorus')]:
        page.evaluate('mygoGame.match.fighters[1].energy=100')
        page.keyboard.press(key);page.clock.run_for(50)
        assert page.evaluate('mygoGame.match.fighters[1].attack')==attack
        page.clock.run_for(1800)
    assert page.locator('#name2').inner_text()=='高松灯'

    mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    phone=mobile.new_page();phone.on('pageerror',lambda e:errors.append(str(e)))
    phone.clock.install(time='2026-01-01T00:00:00Z')
    phone.goto((ROOT/'index.html').as_uri());phone.wait_for_function('mygoGame.loaded')
    phone.clock.pause_at('2026-01-01T00:01:00Z')
    select_game_option(phone,'#player-character','2');select_game_option(phone,'#mode','practice');start_match(phone);phone.clock.run_for(1800)
    cdp=mobile.new_cdp_session(phone)
    def tap(key):
        b=phone.locator(f'[data-key="{key}"]').bounding_box()
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':b['x']+b['width']/2,'y':b['y']+b['height']/2}]})
        phone.clock.run_for(30);cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    tap('KeyT');phone.clock.run_for(300)
    assert phone.evaluate('mygoGame.match.fighters[0].attack')=='tomoriEcho'
    phone.screenshot(path=str(ART/'tomori-mobile.png'))
    phone.clock.run_for(900);tap('KeyL');phone.clock.run_for(850)
    assert phone.evaluate('mygoGame.match.fighters[0].hitMarks.length')==3
    assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert errors==[],errors
    assert remote==[],remote
    print(json.dumps({'third_character':'pass','actual_tomori_sprite_draws':24,'voice_kit':'pass','chorus_three_hits':'pass',
                      'pause_round_flow':'pass','P2_all_voice_moves':'pass','mobile_touch':'pass','offline':'pass','errors':errors}))
    mobile.close();browser.close()
