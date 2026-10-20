"""Verify real three-press combos draw distinct silhouettes on the game canvas."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from ui_helpers import select_game_option, start_match

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'tests/artifacts'
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(viewport={'width': 1366, 'height': 768})
    errors, remote, proof = [], [], {}
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: remote.append(r.url) if r.url.startswith('http') else None)
    page.clock.install(time='2026-01-01T00:00:00Z')
    page.goto((ROOT / 'index.html').as_uri()); page.wait_for_function('mygoGame.loaded')
    page.clock.pause_at('2026-01-01T00:01:00Z')
    page.evaluate('''() => {
      window.jabDraws=[];const ctx=document.querySelector('#game').getContext('2d'),draw=ctx.drawImage,cache=new WeakMap();
      const groups=[...MYGO_ASSETS.jabActions.map((a,i)=>({key:'jab'+i,...a})),
        {key:'rana',...MYGO_ASSETS.characters[3],frames:MYGO_ASSETS.characters[3].actionFrames},
        {key:'penguin',...MYGO_ASSETS.penguin}];
      ctx.drawImage=function(...args){const im=args[0];if(!cache.has(im))cache.set(im,groups.find(g=>g.atlas===im.src)||null);
        const group=cache.get(im);if(group){const f=group.frames.find(f=>f.x===args[1]&&f.y===args[2]);
          if(f)jabDraws.push({group:group.key,name:f.name});}return draw.apply(this,args);};
    }''')

    def setup(character, side=0):
        select_game_option(page, '#player-character', str(character if side == 0 else 0))
        select_game_option(page, '#opponent-character', str(0 if side == 0 else character))
        select_game_option(page, '#mode', 'duel'); page.uncheck('#terrain-enabled')
        start_match(page); page.clock.run_for(1800)
        page.evaluate('mygoGame.match.fighters.forEach((f,i)=>{f.energy=100;f.x=i?1100:300});jabDraws=[]')

    def combo(key, side, label):
        page.keyboard.press(key); page.clock.run_for(100)
        page.locator('#stage').screenshot(path=str(ART / f'jab-{label}-1.png'))
        page.clock.run_for(40); page.keyboard.press(key); page.clock.run_for(40)
        assert page.evaluate(f'MygoFighter.MOVES[mygoGame.match.fighters[{side}].attack].chain') == 2
        page.clock.run_for(60)
        page.locator('#stage').screenshot(path=str(ART / f'jab-{label}-2.png'))
        page.clock.run_for(110); page.keyboard.press(key); page.clock.run_for(50)
        assert page.evaluate(f'MygoFighter.MOVES[mygoGame.match.fighters[{side}].attack].chain') == 3
        page.clock.run_for(110)
        page.locator('#stage').screenshot(path=str(ART / f'jab-{label}-3.png'))
        page.clock.run_for(100)

    for character in range(4):
        setup(character); combo('j', 0, str(character))
        group = 'jab' + str(character) if character < 3 else 'rana'
        names = sorted(set(page.evaluate(f'jabDraws.filter(d=>d.group==="{group}").map(d=>d.name)')))
        if character < 3:
            assert names == sorted(f'jab-{s}-{phase}' for s in [2, 3] for phase in ['windup', 'impact', 'recover']), names
        else:
            assert {'standing-light', 'standing-medium', 'rising-impact', 'throw-windup', 'super-windup'} <= set(names), names
        proof[str(character)] = names
        page.keyboard.press('Space'); frozen = page.evaluate('JSON.stringify(mygoGame.match.fighters[0])')
        page.clock.run_for(500); assert page.evaluate('JSON.stringify(mygoGame.match.fighters[0])') == frozen
        page.keyboard.press('Space'); page.evaluate('jabDraws=[];mygoGame.match.hit(1,"heavy")'); page.clock.run_for(20)
        assert not page.evaluate(f'jabDraws.some(d=>d.group==="{group}"&&d.name.startsWith("jab-"))')

    setup(2); page.keyboard.press('g'); page.clock.run_for(30)
    combo('j', 0, 'penguin')
    names = set(page.evaluate('jabDraws.filter(d=>d.group==="penguin").map(d=>d.name)'))
    assert {'flipper-light', 'kick-light', 'flipper-heavy', 'kick-medium', 'call-windup'} <= names, names
    proof['penguin'] = sorted(names)
    setup(1, 1); combo('Numpad1', 1, '2p-soyo')
    assert page.evaluate('mygoGame.match.fighters[1].facing') == -1
    assert 'jab-3-impact' in page.evaluate('jabDraws.filter(d=>d.group==="jab1").map(d=>d.name)')

    phone = browser.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    phone.on('pageerror', lambda e: errors.append(str(e)))
    phone.clock.install(time='2026-01-01T00:00:00Z'); phone.goto((ROOT / 'index.html').as_uri())
    phone.wait_for_function('mygoGame.loaded'); phone.clock.pause_at('2026-01-01T00:01:00Z')
    select_game_option(phone, '#player-character', '1'); select_game_option(phone, '#mode', 'duel')
    phone.uncheck('#terrain-enabled'); start_match(phone); phone.clock.run_for(1800)
    phone.evaluate('mygoGame.match.fighters[1].x=1400')
    button = phone.locator('[data-key="KeyJ"]').bounding_box(); cdp = phone.context.new_cdp_session(phone)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': button['x'] + button['width']/2, 'y': button['y'] + button['height']/2}]})
    phone.clock.run_for(300)
    assert phone.evaluate('MygoFighter.MOVES[mygoGame.match.fighters[0].attack].chain') == 2
    phone.clock.run_for(220)
    assert phone.evaluate('MygoFighter.MOVES[mygoGame.match.fighters[0].attack].chain') == 3
    phone.screenshot(path=str(ART / 'jab-mobile.png'))
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert errors == [], errors
    assert remote == [], remote
    report = {'new_actual_drawings': 18, 'five_forms': proof, 'P2_mirrored': 'pass', 'touch_hold_chain': 'pass',
              'pause_interrupt': 'pass', 'offline': 'pass', 'errors': errors}
    (ART / 'jab-browser-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report)); browser.close()
