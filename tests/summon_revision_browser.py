"""Real offline playback of Anon's own laugh and three destructible familiars."""
import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright
from ui_helpers import select_game_option, start_match, set_game_sound
from meme_skills_browser import PROBE

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'tests/artifacts'


def main():
    report = {'errors': [], 'remote_requests': [], 'failed_requests': []}
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)
        page = browser.new_page(viewport={'width': 1366, 'height': 768})
        page.add_init_script(PROBE)
        page.on('pageerror', lambda e: report['errors'].append(str(e)))
        page.on('request', lambda r: report['remote_requests'].append(r.url) if r.url.startswith(('http:', 'https:')) else None)
        page.on('requestfailed', lambda r: report['failed_requests'].append(r.url[:100]))
        page.clock.install(time='2026-01-01T00:00:00Z')
        page.goto((ROOT / 'index.html').as_uri(), timeout=120000)
        page.wait_for_function('mygoGame.loaded')
        page.clock.pause_at('2026-01-01T00:01:00Z')

        def real_wait(expression, timeout=30):
            deadline = time.monotonic() + timeout
            while time.monotonic() < deadline:
                if page.evaluate(expression):
                    return
                time.sleep(.025)
            raise AssertionError('Timed out: ' + expression)

        def configure(character, opponent):
            select_game_option(page, '#player-character', str(character))
            select_game_option(page, '#opponent-character', str(opponent))
            select_game_option(page, '#mode', 'duel')
            page.uncheck('#terrain-enabled')
            start_match(page)
            real_wait(f'document.querySelector("#loading").hidden&&mygoGame.match.fighters[0].character==={character}')
            page.clock.run_for(1800)
            page.evaluate('''()=>{const m=mygoGame.match;m.fighters.forEach((f,i)=>{f.energy=100;f.x=i?1200:300;});
              const drain=m.drainEvents;m.drainEvents=function(){const e=drain.call(this);memeProbe.events.push(...e);return e;};memeProbe.clear();}''')
            page.locator('#stage').focus()

        def calls():
            return page.evaluate('memeProbe.starts.filter(s=>s.keys.includes("tensoraOhYeah"))')

        try:
            configure(0, 1)
            set_game_sound(page, True)
            real_wait('document.querySelector("#sound").getAttribute("aria-pressed")==="true"')
            assert page.evaluate('MYGO_ASSETS.memeSkills[0].slots.p.label') == '千早爱音唐笑'
            page.keyboard.press('p');page.clock.run_for(120)
            assert page.evaluate('memeProbe.starts.filter(s=>s.keys.includes("meme_0_p")).length') == 1
            assert page.locator('#meme-cutin-0').is_visible()
            report['anon_original_laugh_and_matching_movie'] = 'pass'

            configure(1, 1)
            page.keyboard.press('u');page.clock.run_for(350)
            assert page.evaluate('mygoGame.match.fighters[0].summons.units.map(p=>p.hp)') == [20, 20, 20]
            assert len(calls()) == 1
            page.clock.run_for(1100);assert len(calls()) == 2
            page.evaluate('mygoGame.match.fighters[0].energy=100')
            page.keyboard.press('p');page.clock.run_for(140)
            assert page.locator('#soyo-cutin-0').is_visible()
            assert page.evaluate('memeProbe.starts.some(s=>s.keys.includes("soyoSuper"))')
            page.clock.run_for(1150)
            assert len(calls()) == 3, calls()
            ids = [c['id'] for c in calls()]
            assert len(set(ids)) == 3
            assert not page.evaluate('ids=>memeProbe.stops.some(s=>ids.includes(s.id))', ids), 'Soyo P interrupted her familiars'
            page.locator('#stage').screenshot(path=str(ART / 'tensora-20hp-three-calls.png'))
            report['three_original_ohyeah_sources_independent_of_soyo_P'] = 'pass'

            # A real travelling note damages the familiar, then another finishes it.
            page.evaluate('''()=>{const m=mygoGame.match;m.freeze=0;m.fighters.forEach(f=>{f.attack=null;f.stun=0;});
              const [a,b]=m.fighters;a.x=100;b.x=800;const u=a.summons.units;u.forEach((p,i)=>{p.x=500+i*100;p.y=0;p.phase='follow';p.cooldown=9000;});
              m.waves.push({x:495,y:35,vx:100,owner:1,life:200,age:0,rx:20,ry:12,attack:'tomoriNote'});}''')
            page.clock.run_for(40)
            hits = page.evaluate('memeProbe.events.filter(e=>e.type==="minionHit")')
            assert hits and hits[-1]['hp'] < 20 and hits[-1]['hp'] > 0, hits
            report['actual_projectile_damages_minion'] = hits[-1]
            page.evaluate('''()=>{const m=mygoGame.match,p=m.fighters[0].summons.units.find(p=>p.id===0);m.waves.push({x:p.x,y:p.y+35,vx:0,owner:1,life:100,age:0,rx:20,ry:12,attack:'super'});}''')
            page.clock.run_for(50)
            assert page.evaluate('mygoGame.match.fighters[0].summons.units.length') == 2
            assert '×2' in page.locator('#special1').inner_text()
            assert page.evaluate('id=>!memeProbe.active.has(id)', ids[0]), 'defeated familiar voice kept playing'
            page.locator('#stage').screenshot(path=str(ART / 'tensora-defeated-remaining-two.png'))
            report['defeated_unit_disappears_and_count_updates'] = 'pass'

            configure(1, 1)
            page.keyboard.press('u');page.clock.run_for(350)
            page.evaluate('''()=>{const m=mygoGame.match,[a,b]=m.fighters;a.x=300;b.x=390;
              a.summons.units.forEach(p=>{p.x=p.id===2?352:-200-p.id*100;p.y=8;p.cooldown=9000;p.phase='follow';});}''')
            page.keyboard.press('Numpad1');page.clock.run_for(250)
            assert page.evaluate('memeProbe.events.some(e=>e.type==="minionHit"&&e.side===1&&e.unit===2&&e.hp<20)'), 'physical J did not hurt the familiar'
            report['physical_P2_J_damages_hostile_familiar'] = 'pass'

            # A fresh group pauses calls and actual AudioBuffers; resume from offsets.
            configure(1, 1)
            page.keyboard.press('u');page.clock.run_for(350)
            time.sleep(.08)
            page.click('#pause')
            frozen = page.evaluate('JSON.stringify(mygoGame.match.fighters)')
            page.clock.run_for(3000)
            assert page.evaluate('JSON.stringify(mygoGame.match.fighters)') == frozen
            assert len(calls()) == 1
            page.click('#pause');page.clock.run_for(2600)
            original_calls = [s for s in calls() if s['offset'] == 0]
            assert len(original_calls) == 3
            assert any(s['offset'] > 0 for s in calls()), calls()
            report['pause_freezes_pending_calls_and_resumes_recording'] = 'pass'

            configure(1, 1)
            page.keyboard.press('u');page.keyboard.press('Numpad4');page.clock.run_for(2600)
            assert len([s for s in calls() if s['offset'] == 0]) == 6
            assert all(page.evaluate('mygoGame.match.fighters.map(f=>f.summons.units.length)'))
            page.click('#sound')
            assert page.evaluate('document.querySelector("#sound").getAttribute("aria-pressed")') == 'false'
            page.click('#restart');page.clock.run_for(1800)
            assert page.evaluate('mygoGame.match.fighters.every(f=>f.summons===null)')
            report['two_players_six_calls_mute_and_restart'] = 'pass'
            assert not report['errors'] and not report['remote_requests'] and not report['failed_requests'], report
            report['status'] = 'pass'
        except Exception as error:
            report.update(status='fail', failure=str(error))
            page.screenshot(path=str(ART / 'summon-revision-failure.png'))
            raise
        finally:
            (ART / 'summon-revision-browser-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
            browser.close()
            print(json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    main()
