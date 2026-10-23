"""Verify the real embedded MewType art through physical input and Canvas draws.

Run after the final asset build: python tests/mewtype_browser.py
Use --file PATH to inspect a development build. Missing art is a failure; this
script never creates or substitutes sprites.
"""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from ui_helpers import select_game_option, start_match

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'tests/artifacts'
COMMON = ['idle', 'walk-contact', 'walk-pass', 'guard-standing', 'guard-crouch',
          'dash-forward', 'dash-back', 'jump-rise', 'jump-fall', 'landing',
          'hit-high', 'hit-low', 'knockdown-fall', 'knockdown-ground', 'getup',
          'victory', 'throw-windup', 'throw-release']
SLOTS = ['jab-1', 'jab-2', 'jab-3', 'heavy', 'crouch-light', 'crouch-heavy',
         'air-light', 'air-heavy', 'skill-u', 'skill-i', 'skill-o', 'super']
CANONICAL = set(COMMON + [f'{slot}-{phase}' for slot in SLOTS
                         for phase in ['windup', 'impact', 'recover']])
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--file', type=Path, default=ROOT / 'index.html')
parser.add_argument('--characters', type=int, nargs='+', default=[10, 11, 12, 13, 14])
parser.add_argument('--channel', default='msedge')
args = parser.parse_args()
assert args.characters and all(10 <= c <= 14 for c in args.characters)
game_file = args.file.resolve()
ART.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(channel=args.channel, headless=True)
    errors, remote, failed, proof = [], [], [], []

    def observe(page):
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        page.on('request', lambda r: remote.append(r.url) if r.url.startswith(('http:', 'https:')) else None)
        page.on('requestfailed', lambda r: failed.append({'url': r.url, 'error': r.failure}))

    def load(page, early_select=False):
        observe(page)
        if early_select:
            page.add_init_script('''addEventListener('DOMContentLoaded',()=>{
              const select=document.querySelector('#player-character');select.value=''' + json.dumps(str(args.characters[0])) + ''';
              select.dispatchEvent(new Event('change',{bubbles:true}));
            });''')
        page.clock.install(time='2026-01-01T00:00:00Z')
        page.goto(game_file.as_uri())
        page.wait_for_function('window.mygoGame?.loaded', timeout=120000)
        page.clock.pause_at('2026-01-01T00:01:00Z')
        assert page.locator('#player-character option').count() == 15
        assert page.locator('#opponent-character option').count() == 15
        # These are the actual sources consumed by drawImage, not test fixtures.
        asset_info = page.evaluate('''() => Object.entries(MYGO_ASSETS.mewtypeForms).map(([id,forms])=>({
          id:Number(id),forms:Object.keys(forms),atlas:forms.virtual.atlas,
          frames:forms.virtual.frames.map(f=>({name:f.name,x:f.x,y:f.y,w:f.w,h:f.h}))}))''')
        assert sorted(a['id'] for a in asset_info) == list(range(10, 15))
        assert len({a['atlas'] for a in asset_info}) == 5, 'character atlases must not alias'
        for asset in asset_info:
            assert asset['forms'] == ['virtual'], asset['id']
            assert asset['atlas'].startswith('data:image/'), asset['id']
            assert len(asset['frames']) == 54, asset['id']
            assert {f['name'] for f in asset['frames']} == CANONICAL, asset['id']
            assert len({(f['x'], f['y']) for f in asset['frames']}) == 54, asset['id']
        page.evaluate('''() => {
          const c=document.querySelector('#game').getContext('2d'),draw=c.drawImage,cache=new WeakMap();
          window.mewtypeDraws=[];
          c.drawImage=function(...a){const im=a[0];if(!cache.has(im)){
            let found=null;for(const [id,forms] of Object.entries(MYGO_ASSETS.mewtypeForms))
              if(forms.virtual.atlas===im.src)found={id:Number(id),frames:forms.virtual.frames};cache.set(im,found);}
            const group=cache.get(im);if(group){const frame=group.frames.find(f=>f.x===a[1]&&f.y===a[2]);
              if(frame){const matrix=c.getTransform();mewtypeDraws.push({id:group.id,name:frame.name,
                alpha:c.globalAlpha,x:matrix.e,y:matrix.f,decoded:im.naturalWidth>0&&im.naturalHeight>0});}}
            return draw.apply(this,a);};
        }''')

    page = browser.new_page(viewport={'width': 1366, 'height': 768})
    load(page, early_select=True)
    assert page.locator('#menu-wordmark').inner_text() == '夢限大 MewType'
    page.screenshot(path=str(ART / 'mewtype-menu.png'))

    def setup(character, mode='duel'):
        select_game_option(page, '#player-character', str(character))
        select_game_option(page, '#opponent-character', str(character))
        select_game_option(page, '#mode', mode)
        page.uncheck('#terrain-enabled')
        start_match(page)
        page.wait_for_function(f'mygoGame.match.fighters[0].character==={character}&&document.querySelector("#loading").hidden')
        page.clock.run_for(1800)
        assert page.locator('[data-key="KeyH"]').is_hidden()

    def reset():
        page.evaluate('''()=>{const m=mygoGame.match;m.options.mode='duel';m.start();m.advance(1000);m.release();
          m.fighters.forEach((f,i)=>{f.energy=100;f.x=i?1350:200;});window.mewtypeDraws=[];}''')
        page.locator('#stage').focus()
        page.clock.run_for(30)

    def seen(character, name):
        return page.evaluate('''({character,name})=>mewtypeDraws.some(d=>d.id===character&&d.name===name&&d.decoded&&d.alpha>.6)''',
                             {'character': character, 'name': name})

    def require_pose(character, name):
        assert seen(character, name), (character, name, page.evaluate('[...new Set(mewtypeDraws.map(d=>d.name))]'))

    def check_attack(character, key, move_id, slot, cost=0, side=0, crouch=False, air=False):
        reset()
        if crouch:
            page.keyboard.down('s' if side == 0 else 'ArrowDown')
        if air:
            page.keyboard.press('w' if side == 0 else 'ArrowUp')
            page.clock.run_for(40)
        page.keyboard.press(key)
        page.clock.run_for(30)
        state = page.evaluate('''side=>{const f=mygoGame.match.fighters[side];return {attack:f.attack,energy:f.energy}}''', side)
        assert state == {'attack': move_id, 'energy': 100 - cost}, (character, key, side, state)
        require_pose(character, slot + '-windup')
        move = page.evaluate('''move=>{const m=MygoFighter.MOVES[move];return {start:m.start,end:m.end,duration:m.duration}}''', move_id)
        page.clock.run_for(move['start'] + 30)
        require_pose(character, slot + '-impact')
        if slot == 'super':
            assert page.locator('#mujica-super-title').is_visible()
            assert page.locator('#mujica-super-name').inner_text() == page.evaluate('move=>MygoFighter.MOVES[move].name', move_id)
            page.locator('#stage').screenshot(path=str(ART / f'mewtype-{character}-p{side+1}-super.png'))
        current = page.evaluate('side=>mygoGame.match.fighters[side].attackMs', side)
        page.clock.run_for(max(30, move['end'] + 50 - current))
        require_pose(character, slot + '-recover')
        if crouch:
            page.keyboard.up('s' if side == 0 else 'ArrowDown')
        page.clock.run_for(move['duration'] + 180)
        assert not errors, (character, key, errors)

    for character in args.characters:
        setup(character)
        for key, slot, cost in [('u', 'u', 20), ('i', 'i', 25), ('o', 'o', 30), ('p', 'super', 100)]:
            check_attack(character, key, f'mewtype_{character}_virtual_{slot}', 'super' if slot == 'super' else 'skill-' + slot, cost)
        check_attack(character, 'k', f'mewtype_{character}_virtual_heavy', 'heavy')
        for stance in ['crouch', 'air']:
            for key, button in [('j', 'light'), ('k', 'heavy')]:
                check_attack(character, key, f'mewtype_{character}_virtual_{stance}_{button}', stance + '-' + button,
                             crouch=stance == 'crouch', air=stance == 'air')

        reset()
        for chain, duration in [(1, 170), (2, 200), (3, 250)]:
            page.keyboard.press('j')
            page.clock.run_for(duration)
            expected = f'mewtype_{character}_virtual_light' if chain == 1 else f'mewtype_{character}_virtualJab{chain}'
            assert page.evaluate('mygoGame.match.fighters[0].attack') == expected
            for phase in ['windup', 'impact', 'recover']:
                require_pose(character, f'jab-{chain}-{phase}')
        page.locator('#stage').screenshot(path=str(ART / f'mewtype-{character}-j3.png'))

        reset()
        page.keyboard.press('h')
        page.clock.run_for(50)
        assert page.evaluate('({form:mygoGame.match.fighters[0].stageForm,energy:mygoGame.match.fighters[0].energy,attack:mygoGame.match.fighters[0].attack})') == {'form': None, 'energy': 100, 'attack': None}
        assert page.locator('[data-key="KeyH"]').is_hidden()
        assert not page.evaluate('mewtypeDraws.some(d=>d.name.startsWith("transform"))')
        page.keyboard.press('F1')
        assert page.locator('#moves-dialog').is_visible()
        assert not page.evaluate('MygoControls.bindingList(mygoGame.match.fighters[0]).some(b=>b.key==="H")')
        page.click('#close-moves')
        # Help can be opened from settings or gameplay; finish any enclosing dialog.
        if page.locator('#settings-dialog').evaluate('(dialog)=>dialog.open'):
            page.click('#close-settings')

        for key, slot, cost in [('Numpad4', 'u', 20), ('Numpad5', 'i', 25), ('Numpad6', 'o', 30), ('Numpad8', 'super', 100)]:
            check_attack(character, key, f'mewtype_{character}_virtual_{slot}', 'super' if slot == 'super' else 'skill-' + slot, cost, side=1)
        reset()
        page.keyboard.press('Numpad7')
        page.clock.run_for(30)
        assert page.evaluate('mygoGame.match.fighters[1].stageForm') is None
        assert page.evaluate('mygoGame.match.fighters[1].energy') == 100

        for side, key in [(0, 'l'), (1, 'Numpad3')]:
            reset()
            before = page.evaluate('side=>mygoGame.match.fighters[side].x', side)
            page.keyboard.press(key)
            page.clock.run_for(100)
            after = page.evaluate('side=>mygoGame.match.fighters[side].x', side)
            assert abs(after - before) > 240
            ghosts = page.evaluate('character=>mewtypeDraws.filter(d=>d.id===character&&d.alpha>.02&&d.alpha<.6)', character)
            positions = {round(d['x'], 1) for d in ghosts}
            assert len(positions) >= 4 and max(positions) - min(positions) > 45, (character, side, ghosts)
        page.locator('#stage').screenshot(path=str(ART / f'mewtype-{character}-blink-2p.png'))

        reset()
        page.keyboard.press('u')
        page.clock.run_for(30)
        page.click('#pause')
        frozen = page.evaluate('JSON.stringify(mygoGame.match.fighters)')
        page.clock.run_for(600)
        assert page.evaluate('JSON.stringify(mygoGame.match.fighters)') == frozen
        page.click('#overlay-action')
        page.clock.run_for(30)
        page.click('#home')
        frozen = page.evaluate('JSON.stringify({fighters:mygoGame.match.fighters,time:mygoGame.match.remaining,waves:mygoGame.match.waves,areas:mygoGame.match.areas})')
        page.keyboard.press('h')
        page.keyboard.press('j')
        page.clock.run_for(600)
        assert page.evaluate('JSON.stringify({fighters:mygoGame.match.fighters,time:mygoGame.match.remaining,waves:mygoGame.match.waves,areas:mygoGame.match.areas})') == frozen
        assert page.locator('#menu-wordmark').inner_text() == '夢限大 MewType'
        page.click('#menu-resume')
        page.clock.run_for(30)
        page.click('#restart')
        page.clock.run_for(1800)
        assert page.evaluate('mygoGame.match.fighters.every(f=>f.hp===200&&f.stageForm===null&&f.attack===null)')
        assert page.evaluate('!mygoGame.match.waves.length&&!mygoGame.match.areas.length')
        assert not page.evaluate('mygoGame.feedback.effects.some(e=>e.type==="blink")')

        reset()
        page.evaluate('mygoGame.match.fighters[1].hp=0;window.mewtypeDraws=[]')
        page.clock.run_for(750)
        assert page.evaluate('mygoGame.match.phase') == 'roundOver'
        require_pose(character, 'victory')
        require_pose(character, 'knockdown-ground')
        page.locator('#stage').screenshot(path=str(ART / f'mewtype-{character}-ko.png'))
        page.click('#overlay-action')
        page.clock.run_for(1800)
        assert page.evaluate('mygoGame.match.fighters.every(f=>f.hp===200&&f.stageForm===null)')
        reset()
        before_draw = page.evaluate('({round:mygoGame.match.round,wins:[...mygoGame.match.wins]})')
        page.evaluate('mygoGame.match.remaining=10;mygoGame.match.fighters.forEach(f=>f.hp=100);window.mewtypeDraws=[]')
        page.clock.run_for(750)
        assert page.evaluate('mygoGame.match.winner') == -1
        require_pose(character, 'idle')
        assert page.evaluate('({round:mygoGame.match.round,wins:[...mygoGame.match.wins]})') == before_draw
        page.click('#overlay-action')
        page.clock.run_for(1800)
        assert page.evaluate('mygoGame.match.round') == before_draw['round']

        setup(character, 'cpu')
        page.evaluate('''()=>{const m=mygoGame.match;m.start();m.advance(1000);m.fighters.forEach((f,i)=>{f.energy=100;f.x=i?500:300;});window.mewtypeDraws=[];}''')
        page.clock.run_for(8000)
        assert page.locator('#p2-tag').inner_text() == 'CPU'
        assert page.evaluate('mygoGame.match.fighters[0].hp') < 200, (character, 'CPU did not attack')
        assert page.evaluate('mygoGame.match.fighters[1].stageForm') is None
        assert page.evaluate('mewtypeDraws.some(d=>d.name.includes("impact"))')
        proof.append({'id': character, 'skills_all_three_phases': 4, 'J3_crouch_air_JK': 'pass',
                      'H_absent': 'pass', '2p_skills': 4, 'blink_both_players': 'pass',
                      'pause_menu_reset': 'pass', 'KO_draw_next_round': 'pass', 'CPU': 'pass'})
        print(f'Character {character}: actual sprite phases, keyboard, 2P, CPU, blink, pause, KO and draw passed', flush=True)

    mobile_proof = []
    for width, height in [(844, 390), (390, 844)]:
        phone = browser.new_page(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True)
        load(phone)
        select_game_option(phone, '#player-character', str(args.characters[0]))
        select_game_option(phone, '#opponent-character', str(args.characters[-1]))
        select_game_option(phone, '#mode', 'duel')
        phone.uncheck('#terrain-enabled')
        start_match(phone)
        phone.wait_for_function('document.querySelector("#loading").hidden')
        phone.clock.run_for(1800)
        assert phone.locator('[data-key="KeyH"]').is_hidden()
        assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
        for key, slot in [('KeyU', 'u'), ('KeyI', 'i'), ('KeyO', 'o'), ('KeyP', 'super')]:
            phone.evaluate('''()=>{const m=mygoGame.match;m.start();m.advance(1000);m.release();m.fighters.forEach((f,i)=>{f.energy=100;f.x=i?1400:200;});window.mewtypeDraws=[];}''')
            phone.clock.run_for(30)
            button = phone.locator(f'[data-key="{key}"]')
            assert button.is_visible()
            box = button.bounding_box()
            assert box and box['x'] >= 0 and box['x'] + box['width'] <= width + 1, (width, key, box)
            button.tap()
            phone.clock.run_for(30)
            actual = phone.evaluate('mygoGame.match.fighters[0].attack')
            assert actual == f'mewtype_{args.characters[0]}_virtual_{slot}', (width, key, actual)
            assert phone.evaluate('character=>mewtypeDraws.some(d=>d.id===character&&d.name.endsWith("windup")&&d.decoded)', args.characters[0])
        phone.screenshot(path=str(ART / f'mewtype-mobile-{width}.png'), full_page=True)
        phone.locator('#home').tap()
        frozen = phone.evaluate('JSON.stringify(mygoGame.match.fighters)')
        phone.clock.run_for(500)
        assert phone.evaluate('JSON.stringify(mygoGame.match.fighters)') == frozen
        assert phone.locator('#menu-wordmark').inner_text() == '夢限大 MewType'
        assert phone.locator('.touch-attacks').is_hidden()
        assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
        menu_end = phone.locator('.menu-secondary').bounding_box()
        footer = phone.locator('.menu-footer').bounding_box()
        assert menu_end['y'] + menu_end['height'] <= footer['y'], (width, menu_end, footer)
        phone.screenshot(path=str(ART / f'mewtype-menu-mobile-{width}.png'), full_page=True)
        phone.locator('#menu-resume').tap()
        phone.clock.run_for(30)
        assert phone.locator('[data-key="KeyH"]').is_hidden()
        mobile_proof.append({'width': width, 'height': height, 'touch_skills': 4, 'no_H': True, 'menu_resume': 'pass'})
        phone.close()

    assert not errors, errors
    assert not remote, remote
    assert not failed, failed
    report = {'file': game_file.name, 'characters': proof, 'mobile': mobile_proof,
              'embedded_frames_per_character': 54, 'offline': True, 'errors': errors,
              'remote_requests': remote, 'failed_requests': failed}
    report_name = 'mewtype-browser-report.json' if game_file.name == 'index.html' else 'mewtype-development-browser-report.json'
    (ART / report_name).write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False))
    browser.close()
