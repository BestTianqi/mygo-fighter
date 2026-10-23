"""Configure a fight entirely during character selection, offline and on touch screens."""
import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright
from ui_helpers import finish_character_selection, set_game_sound

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'tests/artifacts'
report = {'errors': [], 'remote_requests': [], 'checks': [], 'mobile': []}


def load(page):
    page.on('pageerror', lambda e: report['errors'].append(str(e)))
    page.on('request', lambda r: report['remote_requests'].append(r.url) if r.url.startswith('http') else None)
    page.add_init_script('''window.setupAudio={contexts:[],decoded:0,starts:0};
      const decode=AudioContext.prototype.decodeAudioData,create=AudioContext.prototype.createBufferSource;
      AudioContext.prototype.decodeAudioData=function(bytes){
        if(!setupAudio.contexts.includes(this))setupAudio.contexts.push(this);
        return decode.call(this,bytes).then(buffer=>{setupAudio.decoded++;return buffer;});};
      AudioContext.prototype.createBufferSource=function(){const s=create.call(this),start=s.start;
        s.start=function(...args){setupAudio.starts++;return start.apply(this,args);};return s;};''')
    page.clock.install(time='2026-01-01T00:00:00Z')
    page.goto((ROOT / 'index.html').as_uri(), timeout=120000)
    page.wait_for_function('mygoGame.loaded')
    page.clock.pause_at('2026-01-01T00:01:00Z')


def finish(page, teams=None):
    finish_character_selection(page, teams or [[0], [1]])
    page.clock.run_for(1800)
    assert page.evaluate('mygoGame.match.phase') == 'fighting'


def settings(page):
    return page.evaluate('mygoGame.selection.settings')


with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(viewport={'width': 1366, 'height': 1000})
    try:
        load(page)
        assert page.evaluate('setupAudio.decoded') == 0, 'No autoplay before the user starts'
        page.click('#menu-start')
        assert page.locator('#selection-sound').is_checked()
        assert page.locator('[data-selection-stage]').count() == 15
        assert page.locator('#selection-stage-prev').is_disabled()
        page.click('#selection-stage-next');page.clock.run_for(500)
        assert page.locator('#selection-stage-choices').evaluate('(e)=>e.scrollLeft>100')
        page.click('#selection-stage-prev');page.clock.run_for(500)
        page.click('[data-selection-stage="6"]');page.select_option('#selection-difficulty', '2')
        page.locator('#character-select').screenshot(path=str(ART / 'selection-settings-desktop.png'))
        finish(page)
        assert page.evaluate('mygoGame.match.options.difficulty') == 2
        assert page.evaluate('JSON.stringify(mygoGame.match.options.terrain)===JSON.stringify(MYGO_ASSETS.stages[6].terrain)')
        assert page.evaluate('setupAudio.decoded') == 79
        assert page.evaluate('setupAudio.contexts.every(c=>c.state==="running")')
        assert page.locator('#sound').get_attribute('aria-pressed') == 'true'
        page.evaluate('mygoGame.match.fighters[0].energy=100')
        page.locator('#stage').focus();page.keyboard.press('p');page.clock.run_for(50)
        assert page.evaluate('setupAudio.starts') > 0, 'Default-on must actually play recorded audio'
        report['checks'].append('default sound unlocks from Start and plays recordings; map and difficulty applied')

        page.evaluate('mygoGame.match.fighters[0].hp=137')
        page.click('#home');page.click('#menu-start')
        assert settings(page)['arena'] == 6
        page.click('[data-selection-stage="13"]');page.select_option('#selection-difficulty', '0')
        page.uncheck('#selection-sound');page.uncheck('#selection-terrain')
        page.select_option('#selection-mode', 'duel')
        assert page.locator('#selection-difficulty').is_disabled()
        page.select_option('#selection-mode', 'cpu')
        assert settings(page) == dict(arena=13, difficulty=0, sound=False, terrain=False, dummy='idle')
        page.click('#selection-back');page.click('#menu-resume');page.clock.run_for(30)
        assert page.evaluate('mygoGame.match.fighters[0].hp') == 137
        assert page.evaluate('mygoGame.match.options.difficulty') == 2
        assert page.evaluate('JSON.stringify(mygoGame.match.options.terrain)===JSON.stringify(MYGO_ASSETS.stages[6].terrain)')
        assert page.locator('#sound').get_attribute('aria-pressed') == 'true'
        report['checks'].append('cancel discards draft settings and preserves paused fight and sound')

        page.click('#home');page.click('#menu-start')
        assert settings(page)['arena'] == 6 and settings(page)['sound']
        page.click('[data-selection-stage="13"]');page.select_option('#selection-difficulty', '0')
        page.uncheck('#selection-sound');page.uncheck('#selection-terrain');finish(page)
        assert page.evaluate('mygoGame.match.options.terrain') is None
        assert page.evaluate('mygoGame.match.options.difficulty') == 0
        assert page.locator('#sound').get_attribute('aria-pressed') == 'false'
        page.evaluate('setupAudio.starts=0;mygoGame.match.fighters[0].energy=100')
        page.locator('#stage').focus();page.keyboard.press('p');page.clock.run_for(100)
        assert page.evaluate('setupAudio.starts') == 0
        page.click('#restart');page.clock.run_for(1800)
        assert page.evaluate('mygoGame.match.options.terrain') is None
        assert page.evaluate('mygoGame.match.options.difficulty') == 0
        assert page.locator('#sound').get_attribute('aria-pressed') == 'false'
        page.click('#settings')
        assert page.locator('[data-stage="13"]').get_attribute('aria-pressed') == 'true'
        assert page.locator('#difficulty').input_value() == '0'
        assert not page.locator('#terrain-enabled').is_checked()
        page.click('[data-stage="9"]');page.check('#terrain-enabled');page.select_option('#difficulty', '2')
        page.click('#close-settings');page.click('#home');page.click('#menu-team')
        assert settings(page)['arena'] == 9 and settings(page)['terrain'] and settings(page)['difficulty'] == 2
        page.click('[data-selection-stage="12"]')
        finish(page, [[0, 1, 2], [3, 4, 0]])
        assert page.evaluate('mygoGame.match.isTeamBattle')
        assert page.evaluate('JSON.stringify(mygoGame.match.options.terrain)===JSON.stringify(MYGO_ASSETS.stages[12].terrain)')
        page.evaluate('mygoGame.match.fighters[1].hp=0;mygoGame.match.endRound()');page.clock.run_for(4400)
        assert page.evaluate('mygoGame.match.round') == 2
        assert page.evaluate('mygoGame.match.options.difficulty') == 2
        assert page.evaluate('JSON.stringify(mygoGame.match.options.terrain)===JSON.stringify(MYGO_ASSETS.stages[12].terrain)')
        report['checks'].append('mute, terrain off, restart, bidirectional settings sync and 3v3 next bout')

        set_game_sound(page, True)
        page.click('#home');page.click('#menu-practice')
        assert page.locator('#selection-sound').is_checked()
        assert page.locator('#selection-difficulty').is_disabled()
        assert page.locator('#selection-format').is_disabled()
        assert page.locator('#selection-practice-settings').is_visible()
        page.select_option('#selection-dummy', 'crouch')
        page.locator('[data-selection-stage="14"]').focus();page.keyboard.press('Space')
        assert settings(page)['arena'] == 14
        finish(page)
        assert page.evaluate('mygoGame.match.options.mode') == 'practice'
        assert page.evaluate('mygoGame.match.options.dummy') == 'crouch'
        assert page.locator('#timer').inner_text() == '∞'
        report['checks'].append('practice dummy, contextual controls, keyboard map selection and audio sync')

        for width, height in [(320, 640), (390, 844), (844, 390)]:
            phone = browser.new_page(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True)
            load(phone);phone.tap('#menu-start')
            phone.locator('[data-selection-stage="14"]').tap()
            assert phone.locator('#selection-stage-name').inner_text() == '大台阶·夜景'
            phone.select_option('#selection-difficulty', '0');phone.uncheck('#selection-sound');phone.uncheck('#selection-terrain')
            assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth'), width
            assert phone.locator('#selection-difficulty').bounding_box()['height'] >= 44
            phone.locator('#character-select').screenshot(path=str(ART / f'selection-settings-mobile-{width}.png'))
            finish(phone)
            assert phone.evaluate('mygoGame.match.options.difficulty') == 0
            assert phone.evaluate('mygoGame.match.options.terrain') is None
            assert phone.locator('#sound').get_attribute('aria-pressed') == 'false'
            report['mobile'].append(dict(width=width, height=height, touch_map_selection=True, no_overflow=True))
            phone.close()
        assert not report['errors'], report['errors']
        assert not report['remote_requests'], report['remote_requests']
    finally:
        (ART / 'selection-settings-browser-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
        browser.close()
print(json.dumps(report, ensure_ascii=False, indent=2))
