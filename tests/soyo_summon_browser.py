"""Verify Soyo's three tempura familiars in the offline game, including real touch."""
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
    select_game_option(page,'#player-character','1'); select_game_option(page,'#opponent-character','0')
    select_game_option(page,'#mode','duel'); start_match(page); page.clock.run_for(1800)
    assert page.locator('[data-key="KeyT"]').inner_text() == '小天素罗'
    assert page.evaluate('MYGO_ASSETS.soyoTensora.frames.length') == 4
    page.evaluate('''() => {const m=mygoGame.match;m.fighters[0].x=400;m.fighters[0].energy=50;m.fighters[1].x=650;
      window.tensoraDraws=new Set();const ctx=document.querySelector('#game').getContext('2d'),draw=ctx.drawImage,cache=new WeakMap();
      ctx.drawImage=function(...args){const im=args[0];if(!cache.has(im))cache.set(im,im.src===MYGO_ASSETS.soyoTensora.atlas);
        if(cache.get(im)){const i=MYGO_ASSETS.soyoTensora.frames.findIndex(f=>f.x===args[1]&&f.y===args[2]);if(i>=0)tensoraDraws.add(i);}return draw.apply(this,args);};}''')
    page.keyboard.press('t'); page.clock.run_for(430)
    assert page.evaluate('mygoGame.match.fighters[0].summons.units.length') == 3
    assert page.evaluate('mygoGame.match.fighters[0].energy') == 0
    assert '×3' in page.locator('#special1').inner_text()
    page.locator('#stage').screenshot(path=str(ART / 'soyo-tensora-summon.png'))
    page.keyboard.press('Space'); before=page.evaluate('JSON.stringify(mygoGame.match.fighters[0].summons)')
    page.clock.run_for(1500)
    assert page.evaluate('JSON.stringify(mygoGame.match.fighters[0].summons)') == before
    page.keyboard.press('Space'); page.clock.run_for(2000)
    assert page.evaluate('mygoGame.match.fighters[1].hp') < 200
    page.locator('#stage').screenshot(path=str(ART / 'soyo-tensora-attack.png'))
    assert page.evaluate('tensoraDraws.size') == 4
    page.evaluate('mygoGame.match.fighters[0].energy=100')
    page.keyboard.press('t'); page.clock.run_for(50)
    assert page.evaluate('mygoGame.match.fighters[0].summons.units.length') == 3
    assert page.evaluate('mygoGame.match.fighters[0].energy') == 100
    page.keyboard.press('F1')
    assert '小天素罗召唤' in page.locator('#moves-content').inner_text()
    page.click('#close-moves'); page.clock.run_for(50)
    page.clock.run_for(11000)
    assert page.evaluate('mygoGame.match.fighters[0].summons') is None
    page.keyboard.press('r'); page.clock.run_for(1800)
    assert page.evaluate('mygoGame.match.fighters[0].summons') is None

    select_game_option(page,'#opponent-character','1'); start_match(page); page.clock.run_for(1800)
    page.evaluate('mygoGame.match.fighters[1].energy=50')
    page.keyboard.press('NumpadEnter'); page.clock.run_for(430)
    assert page.evaluate('mygoGame.match.fighters[1].summons.units.length') == 3
    assert '×3' in page.locator('#special2').inner_text()

    mobile = browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    phone=mobile.new_page(); phone.on('pageerror',lambda e:errors.append(str(e)))
    phone.clock.install(time='2026-01-01T00:00:00Z')
    phone.goto((ROOT / 'index.html').as_uri());phone.wait_for_function('mygoGame.loaded')
    phone.clock.pause_at('2026-01-01T00:01:00Z')
    select_game_option(phone,'#player-character','1');start_match(phone);phone.clock.run_for(1800)
    phone.click('#super-demo');phone.clock.run_for(1800)
    assert phone.evaluate('mygoGame.match.fighters[0].character') == 1
    button=phone.locator('[data-key="KeyT"]');assert button.inner_text()=='小天素罗'
    box=button.bounding_box();cdp=mobile.new_cdp_session(phone)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':box['x']+box['width']/2,'y':box['y']+box['height']/2}]})
    phone.clock.run_for(30);cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});phone.clock.run_for(400)
    assert phone.evaluate('mygoGame.match.fighters[0].summons.units.length') == 3
    assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
    phone.screenshot(path=str(ART / 'soyo-tensora-mobile.png'))
    assert errors==[],errors
    assert remote==[],remote
    print(json.dumps({'T_three_units':'pass','ten_second_expiry':'pass','actual_four_sprite_poses':'pass',
                      'pause_restart':'pass','P2_summon':'pass','touch':'pass','offline':'pass','errors':errors}))
    mobile.close();browser.close()
