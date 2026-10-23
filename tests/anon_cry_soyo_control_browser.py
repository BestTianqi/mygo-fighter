"""Exercise the cry recording, radial control and independently playing Soyo P."""
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

        def wait(expression, timeout=30):
            end = time.monotonic() + timeout
            while time.monotonic() < end:
                if page.evaluate(expression):
                    return
                time.sleep(.025)
            raise AssertionError(expression)

        def configure(character, opponent):
            select_game_option(page, '#player-character', str(character))
            select_game_option(page, '#opponent-character', str(opponent))
            select_game_option(page, '#mode', 'duel');page.uncheck('#terrain-enabled')
            start_match(page)
            wait(f'document.querySelector("#loading").hidden&&mygoGame.match.fighters[0].character==={character}')
            page.clock.run_for(1800)
            page.evaluate('''()=>{const m=mygoGame.match;m.fighters.forEach((f,i)=>{f.x=i?650:400;f.energy=100;});
              const drain=m.drainEvents;m.drainEvents=function(){const e=drain.call(this);memeProbe.events.push(...e);return e;};memeProbe.clear();}''')
            page.locator('#stage').focus()

        try:
            configure(0, 1);set_game_sound(page, True)
            wait('document.querySelector("#sound").getAttribute("aria-pressed")==="true"')
            page.keyboard.down('a');page.keyboard.press('u');page.keyboard.up('a');page.clock.run_for(60)
            assert page.evaluate('mygoGame.match.fighters[0].attack') == 'anonCry'
            assert page.evaluate('mygoGame.match.fighters[0].energy') == 80
            assert page.evaluate('memeProbe.starts.filter(s=>s.keys.includes("meme_0_cry")).length') == 1
            page.clock.run_for(200)
            assert page.evaluate('mygoGame.match.waves.some(w=>w.attack==="anonCry"&&w.vx>0)')
            page.locator('#stage').screenshot(path=str(ART / 'anon-cry-forward-wave.png'))
            page.clock.run_for(900)
            assert page.evaluate('mygoGame.match.fighters[1].hp') < 200
            report['physical_back_U_original_cry_forward_wave_damage'] = 'pass'

            configure(1, 0)
            page.keyboard.press('p');page.clock.run_for(60)
            # Move the enemy behind the casting direction; its location is held there until control.
            page.evaluate('mygoGame.match.fighters[1].x=250')
            page.clock.run_for(1150)
            state = page.evaluate('''()=>{const m=mygoGame.match,[a,b]=m.fighters;return {attack:a.attack,effect:a.soyoSuper,hp:b.hp,hardStun:b.hardStun,x:b.x,y:b.y};}''')
            assert state['effect']['released'] and state['attack'] is None, state
            assert state['hp'] == 200 and state['hardStun'] > 0, state
            assert page.locator('#soyo-cutin-0').is_visible()
            assert page.evaluate('memeProbe.starts.filter(s=>s.keys.includes("soyoSuper")).length') == 1
            page.locator('#stage').screenshot(path=str(ART / 'soyo-radial-control-behind.png'))
            report['radial_wave_hits_behind_without_damage_and_releases_caster'] = state

            # Actual input can move Soyo while the enemy's attempted move/jump/P stay locked.
            x = page.evaluate('mygoGame.match.fighters[0].x')
            for key in ['ArrowRight', 'ArrowUp', 'Numpad3', 'Numpad8']:
                page.keyboard.down(key)
            page.keyboard.down('d');page.clock.run_for(200);page.keyboard.up('d')
            for key in ['ArrowRight', 'ArrowUp', 'Numpad3', 'Numpad8']:
                page.keyboard.up(key)
            assert page.evaluate('mygoGame.match.fighters[0].x') > x + 50
            locked = page.evaluate('({x:mygoGame.match.fighters[1].x,y:mygoGame.match.fighters[1].y,attack:mygoGame.match.fighters[1].attack,hardStun:mygoGame.match.fighters[1].hardStun})')
            assert locked['x'] == state['x'] and locked['y'] == state['y'] and locked['attack'] is None and locked['hardStun'] > 0, locked

            page.evaluate('mygoGame.match.fighters[0].x=mygoGame.match.fighters[1].x+100;mygoGame.match.fighters[0].energy=100')
            page.keyboard.press('i');page.clock.run_for(220)
            assert page.evaluate('mygoGame.match.fighters[0].attack') == 'wave'
            assert page.locator('#soyo-cutin-0').is_visible()
            assert not page.evaluate('memeProbe.stops.some(s=>s.keys.includes("soyoSuper"))'), 'follow-up skill stopped the P voice'
            page.clock.run_for(120)
            assert page.evaluate('mygoGame.match.fighters[1].hp') < 200
            assert page.evaluate('mygoGame.match.fighters[1].hardStun') > 1000, 'follow-up shortened 2s control'
            report['free_movement_and_skill_while_full_hard_control_and_P_media_continue'] = 'pass'

            page.click('#pause');frozen=page.evaluate('JSON.stringify(mygoGame.match.fighters)')
            page.clock.run_for(2000);assert page.evaluate('JSON.stringify(mygoGame.match.fighters)') == frozen
            page.click('#pause');page.clock.run_for(2500)
            assert page.evaluate('mygoGame.match.fighters[1].hardStun') == 0
            assert page.evaluate('mygoGame.match.fighters[0].soyoSuper') is None
            assert not page.locator('#soyo-cutin-0').is_visible()
            report['pause_control_resume_and_end_cleanup'] = 'pass'

            configure(1, 1)
            page.keyboard.press('p');page.keyboard.press('Numpad8');page.clock.run_for(60)
            assert all(page.locator(f'#soyo-cutin-{side}').is_visible() for side in [0, 1])
            page.click('#restart');page.clock.run_for(1800)
            assert page.evaluate('mygoGame.match.fighters.every(f=>f.soyoSuper===null&&f.hardStun===0)')
            assert all(not page.locator(f'#soyo-cutin-{side}').is_visible() for side in [0, 1])
            report['two_players_and_restart_cleanup'] = 'pass'
            assert not report['errors'] and not report['remote_requests'] and not report['failed_requests'], report
            report['status'] = 'pass'
        except Exception as error:
            report.update(status='fail', failure=str(error));page.screenshot(path=str(ART / 'cry-control-failure.png'))
            raise
        finally:
            (ART / 'cry-control-browser-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
            browser.close();print(json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    main()
