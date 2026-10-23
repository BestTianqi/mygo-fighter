"""Ending cues play once, respect mute, and do not replay when resuming."""
import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright
from ui_helpers import select_game_option, start_match, set_game_sound

ROOT = Path(__file__).resolve().parents[1]
errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page()
    page.add_init_script('''window.finishNotes=[];
      const create=AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator=function(){const node=create.call(this),start=node.start.bind(node);
        node.start=function(at){finishNotes.push(at);start(at);};return node;};''')
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.clock.install(time='2026-01-01T00:00:00Z')
    page.goto((ROOT / 'index.html').as_uri(), timeout=120000)
    page.wait_for_function('mygoGame.loaded')
    page.clock.pause_at('2026-01-01T00:01:00Z')
    select_game_option(page, '#mode', 'duel');start_match(page);set_game_sound(page, False)
    page.evaluate('finishNotes=[]');page.clock.run_for(1800)
    page.evaluate('mygoGame.match.fighters[1].hp=0;mygoGame.match.endRound()')
    page.clock.run_for(1000)
    assert page.evaluate('finishNotes.length') == 0
    page.click('#restart');page.clock.run_for(1800)
    set_game_sound(page, True)
    deadline = time.monotonic() + 30
    while page.locator('#sound').get_attribute('aria-pressed') != 'true':
        assert time.monotonic() < deadline, 'Audio failed to initialize'
        time.sleep(.025)
    page.evaluate('finishNotes=[];mygoGame.match.fighters[1].hp=0;mygoGame.match.endRound()')
    page.clock.run_for(30);assert page.evaluate('finishNotes.length') == 2
    page.clock.run_for(1000);assert page.evaluate('finishNotes.length') == 5
    page.click('#pause');page.clock.run_for(2500);page.click('#overlay-action');page.clock.run_for(300)
    assert page.evaluate('finishNotes.length') == 5
    page.click('#sound');page.click('#restart');page.clock.run_for(1800)
    page.evaluate('finishNotes=[];mygoGame.match.fighters[1].hp=0;mygoGame.match.endRound()')
    page.clock.run_for(1000);assert page.evaluate('finishNotes.length') == 0
    assert not errors, errors
    browser.close()
print(json.dumps({'muted': 'pass', 'impact_and_reveal_once': 'pass', 'pause_resume_no_replay': 'pass', 'errors': errors}))
