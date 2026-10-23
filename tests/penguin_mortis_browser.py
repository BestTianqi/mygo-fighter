"""Actual form-specific controls, five radial waves, recorded singing and Mortis effects."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from ui_helpers import select_game_option, start_match, set_game_sound
from meme_skills_browser import PROBE

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'tests/artifacts'
report = {'errors': [], 'remote_requests': [], 'checks': []}


def load(page):
    page.add_init_script(PROBE)
    page.on('pageerror', lambda e: report['errors'].append(str(e)))
    page.on('request', lambda r: report['remote_requests'].append(r.url) if r.url.startswith('http') else None)
    page.clock.install(time='2026-01-01T00:00:00Z')
    page.goto((ROOT / 'index.html').as_uri(), timeout=120000)
    page.wait_for_function('mygoGame.loaded')
    page.clock.pause_at('2026-01-01T00:01:00Z')


def begin(page, character):
    select_game_option(page, '#mode', 'duel')
    select_game_option(page, '#player-character', str(character))
    select_game_option(page, '#opponent-character', '0')
    page.uncheck('#terrain-enabled');start_match(page);page.clock.run_for(1800)
    page.evaluate('''()=>{const m=mygoGame.match;m.freeze=0;m.fighters[0].x=480;m.fighters[1].x=700;
      m.fighters.forEach(f=>{f.energy=100;f.hp=200;});
      const drain=m.drainEvents.bind(m);m.drainEvents=()=>{const es=drain();memeProbe.events.push(...es);return es;};memeProbe.clear();}''')
    page.locator('#stage').focus()


def transform(page):
    page.keyboard.press('h');page.clock.run_for(50)
    page.evaluate('mygoGame.match.fighters[0].energy=100;memeProbe.clear()')


with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(viewport={'width': 1366, 'height': 768})
    try:
        load(page);begin(page, 2)
        page.click('#moves');normal = page.locator('#moves-content').inner_text();page.click('#close-moves');page.clock.run_for(30)
        assert '诗句回声' in normal and '司凤版' not in normal and '糖哭' not in normal
        transform(page)
        page.click('#moves');penguin = page.locator('#moves-content').inner_text();page.click('#close-moves');page.clock.run_for(30)
        assert all(name not in penguin for name in ['诗句回声','微光音符','迷途之歌','一辈子乐队','凑企鹅变身'])
        assert all(name in penguin for name in ['糖哭','当面震慑','冲撞三连','司凤版春日影','每层10伤害'])
        assert page.locator('[data-key="KeyH"]').is_hidden()
        page.keyboard.press('p');page.clock.run_for(900)
        clip = page.evaluate('memeProbe.decoded.find(x=>x.keys.includes("meme_2_penguin_p"))')
        assert 8.0 < clip['duration'] < 8.3 and clip['rms'] > .02
        assert len(page.evaluate('memeProbe.starts.filter(x=>x.keys.includes("meme_2_penguin_p"))')) == 1
        assert page.evaluate('mygoGame.match.waves.every(w=>w.radial&&w.x===480&&w.y===100)')
        assert page.locator('#meme-cutin-0 video').get_attribute('src') == page.evaluate('MYGO_ASSETS.memeSkills[2].variants.penguinSuper.video')
        assert page.locator('#meme-cutin-0 video').evaluate('(v)=>v.muted')
        page.clock.run_for(1600)
        page.locator('#stage').screenshot(path=str(ART / 'penguin-sifeng-radial.png'))
        page.click('#pause');before=page.evaluate('JSON.stringify(mygoGame.match.waves)')
        page.clock.run_for(3000);assert page.evaluate('JSON.stringify(mygoGame.match.waves)') == before
        page.click('#pause');page.clock.run_for(10000)
        hits = page.evaluate('memeProbe.events.filter(e=>e.type==="hit"&&e.attack==="penguinSuper")')
        assert [h['damage'] for h in hits] == [10] * 5
        assert page.evaluate('mygoGame.match.fighters[1].hp') == 150
        assert page.evaluate('memeProbe.starts.filter(x=>x.keys.includes("meme_2_penguin_p")).length') == 2, 'Only pause/resume may restart the source'
        report['checks'].append('isolated form controls, unchanged penguin cutin, real Sifeng audio, five 10-damage circles and pause')

        begin(page, 2);transform(page);set_game_sound(page, False)
        page.evaluate('memeProbe.clear()');page.keyboard.press('p');page.clock.run_for(500)
        assert page.evaluate('memeProbe.starts.length') == 0
        page.click('#restart');page.clock.run_for(1800)
        assert not page.evaluate('mygoGame.match.fighters[0].penguin')
        assert '微光音符' in page.locator('[data-key="KeyI"]').inner_text()
        report['checks'].append('mute and restart restore the native kit and clear radial waves')

        begin(page, 8);transform(page);set_game_sound(page, True)
        page.click('#moves');moves=page.locator('#moves-content').inner_text();page.click('#close-moves');page.clock.run_for(30)
        assert all(name in moves for name in ['替身代演','装死反击','牵线留人','双生剧场'])
        page.keyboard.press('u');page.clock.run_for(300)
        page.locator('#stage').screenshot(path=str(ART / 'mortis-substitute-double.png'))
        page.clock.run_for(1300)
        assert len(page.evaluate('memeProbe.events.filter(e=>e.type==="hit"&&e.attack==="mujica_8_stage_u")')) == 2
        page.evaluate('''()=>{const [a,b]=mygoGame.match.fighters;a.x=480;b.x=700;b.hp=200;b.stun=b.cooldown=0;b.pushVx=0;a.energy=100;}''')
        page.keyboard.press('o');page.clock.run_for(220)
        assert page.evaluate('mygoGame.match.areas.length') == 1
        page.locator('#stage').screenshot(path=str(ART / 'mortis-snare-warning.png'))
        page.clock.run_for(1200)
        assert page.evaluate('mygoGame.match.fighters[1].x') < 700
        page.evaluate('''()=>{const [a,b]=mygoGame.match.fighters;a.x=480;b.x=700;b.hp=200;b.stun=b.cooldown=0;b.pushVx=0;a.energy=100;memeProbe.clear();}''')
        page.keyboard.press('p');page.clock.run_for(800)
        assert page.evaluate('mygoGame.match.fighters[0].attack') == 'mujica_8_stage_super'
        assert page.evaluate('memeProbe.starts.some(x=>x.keys.includes("meme_8_stage_p"))')
        assert page.locator('#meme-cutin-0 video').get_attribute('src') == page.evaluate('MYGO_ASSETS.memeSkills[8].variants.mujica_8_stage_super.video')
        page.locator('#stage').screenshot(path=str(ART / 'mortis-twin-theater.png'))
        page.clock.run_for(10500)
        assert len(page.evaluate('memeProbe.events.filter(e=>e.type==="hit"&&e.attack==="mujica_8_stage_super")')) == 3
        report['checks'].append('Mortis double, delayed snare, three-act theater, dedicated recorded speech and visual effects')

        for width,height in [(390,844),(844,390)]:
            phone=browser.new_page(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,reduced_motion='reduce')
            load(phone);begin(phone,2)
            phone.locator('[data-key="KeyH"]').tap();phone.clock.run_for(60)
            phone.evaluate('mygoGame.match.fighters[0].energy=100')
            phone.locator('[data-key="KeyP"]').tap();phone.clock.run_for(2500)
            assert phone.evaluate('mygoGame.match.waves.some(w=>w.radial)')
            assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
            phone.locator('#stage').screenshot(path=str(ART / f'penguin-sifeng-mobile-{width}.png'))
            begin(phone,8);phone.locator('[data-key="KeyH"]').tap();phone.clock.run_for(60)
            phone.evaluate('mygoGame.match.fighters[0].energy=100')
            assert '牵线留人' in phone.locator('[data-key="KeyO"]').inner_text()
            phone.locator('[data-key="KeyO"]').tap();phone.clock.run_for(230)
            assert phone.evaluate('mygoGame.match.areas.length') == 1
            phone.locator('#stage').screenshot(path=str(ART / f'mortis-snare-mobile-{width}.png'))
            phone.close()
        assert not report['errors'], report['errors']
        assert not report['remote_requests'], report['remote_requests']
    finally:
        (ART / 'penguin-mortis-browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
        browser.close()
print(json.dumps(report,ensure_ascii=False,indent=2))
