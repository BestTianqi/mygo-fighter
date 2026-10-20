"""Exercise Soyo's actual sprites, self heal, 2P binding and mobile touch offline."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from ui_helpers import select_game_option, start_match

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'tests/artifacts'
ART.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel='msedge')
    page = browser.new_page(viewport={'width':1366, 'height':768})
    errors, remote = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: remote.append(r.url) if r.url.startswith('http') else None)
    page.clock.install(time='2026-01-01T00:00:00Z')
    page.goto((ROOT / 'index.html').as_uri()); page.wait_for_function('mygoGame.loaded')
    page.clock.pause_at('2026-01-01T00:01:00Z')
    select_game_option(page, '#player-character', '1')
    select_game_option(page, '#opponent-character', '0')
    select_game_option(page, '#mode', 'duel')
    page.uncheck('#terrain-enabled'); start_match(page); page.clock.run_for(1800)
    assert page.evaluate('MYGO_ASSETS.soyoActions.frames.length') == 24
    page.evaluate('''() => {
      window.soyoDraws=new Set();const cache=new WeakMap(),ctx=document.querySelector('#game').getContext('2d'),draw=ctx.drawImage;
      ctx.drawImage=function(...args){const im=args[0];if(!cache.has(im))cache.set(im,im.src===MYGO_ASSETS.soyoActions.atlas);
        if(cache.get(im)){const f=MYGO_ASSETS.soyoActions.frames.find(f=>f.x===args[1]&&f.y===args[2]);if(f)soyoDraws.add(f.name);}
        return draw.apply(this,args);};
    }''')
    def restart():
        page.click('#restart'); page.clock.run_for(1800)
        page.evaluate('mygoGame.match.fighters[0].energy=100;mygoGame.match.fighters[1].x=850')
    def place():
        page.evaluate('mygoGame.match.fighters[0].x=420;mygoGame.match.fighters[1].x=485')

    page.evaluate('mygoGame.match.fighters[0].hp=50;mygoGame.match.fighters[0].energy=100')
    page.keyboard.press('g'); page.clock.run_for(350)
    assert page.evaluate('mygoGame.match.fighters[0].hp') == 50
    assert page.evaluate('mygoGame.match.fighters[0].energy') == 65
    page.locator('#stage').screenshot(path=str(ART / 'soyo-heal-channel.png'))
    page.keyboard.press('Space'); frozen=page.evaluate('JSON.stringify(mygoGame.match.fighters[0])')
    page.clock.run_for(1000); assert page.evaluate('JSON.stringify(mygoGame.match.fighters[0])') == frozen
    page.keyboard.press('Space'); page.clock.run_for(450)
    assert page.evaluate('mygoGame.match.fighters[0].hp') == 74
    assert page.locator('#hptext1').inner_text() == '74 / 200'
    page.locator('#stage').screenshot(path=str(ART / 'soyo-heal-release.png'))
    page.clock.run_for(650); page.keyboard.press('g'); page.clock.run_for(50)
    assert page.evaluate('mygoGame.match.fighters[0].attack') is None
    assert '归心冷却' in page.locator('#chain-hint').inner_text()
    page.keyboard.press('F1')
    assert '归心·自愈' in page.locator('#moves-content').inner_text()
    assert '回复 24' in page.locator('#moves-content').inner_text()
    page.click('#close-moves'); page.clock.run_for(50)

    restart()
    page.keyboard.down('d'); page.clock.run_for(300)
    page.keyboard.press('ShiftLeft'); page.clock.run_for(100); page.keyboard.up('d'); page.clock.run_for(600)
    page.keyboard.down('a'); page.keyboard.press('ShiftLeft'); page.clock.run_for(100); page.keyboard.up('a'); page.clock.run_for(600)
    page.keyboard.press('w'); page.clock.run_for(1200)
    for key, ms in [('j',450),('k',700),('t',850),('i',600),('l',900)]:
        page.evaluate('mygoGame.match.fighters[0].energy=100')
        page.keyboard.press(key); page.clock.run_for(ms)
    page.keyboard.down('o'); page.clock.run_for(50)
    page.locator('#stage').screenshot(path=str(ART / 'soyo-palm-guard.png'))
    page.keyboard.down('s'); page.clock.run_for(50); page.keyboard.up('o'); page.keyboard.up('s'); page.clock.run_for(100)

    restart(); place(); page.keyboard.press('Numpad1'); page.clock.run_for(1100)
    place(); page.keyboard.down('s'); page.clock.run_for(50)
    page.keyboard.press('Numpad2'); page.clock.run_for(250); page.keyboard.up('s'); page.clock.run_for(1000)
    place(); page.keyboard.press('Numpad5'); page.clock.run_for(1400)
    restart(); place(); page.evaluate('mygoGame.match.fighters[0].hp=50')
    page.keyboard.press('g'); page.keyboard.press('Numpad1'); page.clock.run_for(1200)
    assert page.evaluate('mygoGame.match.fighters[0].hp') < 50
    restart(); place(); page.evaluate('mygoGame.match.fighters[1].hp=1')
    page.keyboard.press('j'); page.clock.run_for(900)
    assert page.evaluate('mygoGame.match.phase') == 'roundOver'
    missing=page.evaluate('MYGO_ASSETS.soyoActions.frames.map(f=>f.name).filter(n=>!soyoDraws.has(n))')
    assert missing == [], missing

    select_game_option(page,'#opponent-character','1'); start_match(page); page.clock.run_for(1800)
    page.evaluate('mygoGame.match.fighters[1].hp=45;mygoGame.match.fighters[1].energy=35')
    page.keyboard.press('Delete'); page.clock.run_for(800)
    assert page.evaluate('mygoGame.match.fighters[1].hp') == 69
    assert page.evaluate('mygoGame.match.fighters[1].energy') == 0

    mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    phone=mobile.new_page();phone.on('pageerror',lambda e:errors.append(str(e)))
    phone.clock.install(time='2026-01-01T00:00:00Z')
    phone.goto((ROOT / 'index.html').as_uri());phone.wait_for_function('mygoGame.loaded')
    phone.clock.pause_at('2026-01-01T00:01:00Z')
    select_game_option(phone,'#player-character','1');select_game_option(phone,'#mode','practice')
    start_match(phone);phone.clock.run_for(1800)
    phone.evaluate('mygoGame.match.fighters[0].hp=50')
    button=phone.locator('[data-key="KeyG"]');assert button.is_visible()
    box=button.bounding_box();cdp=mobile.new_cdp_session(phone)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':box['x']+box['width']/2,'y':box['y']+box['height']/2}]})
    phone.clock.run_for(30);cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});phone.clock.run_for(800)
    assert phone.evaluate('mygoGame.match.fighters[0].hp') == 74
    assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
    phone.screenshot(path=str(ART / 'soyo-heal-mobile.png'))
    select_game_option(phone,'#player-character','0');start_match(phone);phone.clock.run_for(1800)
    assert not button.is_visible()
    assert errors == [], errors
    assert remote == [], remote
    print(json.dumps({'actual_soyo_sprite_draws':24,'self_heal_24':'pass','interrupt_cooldown_pause':'pass',
                      'P2_Delete':'pass','mobile_touch':'pass','offline':'pass','errors':errors}))
    mobile.close();browser.close()
