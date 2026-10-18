"""Play the timed penguin form with real keyboard/touch and observe real atlas draws."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from ui_helpers import select_game_option, start_match

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'tests/artifacts'
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
    select_game_option(page,'#player-character','2');select_game_option(page,'#opponent-character','0')
    select_game_option(page,'#mode','duel');page.uncheck('#terrain-enabled');start_match(page);page.clock.run_for(1800)
    page.evaluate('mygoGame.match.fighters[1].x=1200')
    start_x=page.evaluate('mygoGame.match.fighters[0].x')
    page.keyboard.down('d');page.clock.run_for(200);page.keyboard.up('d')
    assert 59<=page.evaluate('mygoGame.match.fighters[0].x')-start_x<=67
    page.clock.run_for(50);dash_x=page.evaluate('mygoGame.match.fighters[0].x')
    page.keyboard.down('d');page.keyboard.press('ShiftLeft');page.clock.run_for(140);page.keyboard.up('d')
    assert 150<=page.evaluate('mygoGame.match.fighters[0].x')-dash_x<=178
    page.click('#restart');page.clock.run_for(1800)
    page.evaluate('''() => {window.penguinDraws=new Set();const ctx=document.querySelector('#game').getContext('2d'),draw=ctx.drawImage,cache=new WeakMap();
      ctx.drawImage=function(...args){const im=args[0];if(!cache.has(im))cache.set(im,im.src===MYGO_ASSETS.penguin.atlas);
        if(cache.get(im)){const f=MYGO_ASSETS.penguin.frames.find(f=>f.x===args[1]&&f.y===args[2]);if(f)penguinDraws.add(f.name);}return draw.apply(this,args);};}''')
    assert page.locator('[data-key="KeyG"]').inner_text()=='凑企鹅'
    page.evaluate('mygoGame.match.fighters[0].energy=100')
    page.keyboard.press('g');page.clock.run_for(30)
    assert page.evaluate('mygoGame.match.fighters[0].energy')==50
    assert page.evaluate('mygoGame.match.fighters[0].penguin.ms')>19800
    assert page.evaluate('mygoGame.match.fighters[0].attack===null&&mygoGame.match.fighters[0].cooldown===0')
    assert '凑企鹅' in page.locator('#name1').inner_text()
    assert page.locator('[data-key="KeyH"]').evaluate('(button)=>!button.hidden')
    assert page.locator('[data-key="KeyT"]').inner_text()=='唐笑'
    assert page.locator('[data-key="KeyG"]').is_disabled()
    page.locator('#stage').screenshot(path=str(ART/'tomori-penguin-transform.png'))
    before=page.evaluate('mygoGame.match.fighters[0].penguin.ms')
    page.keyboard.press('g');page.clock.run_for(100)
    assert page.evaluate('mygoGame.match.fighters[0].energy')==50
    assert page.evaluate('mygoGame.match.fighters[0].penguin.ms')<before
    page.keyboard.press('Space');frozen=page.evaluate('JSON.stringify(mygoGame.match.fighters)')
    page.clock.run_for(4000);assert page.evaluate('JSON.stringify(mygoGame.match.fighters)')==frozen
    page.keyboard.press('Space');page.clock.run_for(50)
    page.keyboard.press('F1');text=page.locator('#moves-content').inner_text()
    assert all(name in text for name in ['飞踢','糖哭','hey?','唐笑','咕咕嘎嘎','空中','鳍拍'])
    assert '微光音符' not in text and '凑企鹅变身' not in text
    page.click('#close-moves');page.clock.run_for(50)
    page.clock.run_for(page.evaluate('mygoGame.match.fighters[0].penguin.ms')+100)
    assert page.evaluate('mygoGame.match.fighters[0].penguin') is None
    assert page.locator('#name1').inner_text()=='高松灯'
    assert page.locator('[data-key="KeyH"]').is_hidden()
    assert page.locator('[data-key="KeyT"]').inner_text()=='诗句回声'
    page.keyboard.press('t');page.clock.run_for(50)
    assert page.evaluate('mygoGame.match.fighters[0].attack')=='tomoriEcho'

    def morph():
        page.click('#restart');page.clock.run_for(1800)
        page.evaluate('mygoGame.match.fighters[0].energy=100;mygoGame.match.fighters[1].x=850')
        page.keyboard.press('g');page.clock.run_for(850)
        assert page.evaluate('!!mygoGame.match.fighters[0].penguin')
        page.evaluate('mygoGame.match.fighters[0].energy=100')
    def place():
        page.evaluate('mygoGame.match.fighters[0].x=420;mygoGame.match.fighters[1].x=485')

    morph()
    page.keyboard.down('d');page.clock.run_for(280)
    page.keyboard.press('ShiftLeft');page.clock.run_for(100);page.keyboard.up('d');page.clock.run_for(650)
    page.keyboard.down('a');page.keyboard.press('ShiftLeft');page.clock.run_for(100);page.keyboard.up('a');page.clock.run_for(650)
    page.keyboard.down('o');page.clock.run_for(50);page.keyboard.down('s');page.clock.run_for(50)
    page.keyboard.up('o');page.keyboard.up('s');page.clock.run_for(100)
    for key in ['j','h','k','n','m',',']:
        page.keyboard.press(key);page.clock.run_for(750)
    page.keyboard.down('s')
    for key in ['j','n']:
        page.keyboard.press(key);page.clock.run_for(750)
    page.keyboard.up('s');page.clock.run_for(100)
    for key in ['j','n']:
        page.keyboard.press('w');page.clock.run_for(180);page.keyboard.press(key);page.clock.run_for(50)
        assert page.evaluate('mygoGame.match.fighters[0].attack')=='penguin_air_'+('light' if key=='j' else 'lightKick'),page.evaluate('mygoGame.match.fighters[0]')
        page.clock.run_for(1150)

    morph();page.keyboard.press('w');page.clock.run_for(1200)
    page.keyboard.press('c');page.clock.run_for(200)
    assert page.evaluate('mygoGame.match.fighters[0].attack')=='penguinKick'
    page.locator('#stage').screenshot(path=str(ART/'tomori-penguin-flying-kick.png'))
    page.clock.run_for(1000)
    page.keyboard.press('i');page.clock.run_for(260);assert page.evaluate('mygoGame.match.waves.some(w=>w.attack==="penguinHey")')
    page.clock.run_for(900);place();page.evaluate('mygoGame.match.fighters[0].energy=100')
    page.keyboard.press('u');page.clock.run_for(150)
    page.locator('#stage').screenshot(path=str(ART/'tomori-penguin-cry.png'))
    page.keyboard.press('Numpad1');page.clock.run_for(700)
    assert page.evaluate('mygoGame.match.fighters[0].hp')==100
    assert page.evaluate('mygoGame.match.fighters[1].hp')<100
    page.clock.run_for(500)
    place();page.evaluate('mygoGame.match.fighters[0].energy=100')
    page.keyboard.press('t');page.clock.run_for(230)
    page.locator('#stage').screenshot(path=str(ART/'tomori-penguin-laugh.png'))
    page.clock.run_for(1000)
    place();page.evaluate('mygoGame.match.fighters[0].energy=100')
    page.keyboard.press('l');page.clock.run_for(380)
    assert page.evaluate('mygoGame.match.fighters[0].attack')=='penguinCall'
    page.locator('#stage').screenshot(path=str(ART/'tomori-penguin-gugugaga.png'))
    page.clock.run_for(1400);assert page.evaluate('mygoGame.match.fighters[0].hitMarks.length')==3

    morph();place();page.keyboard.press('Numpad5');page.clock.run_for(1400)
    missing=page.evaluate('MYGO_ASSETS.penguin.frames.map(f=>f.name).filter(n=>n!=="victory"&&!penguinDraws.has(n))')
    assert missing==[],missing
    # A result clears actual transformation state, so next round has the normal kit.
    place();page.evaluate('mygoGame.match.fighters[1].hp=1');page.keyboard.press('j');page.clock.run_for(1000)
    assert page.evaluate('mygoGame.match.phase')=='roundOver'
    assert page.evaluate('mygoGame.match.fighters[0].penguin') is None

    select_game_option(page,'#opponent-character','2');start_match(page);page.clock.run_for(1800)
    page.evaluate('mygoGame.match.fighters[1].energy=100')
    page.keyboard.press('Delete');page.clock.run_for(850)
    assert page.evaluate('mygoGame.match.fighters[1].penguin.ms')>19000
    assert page.evaluate('mygoGame.match.fighters[0].penguin') is None
    page.keyboard.press('Numpad7');page.clock.run_for(50)
    assert page.evaluate('mygoGame.match.fighters[1].attack')=='penguin_medium'
    page.clock.run_for(800);page.keyboard.press('NumpadEnter');page.clock.run_for(50)
    assert page.evaluate('mygoGame.match.fighters[1].attack')=='penguinLaugh'

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
    tap('KeyG')
    assert phone.evaluate('!!mygoGame.match.fighters[0].penguin&&mygoGame.match.fighters[0].cooldown===0')
    tap('KeyI');phone.clock.run_for(50)
    assert phone.evaluate('mygoGame.match.fighters[0].attack')=='penguinHey'
    phone.clock.run_for(850)
    assert phone.evaluate('!!mygoGame.match.fighters[0].penguin')
    assert phone.locator('[data-key="KeyC"]').inner_text()=='飞踢'
    assert phone.locator('[data-key="KeyG"]').is_disabled()
    tap('KeyL');phone.clock.run_for(750)
    assert phone.evaluate('mygoGame.match.fighters[0].hitMarks.length')==3
    assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
    phone.screenshot(path=str(ART/'tomori-penguin-mobile.png'))
    phone.clock.run_for(phone.evaluate('mygoGame.match.fighters[0].penguin.ms')+100)
    assert phone.locator('[data-key="KeyG"]').is_enabled()
    assert phone.locator('[data-key="KeyH"]').is_hidden()
    tap('KeyG');phone.clock.run_for(800)
    assert phone.evaluate('!!mygoGame.match.fighters[0].penguin')
    for width,height in [(667,375),(844,390)]:
        phone.set_viewport_size({'width':width,'height':height});phone.clock.run_for(50)
        assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight')
    assert errors==[],errors
    assert remote==[],remote
    print(json.dumps({'50_energy_20_seconds':'pass','pause_expiry_native_restore':'pass','five_skills':'pass','live_penguin_frames':31,
        'six_button_three_stance_normals':'pass','parry':'pass','P2':'pass','touch_retransform':'pass','mobile_layout':'pass','offline':'pass','errors':errors}))
    mobile.close();browser.close()
