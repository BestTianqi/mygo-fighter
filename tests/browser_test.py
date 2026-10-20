"""Exercise the actual offline HTML with Chromium. Requires Python Playwright.
Run: python tests/browser_test.py
"""
import json
from pathlib import Path

from playwright.sync_api import sync_playwright, expect
from ui_helpers import select_game_option, start_match, show_help, close_help, open_settings

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "tests/artifacts"
ARTIFACTS.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel="msedge")
    page = browser.new_page(viewport={"width": 1440, "height": 1060}, device_scale_factor=1)
    errors, remote = [], []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("request", lambda request: remote.append(request.url) if request.url.startswith("http") else None)
    page.clock.install(time='2026-01-01T00:00:00Z')
    page.goto((ROOT / "index.html").as_uri())
    page.wait_for_function("window.mygoGame && mygoGame.loaded")
    page.clock.pause_at('2026-01-01T00:01:00Z')
    page.clock.run_for(50)
    assert page.locator("#loading").is_hidden()
    assert page.locator("#overlay").is_visible()
    assert page.locator('.masthead,.sidebar,.character-strip,.page-intro,footer').count() == 0
    assert page.locator('.game-tools button').count() == 7
    assert page.locator('#settings-dialog').is_hidden()
    assert page.evaluate("mygoGame.match.fighters.map(f => f.character)") == [0, 1]
    assert page.locator("#name2").inner_text() == "长崎素世"
    assert page.evaluate("MYGO_ASSETS.characters.length") == 5
    assert page.evaluate("MYGO_ASSETS.characters.every(art => art.frames.length === 16)")
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    page.screenshot(path=str(ARTIFACTS / "desktop-lobby.png"), full_page=True)

    select_game_option(page, "#mode", "duel")
    start_match(page)
    page.clock.run_for(1200)
    assert page.evaluate("mygoGame.match.phase") == "fighting"
    assert page.locator("#p2-tag").inner_text() == "2P"
    page.keyboard.down("d")
    page.clock.run_for(1450)
    page.keyboard.up("d")
    assert page.evaluate("mygoGame.match.fighters[0].x") > 500
    page.keyboard.press("j")
    page.clock.run_for(450)  # Include light recovery and its on-hit freeze before jumping.
    hp = page.evaluate("mygoGame.match.fighters[1].hp")
    assert hp == 192, hp
    assert page.locator("#hptext2").inner_text() == "192 / 200"

    page.keyboard.down("w")
    page.clock.run_for(150)
    page.keyboard.up("w")
    assert page.evaluate("mygoGame.match.fighters[0].y") > 0
    page.clock.run_for(1000)
    assert page.evaluate("mygoGame.match.grounded(mygoGame.match.fighters[0])")
    page.screenshot(path=str(ARTIFACTS / "desktop-fight.png"), full_page=True)

    page.keyboard.press("Space")
    paused = page.evaluate("JSON.stringify(mygoGame.match.fighters) + mygoGame.match.remaining")
    page.clock.run_for(1600)
    assert page.evaluate("mygoGame.match.paused")
    assert page.evaluate("JSON.stringify(mygoGame.match.fighters) + mygoGame.match.remaining") == paused
    page.keyboard.press("Space")
    page.clock.run_for(100)
    assert not page.evaluate("mygoGame.match.paused")

    # Opening settings pauses the fight; nested help must keep it paused
    # until settings closes. Canceling settings retains the current match.
    open_settings(page)
    remaining = page.evaluate('mygoGame.match.remaining')
    page.clock.run_for(800)
    assert page.evaluate('mygoGame.match.remaining') == remaining
    show_help(page)
    assert page.locator("#help-dialog").is_visible()
    assert page.evaluate("mygoGame.match.paused")
    page.click('#close-help')
    page.clock.run_for(50)
    assert page.evaluate('mygoGame.match.paused')
    assert page.locator('#settings-dialog').is_visible()
    page.click('#close-settings')
    page.clock.run_for(50)
    assert not page.evaluate("mygoGame.match.paused")
    open_settings(page)
    page.click('[data-stage="1"]')
    assert page.locator('[data-stage="1"]').get_attribute('aria-pressed') == 'true'
    page.click('#close-settings')
    page.clock.run_for(50)
    # Settings and moves preserve a manual pause; Escape closes the modal.
    page.click('#pause')
    open_settings(page)
    page.keyboard.press('Escape')
    page.clock.run_for(50)
    assert page.evaluate('mygoGame.match.paused')
    page.click('#moves')
    assert page.locator('#moves-content tr').count() > 20
    page.click('#close-moves')
    page.clock.run_for(50)
    assert page.evaluate('mygoGame.match.paused')
    page.click('#pause')
    page.click('#moves')
    assert page.evaluate('mygoGame.match.paused')
    page.click('#close-moves')
    page.clock.run_for(50)
    assert not page.evaluate('mygoGame.match.paused')
    page.click("#sound")
    expect(page.locator("#sound")).to_have_attribute("aria-pressed", "true")
    page.click("#sound")

    page.focus("#stage")
    page.keyboard.press("r")
    page.clock.run_for(1100)
    assert page.evaluate("mygoGame.match.fighters[1].hp") == 200
    assert page.evaluate("mygoGame.match.wins") == [0, 0]

    # Selection changes are staged for the next match, then update real art,
    # names, commands, opponent identity and round resets together.
    select_game_option(page, "#player-character", "1")
    select_game_option(page, "#opponent-character", "0")
    page.clock.run_for(50)
    assert page.evaluate("mygoGame.match.fighters.map(f => f.character)") == [0, 1]
    assert page.locator('#player-character').input_value() == '1'
    assert page.locator('#setup-note').is_visible()
    start_match(page)
    page.clock.run_for(1100)
    assert page.evaluate("mygoGame.match.fighters.map(f => f.character)") == [1, 0]
    assert page.locator("#name1").inner_text() == "长崎素世"
    assert page.locator("#name2").inner_text() == "千早爱音"
    assert page.locator('#help-skill-name').inner_text() == '回响终章（60%）'
    assert page.locator('#settings-dialog').is_hidden()
    assert not page.evaluate('mygoGame.match.paused')
    page.screenshot(path=str(ARTIFACTS / "desktop-soyo-fight.png"), full_page=True)
    page.evaluate("""() => { const m = mygoGame.match;
      m.fighters[0].x = 400; m.fighters[0].energy = 100;
      m.fighters[1].x = 610; m.fighters[1].y = 150; }""")
    page.focus("#stage")
    page.keyboard.press("l")
    page.clock.run_for(400)
    assert page.evaluate("mygoGame.match.fighters[0].x") == 400
    assert page.evaluate("mygoGame.match.fighters[1].hp") == 176
    show_help(page)
    assert page.locator("#help-player-name").inner_text() == "1P / 长崎素世"
    assert page.locator("#help-skill-name").inner_text() == "回响终章（60%）"
    close_help(page)
    page.clock.run_for(50)

    page.clock.run_for(800)  # Let the preceding special fully recover.
    # Finish a match using actual attack input and HP setup, then verify UI flow.
    for point in range(2):
        page.evaluate("""() => { const m = mygoGame.match;
          m.fighters[0].x = 420; m.fighters[1].x = 485;
          m.fighters[1].hp = 1; }""")
        page.keyboard.press("j")
        page.clock.run_for(950)
        assert page.evaluate("mygoGame.match.wins[0]") == point + 1
        assert page.locator("#overlay").is_visible()
        if point == 0:
            page.click("#overlay-action")
            page.clock.run_for(1100)
            assert page.evaluate("mygoGame.match.fighters.map(f => f.character)") == [1, 0]
    assert page.evaluate("mygoGame.match.phase") == "finished"
    assert "再来一场" in page.locator("#overlay-action").inner_text()
    page.screenshot(path=str(ARTIFACTS / "desktop-result.png"), full_page=True)
    page.click("#overlay-action")
    page.clock.run_for(1100)
    assert page.evaluate("mygoGame.match.wins") == [0, 0]
    assert page.evaluate("mygoGame.match.fighters.map(f => f.character)") == [1, 0]
    select_game_option(page, "#opponent-character", "1")
    start_match(page)
    page.clock.run_for(1100)
    assert page.evaluate("mygoGame.match.fighters.map(f => f.character)") == [1, 1]
    assert page.locator("#name1").inner_text() == page.locator("#name2").inner_text() == "长崎素世"

    # A real touch pointer must move the fighter and release without sticking.
    mobile = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, device_scale_factor=1)
    phone = mobile.new_page()
    phone.on("pageerror", lambda error: errors.append(str(error)))
    phone.clock.install()
    phone.goto((ROOT / "index.html").as_uri())
    phone.wait_for_function("window.mygoGame && mygoGame.loaded")
    phone.clock.run_for(50)
    assert phone.evaluate("document.documentElement.scrollWidth <= innerWidth")
    stage_box = phone.locator("#stage").bounding_box()
    touch_box = phone.locator(".touch-controls").bounding_box()
    assert stage_box["y"] >= 0 and touch_box["y"] + touch_box["height"] <= 844
    phone.screenshot(path=str(ARTIFACTS / "mobile-lobby.png"), full_page=True)
    select_game_option(phone, "#mode", "duel")
    select_game_option(phone, "#player-character", "1")
    assert phone.locator('#player-character').input_value() == '1'
    start_match(phone)
    phone.clock.run_for(1100)
    assert phone.evaluate("mygoGame.match.fighters[0].character") == 1
    touch = phone.locator('[data-key="KeyD"]')
    touch.scroll_into_view_if_needed()
    box = touch.bounding_box()
    cdp = mobile.new_cdp_session(phone)
    cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": box["x"] + box["width"] / 2, "y": box["y"] + box["height"] / 2}]})
    phone.clock.run_for(400)
    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    assert phone.evaluate("mygoGame.match.fighters[0].x") > 300
    x = phone.evaluate("mygoGame.match.fighters[0].x")
    phone.clock.run_for(300)
    assert phone.evaluate("mygoGame.match.fighters[0].x") == x
    # A short desktop and a phone in landscape both keep the whole arena and
    # essential controls inside the viewport without horizontal overflow.
    page.set_viewport_size({'width': 1366, 'height': 768})
    stage_box = page.locator('#stage').bounding_box()
    tools_box = page.locator('.game-tools').bounding_box()
    assert stage_box['y'] >= 0 and tools_box['y'] + tools_box['height'] <= 768
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path=str(ARTIFACTS / 'core-ui-desktop.png'), full_page=True)
    for width, height in [(667, 375), (844, 390), (932, 430)]:
        phone.set_viewport_size({'width': width, 'height': height})
        phone.clock.run_for(50)
        for selector in ['#stage', '.game-tools', '.touch-dpad', '.touch-attacks']:
            box = phone.locator(selector).bounding_box()
            assert box['x'] >= 0 and box['y'] >= 0, (selector, box)
            assert box['x'] + box['width'] <= width and box['y'] + box['height'] <= height, (selector, box)
        arena = phone.locator('#stage').bounding_box()
        attacks = phone.locator('.touch-attacks').bounding_box()
        tools = phone.locator('.game-tools').bounding_box()
        assert arena['x'] + arena['width'] <= attacks['x']
        assert tools['x'] + tools['width'] <= attacks['x']
        assert phone.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert phone.evaluate('document.documentElement.scrollHeight <= innerHeight')
        phone.screenshot(path=str(ARTIFACTS / f'core-ui-mobile-landscape-{width}.png'))
    assert errors == [], errors
    assert remote == [], remote
    print(json.dumps({"offline": "pass", "keyboard": "pass", "combat": "pass", "rounds": "pass", "pause": "pass", "touch": "pass", "mobile_layout": "pass", "browser_errors": errors, "external_requests": remote, "screenshots": str(ARTIFACTS)}, ensure_ascii=False))
    mobile.close()
    browser.close()
