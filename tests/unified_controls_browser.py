"""Verify the shipped offline HTML through real keyboard and touch events."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from ui_helpers import select_game_option, start_match

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'tests/artifacts'
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(viewport={'width': 1366, 'height': 768})
    errors, remote, proof = [], [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: remote.append(r.url) if r.url.startswith('http') else None)
    page.clock.install(time='2026-01-01T00:00:00Z')
    page.goto((ROOT / 'index.html').as_uri()); page.wait_for_function('mygoGame.loaded')
    page.clock.pause_at('2026-01-01T00:01:00Z')

    def setup(c):
        select_game_option(page, '#player-character', str(c))
        select_game_option(page, '#opponent-character', str(c))
        select_game_option(page, '#mode', 'duel'); page.uncheck('#terrain-enabled')
        start_match(page)
        page.wait_for_function(f'mygoGame.match.fighters[0].character==={c}&&mygoGame.match.fighters[1].character==={c}&&document.querySelector("#loading").hidden')
        page.clock.run_for(1800)

    def reset(penguin=False, air=False):
        page.evaluate('''({penguin, air}) => {
          const m=mygoGame.match;m.start();m.advance(1000);m.release();
          m.fighters.forEach((f,i)=>{f.x=i?1400:300;f.energy=100;f.hp=100;
            if(penguin)f.penguin={ms:20000};if(air){f.y=180;f.vy=100;}});
        }''', {'penguin': penguin, 'air': air})
        page.locator('#stage').focus(); page.clock.run_for(20)

    def cast(key, move, side=0, direction=None):
        if direction: page.keyboard.down(direction)
        page.keyboard.press(key); page.clock.run_for(20)
        actual = page.evaluate(f'mygoGame.match.fighters[{side}].attack')
        assert actual == move, (key, direction, side, move, actual)
        if direction: page.keyboard.up(direction)

    bases = [['shield', 'wave', 'special'], ['summon', 'wave', 'special'],
             ['tomoriEcho', 'tomoriNote', 'tomoriChorus'], ['ranaRush', 'ranaParfait', 'ranaSolo'],
             ['rikiRoll', 'rikiShock', 'rikiEight']]
    supers = ['super', 'soyoSuper', 'tomoriSuper', 'ranaSuper', 'rikiSuper']
    for c, moves in enumerate(bases):
        setup(c)
        for slot, move in enumerate(moves):
            reset(); cast(['u', 'i', 'o'][slot], move)
            reset(); cast('Numpad' + str(4 + slot), move, side=1)
        for key, side, suffix in [('j', 0, 'light'), ('k', 0, 'heavy'), ('Numpad1', 1, 'light'), ('Numpad2', 1, 'heavy')]:
            reset(); expected = ('rana_' if c == 3 else 'riki_' if c == 4 else '') + suffix
            cast(key, expected, side)
        for side, key in [(0, 'l'), (1, 'Numpad3')]:
            for air in [False, True]:
                reset(air=air); x=page.evaluate(f'mygoGame.match.fighters[{side}].x')
                page.keyboard.press(key); page.clock.run_for(20)
                delta=page.evaluate(f'mygoGame.match.fighters[{side}].x')-x
                assert abs(delta - (242.05 if side == 0 else -242.05)) < 1, delta
        if supers[c]:
            assert page.locator('[data-key="KeyP"]').evaluate('(button)=>!button.hidden')
            assert page.locator('[data-key="KeyP"]').inner_text().endswith(page.evaluate('attack=>MygoFighter.MOVES[attack].name',supers[c]))
            reset(); cast('p', supers[c]); reset(); cast('Numpad8', supers[c], side=1)
        reset(); page.keyboard.press('h'); page.clock.run_for(20)
        assert page.evaluate('!!mygoGame.match.fighters[0].penguin') == (c == 2)
        reset(); page.keyboard.press('Numpad7'); page.clock.run_for(20)
        assert page.evaluate('!!mygoGame.match.fighters[1].penguin') == (c == 2)
        proof.append({'character': c, 'base_skills_both_players': moves, 'blink_ground_air': 'pass'})

    # Expanded moves keep their existing effects through direction combinations.
    for c, key, direction, move in [(0,'i','s','sonic'), (0,'u','s','rising'), (0,'u','d','thrust'),
        (0,'i','a','waveLight'), (0,'i','d','waveHeavy'), (0,'k','d','overhead'),
        (0,'o','s','rush'), (0,'o','a','spin'), (1,'i','s','heal'), (3,'i','s','ranaTune'),
        (3,'u','d','ranaSlide'), (3,'i','d','ranaChord'), (3,'u','s','ranaRise'),
        (3,'o','s','ranaPick'), (4,'i','s','rikiCalibrate'), (4,'u','s','rikiOverhead'),
        (4,'u','d','rikiRush'), (4,'i','d','rikiRise')]:
        setup(c); reset()
        if move == 'ranaTune': page.evaluate('mygoGame.match.fighters[0].energy=50')
        cast(key, move, direction=direction)
    setup(0); reset(air=True); cast('o','dive',direction='s')
    setup(3); reset(air=True); cast('o','ranaDive',direction='s')
    setup(2)
    for slot, move in enumerate(['penguinCry','penguinHey','penguinCall']):
        reset(penguin=True); cast(['u','i','o'][slot],move)
        reset(penguin=True); cast('Numpad'+str(slot+4),move,side=1)
    reset(penguin=True); cast('u','penguinKick',direction='d')
    reset(penguin=True); cast('i','penguinLaugh',direction='s')
    reset(penguin=True,air=True); cast('o','penguinKick',direction='s')
    reset(penguin=True); cast('p','penguinSuper')
    reset(penguin=True); cast('Numpad8','penguinSuper',side=1)

    # Normal attacks still chain, including taps made entirely during hitstop.
    setup(4); reset(); page.keyboard.press('j'); page.clock.run_for(140)
    page.keyboard.press('j'); page.clock.run_for(140)
    assert page.evaluate('MygoFighter.MOVES[mygoGame.match.fighters[0].attack].chain') == 2
    page.keyboard.press('j'); page.clock.run_for(40)
    assert page.evaluate('MygoFighter.MOVES[mygoGame.match.fighters[0].attack].chain') == 3
    setup(0); reset(); page.evaluate('mygoGame.match.freeze=100')
    page.keyboard.press('u'); page.clock.run_for(140)
    assert page.evaluate('mygoGame.match.fighters[0].attack') == 'shield'
    reset(); page.keyboard.down('s'); page.clock.run_for(30)
    page.evaluate('mygoGame.match.freeze=100'); page.keyboard.press('u'); page.keyboard.up('s')
    page.clock.run_for(140)
    assert page.evaluate('mygoGame.match.fighters[0].attack') == 'rising'
    assert page.evaluate('mygoGame.match.fighters[0].energy') == 70
    reset(); page.keyboard.down('a'); page.clock.run_for(30)
    x = page.evaluate('mygoGame.match.fighters[0].x')
    page.evaluate('mygoGame.match.freeze=100'); page.keyboard.press('l'); page.keyboard.up('a')
    page.clock.run_for(140)
    assert page.evaluate('mygoGame.match.fighters[0].x') < x - 240
    reset(); page.keyboard.down('ArrowDown'); page.clock.run_for(30)
    page.evaluate('mygoGame.match.freeze=100'); page.keyboard.press('Numpad5'); page.keyboard.up('ArrowDown')
    page.clock.run_for(140)
    assert page.evaluate('mygoGame.match.fighters[1].attack') == 'sonic'
    reset(); page.keyboard.down('i'); page.clock.run_for(100)
    page.keyboard.down('s'); page.clock.run_for(1200)
    assert page.evaluate('mygoGame.match.fighters[0].energy') == 80
    page.keyboard.up('i'); page.keyboard.up('s')

    # Old extra keys are removed, while back direction continues to guard.
    reset()
    for key in ['g','t','y','c','v','f','b','n','m',',',';','ShiftLeft']:
        page.keyboard.press(key); page.clock.run_for(20)
        assert page.evaluate('mygoGame.match.fighters[0].attack') is None, key
        assert page.evaluate('mygoGame.match.fighters[0].dashMs') == 0, key
    page.keyboard.down('a'); page.clock.run_for(20)
    assert page.evaluate('mygoGame.match.fighters[0].guard')
    page.keyboard.up('a')
    # No global pause, resume, start, or restart keyboard mapping remains.
    reset(); page.evaluate('mygoGame.match.fighters[0].hp=123')
    for key in ['Space','Escape','r','Enter']:
        page.keyboard.press(key); page.clock.run_for(30)
        assert page.evaluate('mygoGame.match.paused') is False, key
        assert page.evaluate('mygoGame.match.fighters[0].hp') == 123, key
    page.click('#pause'); assert page.evaluate('mygoGame.match.paused')
    for key in ['Space','Escape','r','Enter']:
        page.keyboard.press(key); page.clock.run_for(30)
        assert page.evaluate('mygoGame.match.paused'), key
        assert page.evaluate('mygoGame.match.fighters[0].hp') == 123, key
    page.click('#overlay-action'); assert not page.evaluate('mygoGame.match.paused')
    page.locator('#restart').focus()
    for key in ['Space','Enter']:
        page.keyboard.press(key); page.clock.run_for(30)
        assert page.evaluate('mygoGame.match.fighters[0].hp') == 123, key
    page.click('#restart'); page.clock.run_for(1800)
    assert page.evaluate('mygoGame.match.fighters[0].hp') == 200

    setup(1); reset(); cast('p','soyoSuper')
    assert page.locator('#soyo-cutin-0').is_visible()
    page.click('#pause'); page.clock.run_for(30)
    assert page.locator('#soyo-cutin-0').is_hidden()
    assert page.locator('#soyo-cutin-0 video').evaluate('(v)=>v.paused')
    page.click('#overlay-action'); page.clock.run_for(30)
    assert page.locator('#soyo-cutin-0').is_visible()
    page.click('#restart'); page.clock.run_for(1800)
    assert page.locator('#soyo-cutin-0').is_hidden()
    setup(0); reset()

    # Updated help and move tables expose no removed controls.
    page.keyboard.press('F1'); page.clock.run_for(30)
    text=page.locator('#moves-dialog').inner_text()
    assert '↓＋I' in text and 'TGW' in text and '前＋U' in text
    assert 'Shift' not in text and '空格' not in text
    page.screenshot(path=str(ART/'unified-controls-moves.png'))
    page.click('#close-moves'); page.locator('#stage').screenshot(path=str(ART/'unified-controls-desktop.png'))

    phone = browser.new_page(viewport={'width':844,'height':390},is_mobile=True,has_touch=True)
    phone.on('pageerror',lambda e:errors.append(str(e)))
    phone.clock.install(time='2026-01-01T00:00:00Z');phone.goto((ROOT/'index.html').as_uri())
    phone.wait_for_function('mygoGame.loaded');phone.clock.pause_at('2026-01-01T00:01:00Z')
    select_game_option(phone,'#player-character','1');select_game_option(phone,'#mode','duel')
    phone.uncheck('#terrain-enabled');start_match(phone)
    phone.wait_for_function('mygoGame.match.fighters[0].character===1&&document.querySelector("#loading").hidden')
    phone.clock.run_for(1800)
    phone.evaluate('mygoGame.match.fighters[0].hp=100;mygoGame.match.fighters[0].energy=100;mygoGame.match.fighters[1].x=1400')
    assert phone.locator('.touch-attacks button').count()==8
    assert phone.locator('[data-key="KeyH"]').is_hidden()
    cdp=phone.context.new_cdp_session(phone)
    def touch(keys):
        points=[]
        for i,key in enumerate(keys):
            r=phone.locator('[data-key="'+key+'"]').bounding_box()
            points.append({'x':r['x']+r['width']/2,'y':r['y']+r['height']/2,'id':i+1})
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':points})
        phone.clock.run_for(30)
    touch(['KeyS','KeyI']);assert phone.evaluate('mygoGame.match.fighters[0].attack')=='heal'
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    phone.clock.run_for(1300);assert phone.evaluate('mygoGame.match.fighters[0].hp')==124
    touch(['KeyL']);assert phone.evaluate('mygoGame.match.fighters[0].x')>500
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    phone.screenshot(path=str(ART/'unified-controls-mobile.png'))
    select_game_option(phone,'#player-character','2');start_match(phone)
    phone.wait_for_function('mygoGame.match.fighters[0].character===2&&document.querySelector("#loading").hidden')
    phone.clock.run_for(1800)
    phone.evaluate('mygoGame.match.fighters[0].energy=100;mygoGame.match.fighters[1].x=1400')
    assert phone.locator('[data-key="KeyP"]').is_visible()
    assert phone.locator('[data-key="KeyP"]').inner_text().endswith('一辈子乐队')
    touch(['KeyP']);assert phone.evaluate('mygoGame.match.fighters[0].attack')=='tomoriSuper'
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    phone.click('#restart');phone.wait_for_function('document.querySelector("#loading").hidden');phone.clock.run_for(1800)
    phone.evaluate('mygoGame.match.fighters[0].energy=100;mygoGame.match.fighters[1].x=1400')
    touch(['KeyH']);cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    phone.clock.run_for(30);phone.evaluate('mygoGame.match.fighters[0].energy=100')
    assert phone.locator('[data-key="KeyP"]').is_visible()
    assert phone.locator('[data-key="KeyP"]').inner_text().endswith('咕咕嘎嘎·南极合唱')
    touch(['KeyP']);assert phone.evaluate('mygoGame.match.fighters[0].attack')=='penguinSuper'
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    assert errors==[],errors
    assert remote==[],remote
    report={'characters':proof,'penguin_both_players':'pass','direction_skills':'pass',
        'keyboard_management_removed':'pass','touch_multitouch_heal_and_blink':'pass','offline':True,'errors':errors}
    (ART/'unified-controls-browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False));browser.close()
