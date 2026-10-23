"""Offline victory cinematics, every roster member/form, automatic rounds and pause."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from ui_helpers import select_game_option, start_match

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'tests/artifacts'
report = {'errors': [], 'remote_requests': [], 'art': [], 'checks': []}


def load(page):
    page.on('pageerror', lambda e: report['errors'].append(str(e)))
    page.on('request', lambda r: report['remote_requests'].append(r.url) if r.url.startswith('http') else None)
    page.clock.install(time='2026-01-01T00:00:00Z')
    page.goto((ROOT / 'index.html').as_uri(), timeout=120000)
    page.wait_for_function('mygoGame.loaded')
    page.clock.pause_at('2026-01-01T00:01:00Z')
    select_game_option(page, '#mode', 'duel')


def begin(page, character=0):
    select_game_option(page, '#player-character', str(character))
    select_game_option(page, '#opponent-character', '1')
    start_match(page)
    page.clock.run_for(1800)


def ko(page, side=1, form='normal', final=False):
    page.evaluate('''({side,form,final})=>{const m=mygoGame.match; m.freeze=0;
      if(final)m.wins[1-side]=1;
      if(form==='stage')m.fighters[1-side].stageForm={ms:15000};
      if(form==='penguin')m.fighters[1-side].penguin={ms:15000};
      m.fighters[side].hp=0;m.endRound();}''', dict(side=side, form=form, final=final))
    page.clock.run_for(30)
    assert page.locator('#round-finish').is_visible()
    assert page.locator('#round-finish').get_attribute('data-stage') == 'ko'
    assert page.locator('#overlay').is_hidden()
    page.clock.run_for(1000)
    assert page.locator('#round-finish').get_attribute('data-stage') == 'art'
    assert page.locator('#overlay').is_hidden()


with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(viewport={'width': 1366, 'height': 768})
    try:
        load(page)
        for character in range(15):
            begin(page, character)
            forms = ['normal', 'penguin'] if character == 2 else ['normal', 'stage'] if 5 <= character < 10 else ['virtual'] if character >= 10 else ['normal']
            for form in forms:
                ko(page, form=form)
                assert page.locator('#round-finish').get_attribute('data-character') == str(character)
                assert page.locator('#round-finish').get_attribute('data-form') == form
                assert page.locator('#finish-name').inner_text() == page.evaluate(f'MygoFighter.ROSTER[{character}].name')
                assert page.locator('#finish-move').inner_text()
                pixels = page.evaluate('''()=>{const c=document.querySelector('#finish-art'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>100)n++;return n;}''')
                assert pixels > 10000, (character, form, pixels)
                if character == 1:
                    assert page.evaluate('''async()=>{const im=new Image();im.src=MYGO_ASSETS.soyoFinishArt;await im.decode();
                      const c=document.querySelector('#finish-art'),r=document.createElement('canvas');
                      r.width=im.naturalWidth;r.height=im.naturalHeight;r.getContext('2d').drawImage(im,0,0);
                      return c.width===852&&c.height===480&&c.toDataURL()===r.toDataURL();}'''), 'Soyo must show the actual Haruhikage video still'
                elif character == 7:
                    assert page.evaluate('''async()=>{const im=new Image();im.src=MYGO_ASSETS.uikaFinishArt;await im.decode();
                      const c=document.querySelector('#finish-art'),r=document.createElement('canvas');
                      r.width=im.naturalWidth;r.height=im.naturalHeight;r.getContext('2d').drawImage(im,0,0);
                      return c.width===240&&c.height===160&&c.toDataURL()===r.toDataURL();}'''), 'Uika must show the crawling frame from her super video'
                else:
                    assert page.locator('#finish-art').evaluate('(c)=>c.width===640&&c.height===640')
                report['art'].append({'character': character, 'form': form, 'opaque_pixels': pixels})
                if character in [0, 1, 7, 14]:
                    page.locator('#stage').screenshot(path=str(ART / f'round-finish-{character}-{form}.png'))
                if character == 0:
                    timer = page.evaluate('mygoGame.match.phaseMs')
                    page.click('#pause'); page.clock.run_for(5000)
                    assert page.evaluate('mygoGame.match.phaseMs') == timer
                    assert page.locator('#round-finish').is_hidden()
                    page.click('#pause');page.clock.run_for(30)
                    assert page.locator('#round-finish').is_visible()
                    page.click('#home'); timer = page.evaluate('mygoGame.match.phaseMs')
                    page.clock.run_for(5000)
                    assert page.evaluate('mygoGame.match.phaseMs') == timer
                    page.click('#menu-resume'); page.clock.run_for(30)
                    assert page.locator('#round-finish').is_visible()
                    report['checks'].append('pause and menu freeze/resume cinematic')
                page.clock.run_for(3400)
                assert page.evaluate('mygoGame.match.phase') == ('finished' if len(forms) == 2 and form == forms[1] else 'fighting')
                assert page.locator('#round-finish').is_hidden()
        report['checks'].append('all 15 characters and 6 transformations render offline')
        begin(page, 1); ko(page, side=0, final=True)
        assert page.locator('#finish-side').inner_text().startswith('2P')
        page.clock.run_for(3300)
        assert page.locator('#overlay').is_visible()
        assert '获胜' in page.locator('#overlay-title').inner_text()
        page.clock.run_for(6000);assert page.evaluate('mygoGame.match.phase') == 'finished'
        report['checks'].append('final result waits for cinematic, no automatic new match')
        begin(page)
        page.evaluate('mygoGame.match.remaining=0;mygoGame.match.endRound()')
        page.clock.run_for(1000)
        assert page.locator('#round-finish').get_attribute('data-character') == 'draw'
        assert page.locator('#finish-verdict').inner_text() == '平 局'
        page.clock.run_for(3400)
        assert page.evaluate('mygoGame.match.phase') == 'fighting'
        assert page.evaluate('mygoGame.match.wins') == [0, 0]
        report['checks'].append('timeout draw automatically replays')
        # Both outcomes of a 3v3 bout preview the correct replacement and survivor resources.
        teams = [[0, 6, 10], [1, 7, 12]]
        select_game_option(page, '#match-format', '3v3'); start_match(page, teams)
        page.clock.run_for(1800)
        for loser in [1, 0]:
            page.evaluate('''loser=>{const m=mygoGame.match;m.freeze=0;m.fighters[1-loser].hp=137;m.fighters[1-loser].energy=44;}''', loser)
            ko(page, side=loser)
            assert page.locator('#finish-nextup').is_hidden(), 'lineup should wait for the closing beat'
            page.clock.run_for(1750)
            assert page.locator('#round-finish').get_attribute('data-stage') == 'settle'
            assert page.locator('#finish-nextup').is_visible()
            expected = page.evaluate('''()=>mygoGame.match.teams.map((team,side)=>MygoFighter.ROSTER[team[mygoGame.match.teamIndices[side]]].name)''')
            for side in [0, 1]:
                assert page.locator(f'#finish-contender-{side}').inner_text() == expected[side]
                assert page.locator(f'#finish-portrait-{side}').evaluate('(img)=>img.complete&&img.naturalWidth>0')
            assert '接力登场' in page.locator(f'#finish-entry-{loser}').inner_text()
            assert '生命 200 / 共鸣 0' == page.locator(f'#finish-resources-{loser}').inner_text()
            assert '继续迎战' in page.locator(f'#finish-entry-{1-loser}').inner_text()
            assert '生命 137 / 共鸣 44' == page.locator(f'#finish-resources-{1-loser}').inner_text()
            page.locator('#stage').screenshot(path=str(ART / f'round-finish-nextup-{loser}.png'))
            page.click('#pause'); timer = page.evaluate('mygoGame.match.phaseMs')
            page.clock.run_for(2500); assert page.evaluate('mygoGame.match.phaseMs') == timer
            page.click('#overlay-action'); page.clock.run_for(30)
            assert page.locator('#finish-nextup').is_visible()
            page.evaluate('mygoGame.match.advance(mygoGame.match.phaseMs-100)'); page.clock.run_for(20)
            assert page.locator('#round-curtain').is_visible()
            page.clock.run_for(120)
            assert page.evaluate('mygoGame.match.phase') == 'ready'
            assert page.locator('#round-curtain').is_visible()
            page.clock.run_for(300)
            assert page.locator('#round-curtain').is_hidden()
            page.clock.run_for(1000)
            assert page.evaluate('mygoGame.match.phase') == 'fighting'
        page.evaluate('''()=>{const m=mygoGame.match;m.teamIndices=[2,2];m.fighters.forEach(f=>f.hp=0);m.endRound();}''')
        page.clock.run_for(2800)
        assert page.locator('#finish-nextup').is_hidden()
        page.clock.run_for(600)
        assert page.locator('#overlay').is_visible()
        report['checks'].append('3v3 replacement/survivor lineup, pause and concealed round reset; final double KO')
        for width, height in [(390, 844), (844, 390)]:
            mobile = browser.new_page(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True, reduced_motion='reduce')
            load(mobile);begin(mobile, 1);ko(mobile)
            bounds = mobile.evaluate('''()=>{const p=document.querySelector('#round-finish').getBoundingClientRect();return ['finish-name','finish-move','finish-verdict','finish-score','finish-next'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,ok:r.left>=p.left&&r.right<=p.right&&r.top>=p.top&&r.bottom<=p.bottom};});}''')
            assert all(x['ok'] for x in bounds), bounds
            mobile.locator('#stage').screenshot(path=str(ART / f'round-finish-mobile-{width}.png'))
            mobile.clock.run_for(3400);assert mobile.evaluate('mygoGame.match.phase') == 'fighting'
            select_game_option(mobile, '#match-format', '3v3');start_match(mobile, [[0, 6, 10], [1, 7, 12]])
            mobile.clock.run_for(1800);ko(mobile);mobile.clock.run_for(1750)
            assert mobile.locator('#finish-nextup').is_visible()
            bounds = mobile.evaluate('''()=>{const p=document.querySelector('#finish-nextup').getBoundingClientRect();return [...document.querySelectorAll('.finish-contender strong,.finish-contender span')].map(e=>{const r=e.getBoundingClientRect();return r.left>=p.left&&r.right<=p.right&&r.top>=p.top&&r.bottom<=p.bottom;});}''')
            assert all(bounds), bounds
            mobile.locator('#stage').screenshot(path=str(ART / f'round-finish-nextup-mobile-{width}.png'))
            mobile.close()
        report['checks'].append('mobile portrait/landscape and reduced motion')
        assert not report['errors'], report['errors']
        assert not report['remote_requests'], report['remote_requests']
    finally:
        (ART / 'round-finish-browser-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
        browser.close()
print(json.dumps(report, ensure_ascii=False, indent=2))
