"""Exercise the refreshed lobby, portrait variants, customer call and full rematch flow offline."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from ui_helpers import finish_character_selection

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'tests/artifacts'
report = {'checks': [], 'errors': [], 'remote_requests': []}

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(viewport={'width': 1366, 'height': 900})
    page.on('pageerror', lambda error: report['errors'].append(str(error)))
    page.on('request', lambda request: report['remote_requests'].append(request.url) if request.url.startswith('http') else None)
    page.add_init_script('''window.voiceProbe={decoded:[],played:[]};
      const decode=AudioContext.prototype.decodeAudioData,create=AudioContext.prototype.createBufferSource;
      AudioContext.prototype.decodeAudioData=function(bytes){return decode.call(this,bytes).then(buffer=>{voiceProbe.decoded.push(buffer);return buffer})};
      AudioContext.prototype.createBufferSource=function(){const source=create.call(this),start=source.start;source.start=function(...args){voiceProbe.played.push({duration:this.buffer?.duration});return start.apply(this,args)};return source};''')
    page.clock.install(time='2026-01-01T00:00:00Z')
    try:
        page.goto((ROOT / 'index.html').as_uri(), timeout=120000)
        page.wait_for_function('mygoGame.loaded', timeout=60000)
        page.clock.pause_at('2026-01-01T00:01:00Z')
        for band in ['mygo', 'mujica', 'mewtype']:
            page.click(f'[data-menu-band="{band}"]')
            assert page.locator(f'[data-menu-band="{band}"]').get_attribute('aria-pressed') == 'true'
        page.click('[data-menu-band="mujica"]')
        page.screenshot(path=str(ART / 'refresh-menu-desktop.png'))
        page.click('#menu-duel')
        assert page.locator('#selection-confirm').is_disabled()
        for character in range(5, 10):
            page.locator(f'[data-character="{character}"]').focus()
            for form in ['normal', 'stage']:
                page.click(f'[data-preview-form="{form}"]')
                assert page.locator('#selection-spotlight').get_attribute('data-form') == form
                assert page.locator('#spotlight-image').evaluate('(im)=>im.complete&&im.naturalHeight>400')
                assert page.locator('#spotlight-skills dd').count() >= 4
                page.locator('#selection-spotlight').screenshot(path=str(ART / f'refresh-portrait-{character}-{form}.png'))
        assert page.locator('.selection-character').count() == 15
        assert page.locator('.selection-character').evaluate_all('(xs)=>xs.every(x=>Math.abs(x.clientWidth-x.clientHeight)<3)')
        report['checks'].append('15 square roster tiles, all ten new portraits and form-specific move previews')
        page.click('[data-character="6"]')
        page.click('[data-preview-form="normal"]')
        assert '客服' in page.locator('#spotlight-skills').inner_text()
        page.click('[data-selection-stage="6"]')
        page.screenshot(path=str(ART / 'refresh-selection-desktop.png'), full_page=True)
        finish_character_selection(page, [[6], [8]])
        page.clock.run_for(1800)
        assert page.evaluate('mygoGame.match.phase') == 'fighting'
        assert page.evaluate('voiceProbe.decoded.length') == 79
        page.evaluate('''()=>{const m=mygoGame.match;m.fighters.forEach((f,i)=>{f.x=i?700:300;f.y=0;f.energy=100});voiceProbe.played=[]}''')
        page.locator('#stage').focus(); page.keyboard.down('s'); page.keyboard.press('u'); page.keyboard.up('s')
        page.clock.run_for(190)
        assert page.evaluate('mygoGame.match.fighters[0].attack') == 'mujica_6_normal_customer'
        assert page.evaluate('mygoGame.match.fighters[0].energy') == 80
        assert page.evaluate('voiceProbe.played.some(p=>p.duration>1.65&&p.duration<1.8)')
        page.locator('#stage').screenshot(path=str(ART / 'refresh-sakiko-customer.png'))
        page.clock.run_for(1000)
        assert page.evaluate('mygoGame.match.fighters[1].hp') == 186
        assert page.evaluate('mygoGame.match.fighters[0].energy') == 82
        report['checks'].append('customer call: real voice, authored action, one 14-damage wave, 20 cost and +2 on hit')
        page.keyboard.press('h'); page.clock.run_for(1000)
        assert page.evaluate('!!mygoGame.match.fighters[0].stageForm')
        page.locator('#stage').screenshot(path=str(ART / 'refresh-battle-stage-form.png'))
        page.click('#pause'); page.clock.run_for(30); assert page.locator('#overlay-options').is_visible()
        hp = page.evaluate('mygoGame.match.fighters[0].hp')
        page.click('#overlay-reselect')
        assert page.evaluate('mygoGame.selection.teams') == [[6], [8]]
        page.click('#selection-back'); page.click('#menu-resume'); page.clock.run_for(30)
        assert page.evaluate('mygoGame.match.fighters[0].hp') == hp
        assert not page.evaluate('mygoGame.match.paused')
        report['checks'].append('pause/reselect/cancel/resume retains the suspended fight')
        page.evaluate('''()=>{const m=mygoGame.match;m.wins[0]=1;m.fighters[1].hp=0;m.endRound()}''')
        page.clock.run_for(1000); assert page.locator('#round-finish').is_visible()
        page.clock.run_for(5000); assert page.evaluate('mygoGame.match.phase') == 'finished'
        assert page.locator('#overlay-action').inner_text() == '原阵容再战'
        page.screenshot(path=str(ART / 'refresh-match-result.png'))
        page.click('#overlay-action'); page.wait_for_function('document.querySelector("#loading").hidden')
        page.clock.run_for(1800)
        assert page.evaluate('mygoGame.match.fighters.map(f=>f.character)') == [6, 8]
        assert page.evaluate('mygoGame.match.fighters.map(f=>f.hp)') == [200, 200]
        assert page.evaluate('mygoGame.match.phase') == 'fighting'
        report['checks'].append('original-speed victory sequence leads to direct rematch with the same fighters')
        page.click('#home'); page.click('#menu-team')
        finish_character_selection(page, [[5, 6, 7], [8, 9, 0]])
        page.clock.run_for(1800)
        page.evaluate('''()=>{const m=mygoGame.match;m.fighters[1].hp=0;m.endRound()}''')
        page.clock.run_for(6200)
        assert page.evaluate('mygoGame.match.fighters[1].character') == 9
        assert page.evaluate('mygoGame.match.phase') == 'fighting'
        report['checks'].append('3v3 still automatically advances to the next team member')
        for width, height in [(390, 844), (320, 720), (844, 390)]:
            page.set_viewport_size({'width': width, 'height': height})
            if page.locator('#home').is_visible(): page.click('#home')
            page.click('#menu-start')
            page.click('[data-character="6"]'); page.click('[data-preview-form="normal"]')
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            page.screenshot(path=str(ART / f'refresh-mobile-{width}.png'), full_page=True)
            page.click('[data-character="8"]'); page.locator('#selection-confirm').scroll_into_view_if_needed()
            assert page.locator('#selection-confirm').is_enabled()
            assert page.locator('#selection-confirm').evaluate('e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1}')
            page.click('#selection-back')
        report['checks'].append('320/390 portrait and 844 landscape: no horizontal overflow, reachable Start')
        assert not report['errors'], report['errors']
        assert not report['remote_requests'], report['remote_requests']
    except Exception:
        page.screenshot(path=str(ART / 'refresh-failure.png'), full_page=True)
        raise
    finally:
        (ART / 'presentation-refresh-browser-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
        browser.close()
print(json.dumps(report, ensure_ascii=False, indent=2))
