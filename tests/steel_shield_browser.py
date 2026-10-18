"""Exercise the actual U/B bindings, steel absorption, and touch in offline Edge."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from ui_helpers import select_game_option, start_match

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'tests/artifacts'
ART.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel='msedge')
    page = browser.new_page(viewport={'width': 1440, 'height': 1060})
    errors, remote = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: remote.append(r.url) if r.url.startswith('http') else None)
    page.clock.install()
    page.goto((ROOT / 'index.html').as_uri())
    page.wait_for_function('window.mygoGame && mygoGame.loaded')
    select_game_option(page, '#mode', 'duel')
    start_match(page); page.clock.run_for(1150)
    page.evaluate('''() => { const m = mygoGame.match;
      m.fighters[0].x=420; m.fighters[0].energy=20; m.fighters[1].x=520; }''')
    page.keyboard.press('u'); page.clock.run_for(160)
    assert page.evaluate('mygoGame.match.fighters[0].shield.hp') == 40
    assert page.evaluate('mygoGame.match.fighters[0].energy') == 0
    assert page.evaluate('mygoGame.match.fighters[1].hp') == 100
    assert '钢板' in page.locator('#special1').inner_text()
    page.keyboard.press('Numpad2'); page.clock.run_for(700)
    assert page.evaluate('mygoGame.match.fighters[0].shield.hp') == 24
    assert page.evaluate('mygoGame.match.fighters[0].hp') == 100
    page.screenshot(path=str(ART / 'anon-steel-shield.png'), full_page=True)
    page.evaluate('mygoGame.match.fighters[1].energy=20')
    page.keyboard.press('Numpad4'); page.clock.run_for(700)
    assert page.evaluate('mygoGame.match.fighters[0].shield.hp') == 10
    assert page.evaluate('mygoGame.match.fighters[0].hp') == 100
    page.keyboard.press('Numpad2'); page.clock.run_for(700)
    assert page.evaluate('mygoGame.match.fighters[0].shield') is None
    assert page.evaluate('mygoGame.match.fighters[0].hp') == 94

    page.keyboard.press('r'); page.clock.run_for(1150)
    page.evaluate('''() => { const m = mygoGame.match;
      m.fighters[0].x=420; m.fighters[0].energy=20; m.fighters[1].x=480; }''')
    page.keyboard.press('u'); page.clock.run_for(500)
    page.keyboard.press('b'); page.clock.run_for(180)
    assert page.evaluate('mygoGame.match.fighters[1].hp') == 82
    assert page.evaluate('mygoGame.match.fighters[0].shield.hp') == 40
    page.keyboard.press('Space')
    before = page.evaluate('JSON.stringify(mygoGame.match.fighters[0].shield)')
    page.clock.run_for(1000)
    assert page.evaluate('JSON.stringify(mygoGame.match.fighters[0].shield)') == before
    page.keyboard.press('Space'); page.clock.run_for(50)
    page.keyboard.press('F1')
    assert '钢板防护' in page.locator('#moves-content').inner_text()
    assert 'B（后投' in page.locator('#moves-content').inner_text()
    page.click('#close-moves'); page.clock.run_for(50)
    page.keyboard.press('r'); page.clock.run_for(1150)
    assert page.evaluate('mygoGame.match.fighters[0].shield') is None
    select_game_option(page, '#player-character', '1'); start_match(page); page.clock.run_for(1150)
    assert page.locator('#help-throw-key').inner_text() == 'U'
    assert page.locator('[data-key="KeyU"]').inner_text() == '投技'
    page.keyboard.press('u'); page.clock.run_for(30)
    assert page.evaluate('mygoGame.match.fighters[0].attack') == 'throw'

    mobile = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    phone = mobile.new_page(); phone.on('pageerror', lambda e: errors.append(str(e)))
    phone.clock.install(); phone.goto((ROOT / 'index.html').as_uri())
    phone.wait_for_function('window.mygoGame && mygoGame.loaded')
    phone.clock.run_for(50)
    assert phone.evaluate('document.documentElement.scrollWidth <= innerWidth')
    box = phone.locator('.touch-controls').bounding_box()
    assert box['y'] + box['height'] <= 844
    phone.click('#super-demo'); phone.clock.run_for(1150)
    assert phone.locator('[data-key="KeyU"]').inner_text() == '钢板'
    button = phone.locator('[data-key="KeyU"]').bounding_box()
    cdp = mobile.new_cdp_session(phone)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': button['x'] + button['width']/2, 'y': button['y'] + button['height']/2}]})
    phone.clock.run_for(50)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    phone.clock.run_for(140)
    assert phone.evaluate('mygoGame.match.fighters[0].shield.hp') == 40
    assert phone.evaluate('mygoGame.match.fighters[0].energy') == 80
    phone.screenshot(path=str(ART / 'mobile-steel-shield.png'), full_page=True)
    assert errors == [], errors
    assert remote == [], remote
    print(json.dumps({'U_cost20': 'pass', 'frontal_melee': 'pass', 'projectile': 'pass', 'break_overflow': 'pass', 'B_throw': 'pass', 'pause_reset': 'pass', 'Soyo_U': 'pass', 'mobile_steel': 'pass', 'errors': errors}, ensure_ascii=False))
    mobile.close(); browser.close()
