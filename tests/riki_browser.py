"""Exercise the five-character 200 HP build, including Riki's real controls and art."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from ui_helpers import select_game_option, start_match, set_game_sound
ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'tests/artifacts'
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(viewport={'width': 1366, 'height': 768})
    errors, remote = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: remote.append(r.url) if r.url.startswith('http') else None)
    page.clock.install(time='2026-01-01T00:00:00Z'); page.goto((ROOT / 'index.html').as_uri())
    page.wait_for_function('mygoGame.loaded'); page.clock.pause_at('2026-01-01T00:01:00Z')
    select_game_option(page, '#player-character', '4'); select_game_option(page, '#opponent-character', '3')
    select_game_option(page, '#mode', 'duel'); page.uncheck('#terrain-enabled'); start_match(page); page.clock.run_for(1800)
    assert page.locator('#player-character option').count() == 5
    assert page.evaluate('MYGO_ASSETS.characters[4].actionFrames.length') == 48
    assert page.locator('#name1').inner_text() == '椎名立希'
    assert page.locator('#name2').inner_text() == '要乐奈'
    assert page.locator('#hptext1').inner_text() == '200 / 200'
    assert page.locator('#hptext2').inner_text() == '200 / 200'
    set_game_sound(page, True); expect(page.locator('#sound')).to_have_attribute('aria-pressed', 'true')
    page.evaluate('''() => {window.rikiDraws=new Set(); const ctx=document.querySelector('#game').getContext('2d'),draw=ctx.drawImage,cache=new WeakMap();
      ctx.drawImage=function(...args){const im=args[0];if(!cache.has(im))cache.set(im,im.src===MYGO_ASSETS.characters[4].atlas);
        if(cache.get(im)){const f=MYGO_ASSETS.characters[4].actionFrames.find(f=>f.x===args[1]&&f.y===args[2]);if(f)rikiDraws.add(f.name);}
        return draw.apply(this,args);};}''')
    def restart(near=False):
        page.click('#restart'); page.clock.run_for(1800)
        page.evaluate(f'''() => {{const m=mygoGame.match;m.fighters.forEach((f,i)=>{{f.energy=100;f.x=i?{430 if near else 1400}:300;}});
          window.rikiEvents=[];const drain=m.drainEvents;m.drainEvents=function(){{const e=drain.call(this);rikiEvents.push(...e);return e;}};}}''')
    restart(); page.locator('#stage').screenshot(path=str(ART / 'riki-fight.png'))
    # All eighteen normals go through actual keyboard resolution.
    for stance in ['standing', 'crouch', 'air']:
        for key, button in [('j', 'light'), ('h', 'medium'), ('k', 'heavy'), ('n', 'lightKick'), ('m', 'mediumKick'), (',', 'heavyKick')]:
            restart()
            if stance == 'air': page.evaluate('mygoGame.match.fighters[0].y=200')
            if stance == 'crouch': page.keyboard.down('s')
            page.keyboard.press(key); page.clock.run_for(30)
            attack = 'riki_' + ('' if stance == 'standing' else stance + '_') + button
            assert page.evaluate('mygoGame.match.fighters[0].attack') == attack
            start = page.evaluate(f'MygoFighter.MOVES["{attack}"].start'); page.clock.run_for(start + 25)
            if stance == 'crouch': page.keyboard.up('s')
    normals = set(page.evaluate('[...rikiDraws]'))
    assert all(f'{s}-{b}' in normals for s in ['standing', 'crouch', 'air'] for b in ['light', 'medium', 'heavy', 'lightKick', 'mediumKick', 'heavyKick']), normals

    skill_checks = [('i', 'rikiRoll', 20), ('c', 'rikiRush', 15), ('u', 'rikiOverhead', 20), ('t', 'rikiShock', 30),
                    ('y', 'rikiRise', 25), ('g', 'rikiCalibrate', 25), ('l', 'rikiEight', 60), ('p', 'rikiSuper', 100)]
    for key, attack, cost in skill_checks:
        restart(); page.keyboard.press(key); page.clock.run_for(30)
        assert page.evaluate('mygoGame.match.fighters[0].attack') == attack
        assert page.evaluate('mygoGame.match.fighters[0].energy') == 100 - cost
        start = page.evaluate(f'MygoFighter.MOVES["{attack}"].start'); page.clock.run_for(start + 30)
        while page.evaluate('mygoGame.match.fighters[0].attackMs') < start + 20:
            page.clock.run_for(20)
        page.locator('#stage').screenshot(path=str(ART / f'riki-{attack}.png'))
    restart(True); page.keyboard.press('j'); page.clock.run_for(140)
    assert page.evaluate('mygoGame.match.fighters[0].beats') == 1
    assert page.locator('#hptext2').inner_text() == '193 / 200'
    page.evaluate('mygoGame.match.fighters[0].hp=100'); page.clock.run_for(30)
    assert page.locator('#hp1').evaluate('(el)=>el.style.width') == '50%'
    restart(); page.keyboard.press('g'); page.clock.run_for(400)
    assert page.evaluate('mygoGame.match.fighters[0].beats') == 2
    assert page.evaluate('mygoGame.match.fighters[0].calibrateCooldown') > 7000
    restart(); page.evaluate('mygoGame.match.fighters[0].beats=4'); page.keyboard.press('t'); page.clock.run_for(600)
    assert page.evaluate('mygoGame.match.fighters[0].beats') == 0
    assert page.evaluate('mygoGame.match.waves.map(w=>w.attack)') == ['rikiShockBoost', 'rikiShockExtra']
    page.keyboard.press('Space'); before = page.evaluate('JSON.stringify(mygoGame.match)'); page.clock.run_for(1000)
    assert page.evaluate('JSON.stringify(mygoGame.match)') == before
    page.keyboard.press('Space'); page.click('#restart'); page.clock.run_for(1800)
    assert page.evaluate('mygoGame.match.fighters[0].beats') == 0
    assert page.evaluate('mygoGame.match.waves.length') == 0
    restart(True); page.keyboard.press('l'); page.clock.run_for(3400)
    assert page.evaluate('rikiEvents.filter(e=>e.type==="hit"&&e.attack==="rikiEight").length') == 8
    page.keyboard.press('F1'); assert '终拍·全场共振' in page.locator('#moves-content').inner_text(); page.click('#close-moves')
    select_game_option(page, '#opponent-character', '4'); start_match(page); page.clock.run_for(1800)
    page.evaluate('mygoGame.match.fighters.forEach((f,i)=>{f.energy=100;f.x=i?1100:300})')
    page.keyboard.press('Numpad4'); page.clock.run_for(30)
    assert page.evaluate('mygoGame.match.fighters[1].attack') == 'rikiRoll'
    assert page.evaluate('mygoGame.match.fighters[1].energy') == 80
    # Rana remains playable after Riki and HP integration.
    select_game_option(page, '#player-character', '3'); start_match(page); page.clock.run_for(1800)
    page.evaluate('mygoGame.match.fighters[0].energy=100'); page.keyboard.press('v'); page.clock.run_for(280)
    assert page.evaluate('mygoGame.match.waves[0].attack') == 'ranaParfait'
    assert page.locator('#hptext1').inner_text() == '200 / 200'

    phone = browser.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    phone.on('pageerror', lambda e: errors.append(str(e)))
    phone.clock.install(time='2026-01-01T00:00:00Z'); phone.goto((ROOT / 'index.html').as_uri())
    phone.wait_for_function('mygoGame.loaded'); phone.clock.pause_at('2026-01-01T00:01:00Z')
    select_game_option(phone, '#player-character', '4'); select_game_option(phone, '#mode', 'practice')
    phone.uncheck('#terrain-enabled'); start_match(phone); phone.clock.run_for(1800)
    assert phone.locator('[data-key="KeyI"]').inner_text() == '滚奏连打'
    assert phone.locator('[data-key="KeyY"]').is_visible()
    assert not phone.locator('[data-key="KeyF"]').is_visible()
    phone.evaluate('mygoGame.match.fighters[1].x=1400'); phone.tap('[data-key="KeyG"]'); phone.clock.run_for(400)
    assert phone.evaluate('mygoGame.match.fighters[0].beats') == 2
    phone.clock.run_for(800); phone.tap('[data-key="KeyP"]'); phone.clock.run_for(600)
    assert phone.evaluate('mygoGame.match.fighters[0].attack') == 'rikiSuper'
    assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
    phone.screenshot(path=str(ART / 'riki-mobile.png'))
    assert errors == [], errors
    assert remote == [], remote
    report = {'five_playable': 'pass', '200_HP_and_half_bar': 'pass', 'Riki_48_frames': 48,
              '18_normals_actually_drawn': 'pass', 'eight_skills_keyboard': 'pass', 'beats_and_boost': 'pass',
              'eight_hit_combo': 'pass', 'P2': 'pass', 'Rana_parfait_retained': 'pass', 'mobile': 'pass', 'offline': 'pass', 'errors': errors}
    (ART / 'riki-browser-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report)); browser.close()
