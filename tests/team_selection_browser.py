"""Offline character selection and complete 3v3 wheel battles with real controls."""
import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'tests/artifacts'


def main():
    report = {'errors': [], 'remote_requests': [], 'failed_requests': [], 'mobile': []}
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)

        def watch(page):
            page.on('pageerror', lambda e: report['errors'].append(str(e)))
            page.on('request', lambda r: report['remote_requests'].append(r.url) if r.url.startswith(('http:', 'https:')) else None)
            page.on('requestfailed', lambda r: report['failed_requests'].append(r.url[:100]))

        def wait(page, expression, timeout=60):
            deadline = time.monotonic() + timeout
            while time.monotonic() < deadline:
                if page.evaluate(expression):
                    return
                time.sleep(.025)
            raise AssertionError(expression)

        def load(page):
            watch(page);page.clock.install(time='2026-01-01T00:00:00Z')
            page.goto((ROOT / 'index.html').as_uri(), timeout=120000)
            page.wait_for_function('mygoGame.loaded')
            page.clock.pause_at('2026-01-01T00:01:00Z')

        def choose(page, teams, mode='duel', touch=False):
            assert page.locator('#character-select').is_visible()
            page.select_option('#selection-mode', mode)
            assert page.locator('.selection-character').count() == 15
            for side, team in enumerate(teams):
                for slot, character in enumerate(team):
                    if touch:
                        page.locator(f'.selection-slot-pick[data-side="{side}"][data-slot="{slot}"]').tap()
                        page.locator(f'.selection-character[data-character="{character}"]').tap()
                    else:
                        page.click(f'.selection-slot-pick[data-side="{side}"][data-slot="{slot}"]')
                        page.click(f'.selection-character[data-character="{character}"]')
            assert page.locator('#selection-confirm').is_enabled()

        def enter(page, teams):
            page.click('#selection-confirm')
            wait(page, f'document.querySelector("#loading").hidden&&!document.querySelector("#battle-screen").hidden&&mygoGame.match.fighters[0].character==={teams[0][0]}')
            page.clock.run_for(1800)
            assert page.evaluate('mygoGame.match.phase') == 'fighting'

        def lose(page, side, hp=137, energy=44):
            page.evaluate('''({side,hp,energy})=>{const m=mygoGame.match;m.freeze=0;m.fighters.forEach(f=>{f.attack=null;f.stun=f.hardStun=f.knockdown=f.cooldown=0;});
              m.fighters[side].hp=0;m.fighters[1-side].hp=hp;m.fighters[1-side].energy=energy;}''', {'side': side, 'hp': hp, 'energy': energy})
            page.clock.run_for(40)

        page = browser.new_page(viewport={'width': 1366, 'height': 768})
        try:
            load(page);page.click('#menu-start')
            assert page.locator('#character-select').is_visible(), 'start must open selection before the match'
            assert page.locator('#battle-screen').is_hidden()
            assert page.evaluate('mygoGame.match.phase') == 'idle'
            assert page.locator('#selection-confirm').is_disabled()
            page.keyboard.press('j');page.keyboard.press('F1');page.clock.run_for(100)
            assert page.evaluate('mygoGame.match.phase') == 'idle'
            choose(page, [[0], [1]])
            page.screenshot(path=str(ART / 'character-selection-1v1.png'))
            enter(page, [[0], [1]])
            assert page.evaluate('mygoGame.match.isTeamBattle') is False
            report['start_selection_before_any_battle_and_1v1'] = 'pass'

            page.click('#home');page.click('#menu-team')
            assert page.locator('#selection-format').input_value() == '3v3'
            page.click('.selection-character[data-character="0"]')
            assert page.locator('.selection-character[data-character="0"]').is_disabled(), 'same team may not duplicate'
            teams = [[0, 6, 10], [1, 7, 12]]
            choose(page, teams)
            page.screenshot(path=str(ART / 'character-selection-3v3.png'))
            enter(page, teams)
            assert page.evaluate('mygoGame.match.teams') == teams
            assert page.locator('#team-roster-0 .team-member').count() == 3
            assert page.locator('#team-roster-1 .team-member').count() == 3
            assert page.locator('#wins1').is_hidden()

            lose(page, 1)
            assert page.evaluate('mygoGame.match.phase') == 'roundOver'
            page.clock.run_for(4400)
            assert page.evaluate('mygoGame.match.fighters.map(f=>f.character)') == [0, 7]
            assert page.evaluate('mygoGame.match.fighters.map(f=>[f.hp,f.energy])') == [[137, 44], [200, 0]]
            assert '初华' in page.locator('#name2').inner_text()
            assert page.locator('#team-roster-1 .team-member.defeated').count() == 1
            page.evaluate('mygoGame.match.fighters[1].energy=100')
            page.keyboard.press('Numpad7');page.clock.run_for(60)
            assert page.evaluate('!!mygoGame.match.fighters[1].stageForm')
            page.keyboard.press('Numpad4');page.clock.run_for(60)
            assert page.evaluate('mygoGame.match.fighters[1].attack') == 'mujica_7_stage_u'
            page.locator('#stage').screenshot(path=str(ART / 'team-battle-tag-uika-stage.png'))
            report['automatic_tag_survivor_resources_and_loaded_stage_kit'] = 'pass'

            lose(page, 0, 173, 31);page.clock.run_for(4400)
            assert page.evaluate('mygoGame.match.fighters.map(f=>f.character)') == [6, 7]
            assert page.evaluate('mygoGame.match.fighters[1].hp') == 173
            assert page.evaluate('mygoGame.match.fighters[1].stageForm') is None
            lose(page, 0);page.clock.run_for(4400)
            assert page.evaluate('mygoGame.match.fighters[0].character') == 10
            page.keyboard.press('j');page.clock.run_for(60)
            assert page.evaluate('mygoGame.match.fighters[0].attack') == 'mewtype_10_virtual_light'
            lose(page, 1);page.clock.run_for(4400)
            assert page.evaluate('mygoGame.match.fighters[1].character') == 12
            lose(page, 1)
            assert page.evaluate('mygoGame.match.phase') == 'finished'
            assert page.evaluate('mygoGame.match.winner') == 0
            assert page.locator('#team-roster-0 .team-member.defeated').count() == 2
            assert page.locator('#team-roster-1 .team-member.defeated').count() == 3
            assert page.locator('#overlay').is_hidden()
            page.clock.run_for(3300)
            assert '获胜' in page.locator('#overlay-title').inner_text()
            report['complete_three_member_wheel_battle_and_team_victory'] = 'pass'

            page.click('#restart');wait(page, 'document.querySelector("#loading").hidden')
            page.clock.run_for(1800)
            assert page.evaluate('mygoGame.match.teamIndices') == [0, 0]
            assert page.evaluate('mygoGame.match.fighters.map(f=>f.hp)') == [200, 200]
            lose(page, 0);page.click('#home')
            frozen = page.evaluate('JSON.stringify({f:mygoGame.match.fighters,i:mygoGame.match.teamIndices,t:mygoGame.match.phaseMs})')
            page.clock.run_for(4000)
            assert page.evaluate('JSON.stringify({f:mygoGame.match.fighters,i:mygoGame.match.teamIndices,t:mygoGame.match.phaseMs})') == frozen
            page.click('#menu-start');page.click('#selection-back')
            assert page.locator('#main-menu').is_visible()
            page.click('#menu-resume');page.clock.run_for(4400)
            assert page.evaluate('mygoGame.match.fighters[0].character') == 6
            report['restart_and_selection_back_preserve_paused_intermission'] = 'pass'

            page.click('#home');page.click('#menu-team')
            cpu_teams = [[0, 1, 2], [0, 4, 10]]
            choose(page, cpu_teams, mode='cpu');enter(page, cpu_teams)
            assert page.locator('#p2-tag').inner_text() == 'CPU'
            lose(page, 1);page.clock.run_for(4400)
            assert page.evaluate('mygoGame.match.fighters[1].character') == 4
            page.evaluate('''()=>{const m=mygoGame.match;m.seed=27;m.aiThink=0;m.fighters[1].x=m.fighters[0].x+150;m.fighters[1].energy=100;}''')
            page.clock.run_for(5000)
            assert page.evaluate('mygoGame.match.fighters[0].hp<137||mygoGame.match.teamIndices[0]>0'), 'tagged CPU did not continue fighting'
            report['CPU_controls_its_next_selected_character'] = 'pass'

            for width, height in [(390, 844), (844, 390)]:
                phone = browser.new_page(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True)
                load(phone);phone.locator('#menu-team').tap()
                assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
                choose(phone, [[4, 3, 2], [5, 8, 14]], touch=True)
                phone.screenshot(path=str(ART / f'character-selection-mobile-{width}.png'), full_page=True)
                enter(phone, [[4, 3, 2], [5, 8, 14]])
                assert phone.locator('#team-roster-0').is_visible()
                assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
                phone.screenshot(path=str(ART / f'team-battle-mobile-{width}.png'))
                report['mobile'].append({'width': width, 'height': height, 'six_touch_picks': 'pass', 'team_hud': 'pass'})
                phone.close()
            assert not report['errors'] and not report['remote_requests'] and not report['failed_requests'], report
            report['status'] = 'pass'
        except Exception as error:
            report.update(status='fail', failure=str(error));page.screenshot(path=str(ART / 'team-selection-failure.png'))
            raise
        finally:
            (ART / 'team-selection-browser-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
            browser.close();print(json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    main()
