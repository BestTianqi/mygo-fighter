"""Exercise all offline maps, scene filters, layers, live switching and mobile play."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from ui_helpers import open_settings, select_game_option, start_match

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'tests/artifacts'
SCENES = json.loads((ROOT / 'assets/stages.json').read_text(encoding='utf-8'))
report = {'errors': [], 'remote_requests': [], 'scenes': [], 'checks': []}


def load(page):
    page.on('pageerror', lambda error: report['errors'].append(str(error)))
    page.on('request', lambda req: report['remote_requests'].append(req.url) if req.url.startswith('http') else None)
    page.clock.install(time='2026-01-01T00:00:00Z')
    page.goto((ROOT / 'index.html').as_uri(), timeout=120000)
    page.wait_for_function('mygoGame.loaded')
    page.clock.pause_at('2026-01-01T00:01:00Z')


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel='msedge')
    page = browser.new_page(viewport={'width': 1366, 'height': 768})
    try:
        load(page);open_settings(page)
        assert page.locator('[data-stage]').count() == len(SCENES)
        assert page.locator('.stage-choice span').all_text_contents() == [s['name'] for s in SCENES]
        for category, count in [('校园', 5), ('练习室', 2), ('街景', 2), ('其他', 6), ('all', 15)]:
            page.select_option('#stage-filter', category)
            assert page.locator('.stage-choice:visible').count() == count
        page.locator('#settings-dialog').screenshot(path=str(ART / 'stages-settings-desktop.png'))
        page.select_option('#mode', 'practice');start_match(page);page.clock.run_for(1800)
        fingerprints = []
        for i, scene in enumerate(SCENES):
            open_settings(page)
            page.evaluate('mygoGame.match.fighters[0].hp=137;mygoGame.match.fighters[0].energy=61')
            before = page.evaluate('JSON.stringify(mygoGame.match.fighters.map(f=>[f.character,f.hp,f.energy]))+mygoGame.match.remaining')
            page.click(f'[data-stage="{i}"]');page.clock.run_for(30)
            assert page.evaluate('mygoGame.match.paused')
            assert page.evaluate('JSON.stringify(mygoGame.match.fighters.map(f=>[f.character,f.hp,f.energy]))+mygoGame.match.remaining') == before
            assert page.evaluate(f'JSON.stringify(mygoGame.match.options.terrain)===JSON.stringify(MYGO_ASSETS.stages[{i}].terrain)')
            assert page.locator('.stage-choice[aria-pressed="true"]').count() == 1
            page.click('#close-settings');page.clock.run_for(50)
            assert not page.evaluate('mygoGame.match.paused')
            fingerprint = page.evaluate("""()=>{const c=document.querySelector('#game'),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return new Uint32Array(data.buffer).reduce((h,p)=>Math.imul(h^p,16777619)>>>0,2166136261);} """)
            fingerprints.append(fingerprint)
            if i >= 6:
                # Normal battlefield composition is recorded before inspecting the outer upper deck.
                page.evaluate("""()=>{const m=mygoGame.match;m.fighters.forEach((f,side)=>{f.x=side?680:280;f.y=m.floorHeight(f.x);f.vx=f.vy=0;});}""")
                page.clock.run_for(500)
                page.locator('#stage').screenshot(path=str(ART / ('stage-' + scene['id'] + '.png')))
                page.evaluate("""()=>{const m=mygoGame.match,p=m.options.terrain.platforms.reduce((a,b)=>a.height>b.height?a:b);Object.assign(m.fighters[0],{x:(p.left+p.right)/2,y:p.height,vx:0,vy:0});m.fighters[1].x=-600;}""")
                high = page.evaluate('mygoGame.match.fighters[0].y')
                page.keyboard.down('s');page.keyboard.press('w');page.clock.run_for(50);page.keyboard.up('s')
                page.clock.run_for(1100)
                assert page.evaluate('mygoGame.match.fighters[0].y') < high, scene['id']
                assert page.evaluate('mygoGame.match.grounded(mygoGame.match.fighters[0])'), scene['id']
            report['scenes'].append({'id': scene['id'], 'render_and_live_switch': 'pass', 'upper_deck_drop': 'pass' if i >= 6 else 'existing'})
        assert len(set(fingerprints)) == len(SCENES)
        open_settings(page);page.uncheck('#terrain-enabled');page.click('#close-settings');page.clock.run_for(1500)
        assert page.evaluate('mygoGame.match.options.terrain') is None
        assert page.evaluate('mygoGame.match.fighters[0].y') == 0
        open_settings(page);page.check('#terrain-enabled');page.click('#close-settings')
        page.click('#restart');page.clock.run_for(1800)
        assert page.evaluate('JSON.stringify(mygoGame.match.options.terrain)===JSON.stringify(MYGO_ASSETS.stages[14].terrain)')
        report['checks'] += ['15 distinct scenes', 'scene category filters', 'live switch retains HP/energy/time', 'terrain disable and restart']

        phone = browser.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        load(phone);open_settings(phone)
        for width, height in [(390, 844), (320, 640), (844, 390)]:
            phone.set_viewport_size({'width': width, 'height': height})
            phone.select_option('#stage-filter', '校园')
            for i in range(6, 11):
                card = phone.locator(f'[data-stage="{i}"]');card.tap();box = card.bounding_box()
                assert box and box['x'] >= 0 and box['x'] + box['width'] <= width + 1
                assert box['y'] >= 0 and box['y'] + box['height'] <= height + 1
            assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
            phone.locator('#settings-dialog').screenshot(path=str(ART / f'stages-settings-mobile-{width}.png'))
        phone.select_option('#stage-filter', '街景');phone.locator('[data-stage="13"]').tap()
        phone.select_option('#mode', 'practice');start_match(phone);phone.clock.run_for(1800)
        start_y = phone.evaluate('mygoGame.match.fighters[0].y')
        phone.locator('[data-key="KeyW"]').tap();phone.clock.run_for(150)
        assert phone.evaluate('mygoGame.match.fighters[0].y') > start_y
        phone.clock.run_for(1000)
        phone.locator('#stage').screenshot(path=str(ART / 'stage-sunshine-mobile.png'))
        report['checks'].append('mobile filters, all school cards and native touch jump')
        phone.close()
        assert not report['errors'], report['errors']
        assert not report['remote_requests'], report['remote_requests']
        report['status'] = 'pass'
    finally:
        (ART / 'school-stages-browser-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
        browser.close()
print(json.dumps(report, ensure_ascii=False))
