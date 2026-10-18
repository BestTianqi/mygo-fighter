"""Verify every offline stage renders and can change without resetting combat."""
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'tests/artifacts'
ART.mkdir(exist_ok=True)
NAMES = ['RiNG 舞台', '月夜剧场', '黄昏天台', '雨夜街头', '樱花河畔', '乐队练习室']

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel='msedge')
    page = browser.new_page(viewport={'width': 1366, 'height': 768})
    errors, remote = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda req: remote.append(req.url) if req.url.startswith('http') else None)
    page.clock.install(time='2026-01-01T00:00:00Z')
    page.goto((ROOT / 'index.html').as_uri())
    page.wait_for_function('window.mygoGame && mygoGame.loaded')
    page.clock.pause_at('2026-01-01T00:01:00Z')
    page.click('#settings')
    assert page.locator('[data-stage]').count() == 6
    assert page.locator('.stage-choice span').all_text_contents() == NAMES
    page.wait_for_function('''[...document.querySelectorAll('.stage-choice img')]
        .every(img => img.complete && img.naturalWidth > 100)''')
    page.screenshot(path=str(ART / 'stages-settings-desktop.png'))
    page.click('#close-settings'); page.clock.run_for(50)
    page.click('#super-demo'); page.clock.run_for(1200)
    fingerprints = []
    for i, name in enumerate(NAMES):
        page.click('#settings'); page.clock.run_for(50)
        before = page.evaluate('JSON.stringify(mygoGame.match.fighters.map(({y,vy,...f}) => f)) + mygoGame.match.remaining')
        page.click(f'[data-stage="{i}"]'); page.clock.run_for(50)
        assert page.evaluate('mygoGame.match.paused')
        assert page.evaluate('JSON.stringify(mygoGame.match.fighters.map(({y,vy,...f}) => f)) + mygoGame.match.remaining') == before
        assert page.locator('.stage-choice[aria-pressed="true"]').count() == 1
        assert page.locator('.stage-choice[aria-pressed="true"] span').inner_text() == name
        fingerprints.append(page.evaluate('''() => {
          const c = document.querySelector('#game');
          const pixels = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
          return new Uint32Array(pixels.buffer).reduce((h, pixel) => Math.imul(h ^ pixel, 16777619) >>> 0, 2166136261);
        }'''))
        page.click('#close-settings'); page.clock.run_for(50)
        assert not page.evaluate('mygoGame.match.paused')
        page.locator('#stage').screenshot(path=str(ART / f'stage-{i}.png'))
    assert len(set(fingerprints)) == 6, fingerprints
    page.click('#restart'); page.clock.run_for(1200)
    page.click('#settings')
    assert page.locator('[data-stage="5"]').get_attribute('aria-pressed') == 'true'
    page.click('#close-settings'); page.clock.run_for(50)

    mobile = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    phone = mobile.new_page()
    phone.on('pageerror', lambda error: errors.append(str(error)))
    phone.goto((ROOT / 'index.html').as_uri())
    phone.wait_for_function('window.mygoGame && mygoGame.loaded')
    phone.click('#settings')
    phone.screenshot(path=str(ART / 'stages-settings-mobile.png'))
    for width, height in [(390, 844), (320, 640), (844, 390)]:
        phone.set_viewport_size({'width': width, 'height': height})
        for i in range(6):
            card = phone.locator(f'[data-stage="{i}"]')
            card.click()
            box = card.bounding_box()
            assert 0 <= box['x'] and box['x'] + box['width'] <= width
            assert 0 <= box['y'] and box['y'] + box['height'] <= height
            assert card.get_attribute('aria-pressed') == 'true'
        assert phone.evaluate('document.documentElement.scrollWidth <= innerWidth')
    phone.click('#start')
    phone.wait_for_function('mygoGame.match.phase === "fighting"')
    assert phone.locator('#settings-dialog').is_hidden()
    assert errors == [], errors
    assert remote == [], remote
    print(json.dumps({'six_distinct_stages': 'pass', 'live_switch': 'pass', 'combat_preserved': 'pass',
                      'restart_preserves_stage': 'pass', 'mobile_selection': 'pass',
                      'offline': 'pass', 'errors': errors}, ensure_ascii=False))
    mobile.close(); browser.close()
