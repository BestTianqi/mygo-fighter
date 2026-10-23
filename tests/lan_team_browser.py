"""Two isolated browsers share one authoritative 3v3 relay room."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
report = {'checks': [], 'errors': []}
with sync_playwright() as p:
    b = p.chromium.launch(channel='msedge', headless=True)
    contexts = [b.new_context(viewport={'width': 1280, 'height': 900}) for _ in range(2)]
    a, c = [ctx.new_page() for ctx in contexts]
    try:
        for page in [a, c]:
            page.on('pageerror', lambda e: report['errors'].append(str(e)))
            page.goto('http://localhost:8765', timeout=120000)
            page.wait_for_function('mygoGame.loaded', timeout=60000)
            page.click('#menu-lan')
        a.click('#lan-create')
        a.wait_for_function('document.querySelector("#lan-code").textContent.length===6')
        code = a.locator('#lan-code').inner_text()
        c.fill('#lan-join-code', code)
        c.click('#lan-join')
        a.wait_for_function('!document.querySelector("#lan-ready").disabled')

        a.select_option('#lan-format', '3v3')
        c.wait_for_function('!document.querySelector("#lan-team").hidden')
        assert not a.locator('#lan-team').is_hidden()
        assert a.locator('#lan-solo').is_hidden()

        # Picking a character already fielded in another slot swaps the two.
        a.select_option('#lan-team-0', '2')
        a.wait_for_function('document.querySelector("#lan-team-0").value==="2"&&document.querySelector("#lan-team-2").value==="0"')
        a.select_option('#lan-team-0', '0')
        a.select_option('#lan-team-1', '1')
        a.select_option('#lan-team-2', '2')
        c.select_option('#lan-team-0', '3')
        c.select_option('#lan-team-1', '4')
        c.select_option('#lan-team-2', '5')
        a.wait_for_timeout(350)
        players = a.locator('#lan-players').inner_text()
        assert '千早爱音 → 长崎素世 → 高松灯' in players, players
        assert '要乐奈 → 椎名立希 → 八幡海铃' in players, players
        report['checks'].append('host switches to 3v3, both lineups stay valid and render in the room')

        a.click('#lan-ready')
        c.click('#lan-ready')
        for page in [a, c]:
            page.wait_for_function('mygoGame.match.phase==="fighting"&&!mygoGame.match.paused', timeout=90000)
        for page in [a, c]:
            assert page.evaluate('mygoGame.match.options.format') == '3v3'
            assert page.evaluate('mygoGame.match.teams') == [[0, 1, 2], [3, 4, 5]]
            assert page.evaluate('mygoGame.match.teamIndices') == [0, 0]
            assert page.evaluate('mygoGame.match.fighters.map(f=>f.character)') == [0, 3]
        a.wait_for_function('document.querySelectorAll("#team-roster-0 .team-member").length===3')
        assert a.locator('#team-roster-0 .team-member.current').count() == 1
        assert a.locator('#round-label').inner_text().startswith('3v3')
        report['checks'].append('both clients start the same team battle with ordered lineups and relay HUD')
        a.screenshot(path=str(ROOT / 'tests/artifacts/lan-team-battle.png'))

        # Pausing exposes the overlay; reselect returns both to the room with lineups intact.
        a.click('#pause')
        a.wait_for_function('mygoGame.match.paused')
        a.click('#overlay-reselect')
        for page in [a, c]:
            page.wait_for_function('document.querySelector("#lan-dialog").open')
        assert a.evaluate('document.querySelector("#lan-team-0").value') == '0'
        report['checks'].append('reselect returns both to the 3v3 room with lineups intact')
        c.click('#lan-leave')
        a.wait_for_function('document.querySelector("#lan-ready").disabled')
        a.click('#lan-leave')
        assert a.locator('#main-menu').is_visible()
        assert not report['errors'], report['errors']
    finally:
        (ROOT / 'tests/artifacts/lan-team-browser-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), 'utf-8')
        b.close()
print(json.dumps(report, ensure_ascii=False, indent=2))
