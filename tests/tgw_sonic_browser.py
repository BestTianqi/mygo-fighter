"""Verify TGW keyboard/touch input and its actual expanding projectile offline."""
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
    page.clock.install(); page.goto((ROOT / 'index.html').as_uri())
    page.wait_for_function('window.mygoGame && mygoGame.loaded')
    select_game_option(page, '#mode', 'duel'); start_match(page); page.clock.run_for(1800)
    page.click('#sound'); page.focus('#stage')
    page.evaluate('mygoGame.match.fighters[0].energy=30; mygoGame.match.fighters[1].x=700')
    page.keyboard.press('t'); page.clock.run_for(330)
    assert page.evaluate('mygoGame.match.fighters[0].attack') == 'sonic'
    assert page.evaluate('mygoGame.match.fighters[0].energy') == 0
    assert page.evaluate('mygoGame.match.waves.length') == 1
    assert page.evaluate('mygoGame.match.waves[0].attack') == 'sonic'
    assert 'TGW' in page.locator('#last-move').inner_text()
    page.screenshot(path=str(ART / 'anon-tgw-sonic.png'), full_page=True)
    page.keyboard.press('Space')
    before = page.evaluate('JSON.stringify(mygoGame.match.waves)')
    page.clock.run_for(800)
    assert page.evaluate('JSON.stringify(mygoGame.match.waves)') == before
    page.keyboard.press('Space'); page.clock.run_for(900)
    assert page.evaluate('mygoGame.match.fighters[1].hp') == 178
    assert page.evaluate('mygoGame.match.waves.length') == 0
    page.keyboard.press('F1')
    assert 'TGW·音波攻击' in page.locator('#moves-content').inner_text()
    page.click('#close-moves'); page.clock.run_for(50)

    page.keyboard.press('r'); page.clock.run_for(1150)
    page.evaluate('mygoGame.match.fighters[0].energy=29')
    page.keyboard.press('t'); page.clock.run_for(250)
    assert page.evaluate('mygoGame.match.fighters[0].attack') is None
    assert page.evaluate('mygoGame.match.waves.length') == 0
    page.evaluate('mygoGame.match.fighters[0].energy=30')
    page.keyboard.down('Numpad0'); page.keyboard.press('t'); page.clock.run_for(1100)
    page.keyboard.up('Numpad0')
    assert page.evaluate('mygoGame.match.fighters[1].hp') == 197

    select_game_option(page, '#opponent-character', '0'); start_match(page); page.clock.run_for(1150)
    page.evaluate('mygoGame.match.fighters[1].energy=20')
    page.keyboard.press('NumpadMultiply'); page.clock.run_for(500)
    assert page.evaluate('mygoGame.match.fighters[1].shield.hp') == 40
    page.evaluate('mygoGame.match.fighters[0].energy=30')
    page.keyboard.press('t'); page.clock.run_for(1100)
    assert page.evaluate('mygoGame.match.fighters[1].hp') == 200
    assert page.evaluate('mygoGame.match.fighters[1].shield.hp') == 18

    select_game_option(page, '#player-character', '1'); start_match(page); page.clock.run_for(1150)
    page.evaluate('mygoGame.match.fighters.forEach(f => f.energy=30)')
    page.keyboard.press('t'); page.clock.run_for(50)
    assert page.evaluate('mygoGame.match.fighters[0].attack') is None
    assert page.locator('[data-key="KeyT"]').inner_text() == '小天素罗'
    page.keyboard.press('NumpadEnter'); page.clock.run_for(300)
    assert page.evaluate('mygoGame.match.fighters[1].attack') == 'sonic'
    page.keyboard.press('r'); page.clock.run_for(1150)
    assert page.evaluate('mygoGame.match.waves.length') == 0

    mobile = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    phone = mobile.new_page(); phone.on('pageerror', lambda e: errors.append(str(e)))
    phone.clock.install(); phone.goto((ROOT / 'index.html').as_uri())
    phone.wait_for_function('window.mygoGame && mygoGame.loaded'); phone.clock.run_for(50)
    assert phone.evaluate('document.documentElement.scrollWidth <= innerWidth')
    box = phone.locator('.touch-controls').bounding_box()
    assert box['y'] + box['height'] <= 844
    phone.click('#super-demo'); phone.clock.run_for(1800)
    button = phone.locator('[data-key="KeyT"]').bounding_box()
    cdp = mobile.new_cdp_session(phone)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': button['x'] + button['width']/2, 'y': button['y'] + button['height']/2}]})
    phone.clock.run_for(50)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    phone.clock.run_for(180)
    assert phone.evaluate('mygoGame.match.fighters[0].attack') == 'sonic'
    assert phone.evaluate('mygoGame.match.fighters[0].energy') == 70
    assert phone.evaluate('mygoGame.match.waves.length') == 1
    phone.screenshot(path=str(ART / 'mobile-tgw-sonic.png'), full_page=True)
    assert errors == [], errors
    assert remote == [], remote
    print(json.dumps({'TGW_T_cost30': 'pass', 'hit22': 'pass', 'pause_reset': 'pass', 'guard': 'pass', 'steel': 'pass', 'P2_TGW': 'pass', 'mobile_TGW': 'pass', 'offline': 'pass', 'errors': errors}, ensure_ascii=False))
    mobile.close(); browser.close()
