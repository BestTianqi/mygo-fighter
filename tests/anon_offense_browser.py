"""Verify the offensive pack, confirmed routes, air dive and real touch input."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from ui_helpers import select_game_option, start_match

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'tests/artifacts'
ART.mkdir(exist_ok=True)

def advance_until(page, expression, limit=2500):
    for _ in range(limit // 20):
        if page.evaluate(expression):
            return
        page.clock.run_for(20)
    assert page.evaluate(expression), (expression, page.evaluate('JSON.stringify(mygoGame.match.fighters)'))

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel='msedge')
    page = browser.new_page(viewport={'width': 1440, 'height': 1060})
    errors, remote = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: remote.append(r.url) if r.url.startswith('http') else None)
    page.clock.install(time='2026-01-01T00:00:00Z'); page.goto((ROOT / 'index.html').as_uri())
    page.wait_for_function('window.mygoGame && mygoGame.loaded')
    page.clock.pause_at('2026-01-01T00:01:00Z')
    select_game_option(page, '#mode', 'duel'); start_match(page); page.clock.run_for(1800)
    page.evaluate('''() => { const m=mygoGame.match; m.fighters[0].x=400;
      m.fighters[0].energy=100; m.fighters[1].x=600; }''')
    page.keyboard.press('c'); page.clock.run_for(160)
    assert page.evaluate('mygoGame.match.fighters[0].attack') == 'thrust'
    assert page.evaluate('mygoGame.match.fighters[0].x') > 440
    page.screenshot(path=str(ART / 'anon-flash-thrust.png'), full_page=True)
    advance_until(page, "mygoGame.match.canCancel(mygoGame.match.fighters[0], 'rush')")
    assert 'V 三连' in page.locator('#chain-hint').inner_text()
    page.keyboard.press('v'); page.clock.run_for(30)
    assert page.evaluate('mygoGame.match.fighters[0].attack') == 'rush'
    advance_until(page, 'mygoGame.match.fighters[0].attackMs >= 300')
    page.screenshot(path=str(ART / 'anon-three-beat-rush.png'), full_page=True)
    page.keyboard.press('Space'); before = page.evaluate('JSON.stringify(mygoGame.match.fighters)')
    page.clock.run_for(800)
    assert page.evaluate('JSON.stringify(mygoGame.match.fighters)') == before
    page.keyboard.press('Space')
    advance_until(page, "mygoGame.match.canCancel(mygoGame.match.fighters[0], 'super')")
    assert 'P 奶龙' in page.locator('#chain-hint').inner_text()
    page.keyboard.press('p'); page.clock.run_for(30)
    assert page.evaluate('mygoGame.match.fighters[0].attack') == 'super'

    # Full route is entered with real keys, including all confirmation windows.
    page.keyboard.press('r'); page.clock.run_for(1800)
    page.evaluate('''() => { const m=mygoGame.match; m.fighters[0].x=400;
      m.fighters[0].energy=100; m.fighters[1].x=465; }''')
    page.keyboard.press('j'); page.clock.run_for(30)
    for key, move in [('h','medium'), ('k','heavy'), ('c','thrust'), ('v','rush'), ('p','super')]:
        advance_until(page, f"mygoGame.match.canCancel(mygoGame.match.fighters[0], '{move}')")
        page.keyboard.press(key); page.clock.run_for(30)
        assert page.evaluate('mygoGame.match.fighters[0].attack') == move
    assert page.evaluate('mygoGame.match.fighters[0].cancelDepth') == 5
    advance_until(page, 'mygoGame.match.fighters[0].combo === 10', limit=4000)
    assert page.evaluate('mygoGame.match.fighters[0].combo') == 10
    assert page.evaluate('mygoGame.match.fighters[1].hp') < 130

    # Actual jump/dive and its vulnerable landing recovery on a whiff.
    page.keyboard.press('r'); page.clock.run_for(1800)
    page.evaluate('mygoGame.match.fighters[0].x=400; mygoGame.match.fighters[0].energy=100; mygoGame.match.fighters[1].x=900')
    page.keyboard.press('w'); page.clock.run_for(280)
    page.keyboard.press('f'); page.clock.run_for(70)
    assert page.evaluate('mygoGame.match.fighters[0].attack') == 'dive'
    assert page.evaluate('mygoGame.match.fighters[0].vy') < 0
    page.screenshot(path=str(ART / 'anon-meteor-dive.png'), full_page=True)
    advance_until(page, 'mygoGame.match.fighters[0].y === 0')
    assert page.evaluate('mygoGame.match.fighters[0].landingRecovery') > 0
    x = page.evaluate('mygoGame.match.fighters[0].x')
    page.keyboard.down('d'); page.keyboard.press('w'); page.clock.run_for(50); page.keyboard.up('d')
    assert page.evaluate('mygoGame.match.fighters[0].x') == x
    assert page.evaluate('mygoGame.match.fighters[0].y') == 0
    assert '收招' in page.locator('#chain-hint').inner_text()
    page.clock.run_for(350); page.keyboard.press('w'); page.clock.run_for(80)
    assert page.evaluate('mygoGame.match.fighters[0].y') > 0
    page.keyboard.press('F1')
    for name in ['闪光突刺', '切分三连击', '流星俯冲踢']:
        assert name in page.locator('#moves-content').inner_text()
    page.click('#close-moves'); page.clock.run_for(50)

    # Anon-only extras also work on P2's independent key cluster.
    select_game_option(page, '#player-character','1'); select_game_option(page, '#opponent-character','0')
    start_match(page); page.clock.run_for(1800)
    page.evaluate('mygoGame.match.fighters.forEach(f => f.energy=100)')
    for key in ['c','v','f']:
        page.keyboard.press(key); page.clock.run_for(30)
        assert page.evaluate('mygoGame.match.fighters[0].attack') is None
    page.keyboard.press('Home'); page.clock.run_for(160)
    assert page.evaluate('mygoGame.match.fighters[1].attack') == 'thrust'
    page.clock.run_for(900); page.keyboard.press('End'); page.clock.run_for(180)
    assert page.evaluate('mygoGame.match.fighters[1].attack') == 'rush'
    page.clock.run_for(1300); page.keyboard.press('ArrowUp'); page.clock.run_for(280)
    page.keyboard.press('PageDown'); page.clock.run_for(70)
    assert page.evaluate('mygoGame.match.fighters[1].attack') == 'dive'
    page.keyboard.press('r'); page.clock.run_for(1150)
    assert page.evaluate('mygoGame.match.fighters[1].landingRecovery') == 0

    mobile = browser.new_context(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True)
    phone = mobile.new_page(); phone.on('pageerror', lambda e: errors.append(str(e)))
    phone.clock.install(time='2026-01-01T00:00:00Z'); phone.goto((ROOT / 'index.html').as_uri())
    phone.wait_for_function('window.mygoGame && mygoGame.loaded')
    phone.clock.pause_at('2026-01-01T00:01:00Z'); phone.clock.run_for(50)
    assert phone.evaluate('document.documentElement.scrollWidth <= innerWidth')
    box = phone.locator('.touch-controls').bounding_box()
    assert box['y'] + box['height'] <= 844
    phone.click('#super-demo'); phone.clock.run_for(1800)
    cdp = mobile.new_cdp_session(phone)
    def touch(key, duration=50):
        button = phone.locator(f'[data-key="{key}"]').bounding_box()
        cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':button['x']+button['width']/2,'y':button['y']+button['height']/2}]})
        phone.clock.run_for(duration)
        cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
    touch('KeyC'); phone.clock.run_for(180)
    assert phone.evaluate('mygoGame.match.fighters[0].attack') == 'thrust'
    advance_until(phone, "mygoGame.match.canCancel(mygoGame.match.fighters[0], 'rush')")
    touch('KeyV'); phone.clock.run_for(150)
    assert phone.evaluate('mygoGame.match.fighters[0].attack') == 'rush'
    phone.clock.run_for(1500); touch('KeyW'); phone.clock.run_for(230)
    touch('KeyF'); phone.clock.run_for(20)
    assert phone.evaluate('mygoGame.match.fighters[0].attack') == 'dive'
    phone.screenshot(path=str(ART / 'mobile-anon-offense.png'), full_page=True)
    assert errors == [], errors
    assert remote == [], remote
    print(json.dumps({'C_thrust':'pass','V_three_hit':'pass','air_F_dive':'pass','confirmed_10_hit_route':'pass','landing_recovery':'pass','P2_keys':'pass','mobile_C_V_F':'pass','offline':'pass','errors':errors},ensure_ascii=False))
    mobile.close(); browser.close()
