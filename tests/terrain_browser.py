"""Exercise terrain through real keyboard/touch input in the standalone HTML."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'tests/artifacts'
ART.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel='msedge')
    page = browser.new_page(viewport={'width': 1366, 'height': 768})
    errors, remote = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: remote.append(r.url) if r.url.startswith('http') else None)
    page.clock.install(time='2026-01-01T00:00:00Z')
    page.goto((ROOT / 'index.html').as_uri())
    page.wait_for_function('mygoGame.loaded')
    page.clock.pause_at('2026-01-01T00:01:00Z')
    page.click('#settings'); page.click('[data-stage="1"]'); page.click('#close-settings'); page.clock.run_for(50)
    page.click('#super-demo'); page.clock.run_for(1800)
    page.evaluate('''() => { const m=mygoGame.match;
      m.fighters[0].x=180; m.fighters[1].x=800;
      m.fighters.forEach(f => { f.y=m.floorHeight(f.x); f.vy=0; }); }''')
    page.keyboard.press('w'); page.clock.run_for(1000)
    assert page.evaluate('mygoGame.match.fighters[0].y') == 84
    assert page.evaluate('mygoGame.match.grounded(mygoGame.match.fighters[0])')
    page.keyboard.press('j'); page.clock.run_for(50)
    assert page.evaluate('mygoGame.match.fighters[0].attack') == 'light'
    page.clock.run_for(600)
    page.locator('#stage').screenshot(path=str(ART / 'terrain-platform-standing.png'))
    page.keyboard.press('Space')
    before = page.evaluate('JSON.stringify(mygoGame.match.fighters)')
    page.clock.run_for(900)
    assert page.evaluate('JSON.stringify(mygoGame.match.fighters)') == before
    page.keyboard.press('Space'); page.clock.run_for(50)
    page.keyboard.down('s'); page.keyboard.press('w'); page.clock.run_for(600); page.keyboard.up('s')
    assert page.evaluate('mygoGame.match.fighters[0].y === mygoGame.match.floorHeight(mygoGame.match.fighters[0].x)')

    for i in range(6):
        page.click('#settings'); page.click(f'[data-stage="{i}"]'); page.click('#close-settings'); page.clock.run_for(50)
        page.evaluate('''() => { const m=mygoGame.match, p=m.options.terrain.platforms[0];
          Object.assign(m.fighters[0], {x:(p.left+p.right)/2,y:p.height,vy:0,vx:0}); }''')
        page.clock.run_for(50)
        assert page.evaluate('mygoGame.match.grounded(mygoGame.match.fighters[0])')
        page.locator('#stage').screenshot(path=str(ART / f'terrain-stage-{i}.png'))
    page.click('#settings'); page.uncheck('#terrain-enabled'); page.click('#close-settings'); page.clock.run_for(700)
    assert page.evaluate('mygoGame.match.options.terrain === null')
    assert page.evaluate('mygoGame.match.fighters[0].y') == 0
    page.click('#restart'); page.clock.run_for(1200)
    assert page.evaluate('mygoGame.match.options.terrain === null')
    page.click('#settings'); page.check('#terrain-enabled'); page.click('#close-settings'); page.clock.run_for(50)
    assert page.evaluate('mygoGame.match.options.terrain.platforms.length') > 0

    mobile = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    phone = mobile.new_page(); phone.on('pageerror', lambda e: errors.append(str(e)))
    phone.clock.install(time='2026-01-01T00:00:00Z')
    phone.goto((ROOT / 'index.html').as_uri()); phone.wait_for_function('mygoGame.loaded')
    phone.clock.pause_at('2026-01-01T00:01:00Z')
    phone.click('#super-demo'); phone.clock.run_for(1800)
    phone.evaluate('mygoGame.match.fighters[0].x=160')
    cdp = mobile.new_cdp_session(phone)
    def points(keys):
        result = []
        for n, key in enumerate(keys):
            box = phone.locator(f'[data-key="{key}"]').bounding_box()
            result.append({'id': n, 'x': box['x']+box['width']/2, 'y': box['y']+box['height']/2})
        return result
    cdp.send('Input.dispatchTouchEvent', {'type':'touchStart', 'touchPoints':points(['KeyW'])})
    phone.clock.run_for(30); cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd', 'touchPoints':[]})
    phone.clock.run_for(1000)
    assert phone.evaluate('mygoGame.match.fighters[0].y') == 56
    phone.screenshot(path=str(ART / 'terrain-mobile.png'))
    cdp.send('Input.dispatchTouchEvent', {'type':'touchStart', 'touchPoints':points(['KeyS','KeyW'])})
    phone.clock.run_for(600); cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd', 'touchPoints':[]})
    assert phone.evaluate('mygoGame.match.fighters[0].y') == 0
    assert phone.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert errors == [], errors
    assert remote == [], remote
    print(json.dumps({'keyboard_platform': 'pass', 'ground_attacks': 'pass', 'drop_through': 'pass',
                      'six_terrains': 'pass', 'pause': 'pass', 'flat_toggle': 'pass', 'touch': 'pass', 'errors': errors}))
    mobile.close(); browser.close()
