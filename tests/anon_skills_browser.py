"""Verify the expanded Anon commands and yellow-dragon super in offline Edge."""
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
    page.click('#super-demo')
    page.clock.run_for(1150)
    assert page.evaluate('mygoGame.match.options.mode') == 'practice'
    assert page.locator('#timer').inner_text() == '∞'
    assert page.evaluate('mygoGame.match.fighters[0].energy') == 100
    assert page.evaluate('MYGO_ASSETS.anonNormals.frames.length') == 18
    assert page.evaluate('MYGO_ASSETS.milkDragon.frames.length') == 4
    page.keyboard.press('p')
    page.clock.run_for(900)
    assert page.evaluate('mygoGame.match.fighters[0].attack') == 'super'
    assert page.evaluate('mygoGame.match.fighters[0].energy') == 0
    assert page.locator('#super-title').is_visible()
    page.screenshot(path=str(ART / 'anon-yellow-dragon-grow.png'), full_page=True)
    page.keyboard.press('Space')
    before = page.evaluate('JSON.stringify(mygoGame.match.fighters)')
    page.clock.run_for(800)
    assert page.evaluate('JSON.stringify(mygoGame.match.fighters)') == before
    page.keyboard.press('Space')
    while page.evaluate('mygoGame.match.fighters[0].attackMs') < 1560:
        page.clock.run_for(40)
    page.screenshot(path=str(ART / 'anon-yellow-dragon-slam.png'), full_page=True)
    assert page.evaluate('mygoGame.match.fighters[1].hp') <= 160
    page.clock.run_for(1400)
    assert page.evaluate('mygoGame.match.fighters[0].attack') is None
    assert page.evaluate('mygoGame.match.fighters[0].energy') == 100
    assert page.locator('#super-title').is_hidden()

    # All six attack keys and stance selection travel through the browser input.
    for key, expected in [('j', 'light'), ('h', 'medium'), ('k', 'heavy'), ('n', 'lightKick'), ('m', 'mediumKick'), (',', 'heavyKick')]:
        page.keyboard.press(key)
        page.clock.run_for(40)
        assert page.evaluate('mygoGame.match.fighters[0].attack') == expected
        page.clock.run_for(900)
    page.keyboard.down('s')
    page.clock.run_for(50)
    page.keyboard.press('m')
    page.clock.run_for(40)
    assert page.evaluate('mygoGame.match.fighters[0].attack') == 'crouch_mediumKick'
    page.keyboard.up('s')
    page.clock.run_for(900)
    page.keyboard.press('w')
    page.clock.run_for(160)
    page.keyboard.press('n')
    page.clock.run_for(40)
    assert page.evaluate('mygoGame.match.fighters[0].attack') == 'air_lightKick'
    page.clock.run_for(1100)
    # Real quarter circle, keeping each direction for a few simulation steps.
    page.keyboard.down('s'); page.clock.run_for(60)
    page.keyboard.down('d'); page.clock.run_for(60)
    page.keyboard.up('s'); page.clock.run_for(60)
    page.keyboard.press('k'); page.clock.run_for(40)
    page.keyboard.up('d')
    assert page.evaluate('mygoGame.match.fighters[0].attack') == 'waveHeavy'
    page.clock.run_for(1000)
    page.keyboard.press('F1')
    assert page.locator('#moves-dialog').is_visible()
    assert page.locator('#moves-content tbody tr').count() >= 27
    assert '粉色奶龙' in page.locator('#moves-content').inner_text()
    assert page.evaluate('mygoGame.match.paused')
    page.screenshot(path=str(ART / 'anon-move-list.png'), full_page=True)
    page.click('#close-moves')
    page.clock.run_for(50)  # Native dialog close event is queued after click.
    assert not page.evaluate('mygoGame.match.paused')
    page.keyboard.press('Space')
    page.click('#moves'); page.click('#close-moves')
    page.clock.run_for(50)
    assert page.evaluate('mygoGame.match.paused')  # Manual pause remains paused.
    page.keyboard.press('Space')
    page.keyboard.press('p'); page.clock.run_for(400)
    page.keyboard.press('r'); page.clock.run_for(1150)
    assert page.evaluate('mygoGame.match.fighters[0].attack') is None
    assert page.locator('#super-title').is_hidden()

    # Both players keep their own character's super.
    select_game_option(page, '#player-character', '1')
    select_game_option(page, '#opponent-character', '0')
    select_game_option(page, '#mode', 'duel')
    start_match(page); page.clock.run_for(1150)
    page.evaluate('mygoGame.match.fighters.forEach(f => f.energy = 100)')
    page.keyboard.press('p'); page.clock.run_for(50)
    assert page.evaluate('mygoGame.match.fighters[0].attack') == 'soyoSuper'
    page.keyboard.press('NumpadSubtract'); page.clock.run_for(900)
    assert page.evaluate('mygoGame.match.fighters[1].attack') == 'super'

    mobile = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    phone = mobile.new_page()
    phone.on('pageerror', lambda e: errors.append(str(e)))
    phone.clock.install()
    phone.goto((ROOT / 'index.html').as_uri())
    phone.wait_for_function('window.mygoGame && mygoGame.loaded')
    phone.clock.run_for(50)
    assert phone.evaluate('document.documentElement.scrollWidth <= innerWidth')
    touch_box = phone.locator('.touch-controls').bounding_box()
    assert touch_box['y'] + touch_box['height'] <= 844
    phone.click('#super-demo'); phone.clock.run_for(1150)
    button = phone.locator('[data-key="KeyP"]')
    box = button.bounding_box()
    cdp = mobile.new_cdp_session(phone)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': box['x'] + box['width'] / 2, 'y': box['y'] + box['height'] / 2}]})
    phone.clock.run_for(50)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    phone.clock.run_for(850)
    assert phone.evaluate('mygoGame.match.fighters[0].attack') == 'super'
    phone.screenshot(path=str(ART / 'mobile-yellow-dragon.png'), full_page=True)
    assert errors == [], errors
    assert remote == [], remote
    print(json.dumps({'practice': 'pass', 'super': 'pass', 'keyboard_motion': 'pass', 'all_six_buttons': 'pass', 'move_list': 'pass', 'pause_restart': 'pass', 'p2_super': 'pass', 'mobile_super': 'pass', 'errors': errors}, ensure_ascii=False))
    mobile.close()
    browser.close()
