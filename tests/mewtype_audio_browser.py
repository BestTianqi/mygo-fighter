"""An emitted note interrupted in the same tick must not stop the audio/game loop."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from ui_helpers import select_game_option, start_match, set_game_sound

ROOT = Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.clock.install(time='2026-01-01T00:00:00Z')
    page.goto((ROOT / 'index.html').as_uri())
    page.wait_for_function('window.mygoGame?.loaded')
    page.clock.pause_at('2026-01-01T00:01:00Z')
    select_game_option(page, '#player-character', '10')
    select_game_option(page, '#opponent-character', '0')
    select_game_option(page, '#mode', 'duel')
    start_match(page)
    page.wait_for_function('mygoGame.match.fighters[0].character===10&&document.querySelector("#loading").hidden')
    page.clock.run_for(1800)
    set_game_sound(page, True)
    assert page.locator('#sound').get_attribute('aria-pressed') == 'true'
    before = page.evaluate('''() => {
      const m=mygoGame.match;
      m.start();m.advance(1000);m.drainEvents();m.release();
      const [a,b]=m.fighters;
      a.x=400;b.x=500;a.y=b.y=0;b.facing=-1;
      a.attack='mewtype_10_virtual_i';a.attackMs=150;
      b.attack='heavy';b.attackMs=MygoFighter.MOVES.heavy.start-10;
      m.advance(10);
      if(a.attack!==null||!m.events.some(e=>e.type==='voicePulse'&&e.attack==='mewtype_10_virtual_i'))
        throw Error('Interrupted emission was not reproduced');
      return m.elapsed;
    }''')
    page.clock.run_for(300)
    assert not errors, errors
    assert page.evaluate('mygoGame.match.elapsed') > before
    report = dict(sound_enabled=True, interrupted_note=True, game_loop_continues=True, errors=errors)
    (ROOT / 'tests/artifacts/mewtype-audio-interruption-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(report)
    browser.close()
