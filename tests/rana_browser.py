"""Exercise Rana selection, attacks, art, audio and touch in the offline game."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from ui_helpers import select_game_option,start_match

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'tests/artifacts'
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,channel='msedge')
    page=browser.new_page(viewport={'width':1366,'height':768})
    errors,remote=[],[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:remote.append(r.url) if r.url.startswith('http') else None)
    page.add_init_script('''(() => {window.ranaPitches=[];const create=AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator=function(){const osc=create.call(this),set=osc.frequency.setValueAtTime;
        osc.frequency.setValueAtTime=function(v,...args){ranaPitches.push(v);return set.call(this,v,...args);};return osc;};})()''')
    page.clock.install(time='2026-01-01T00:00:00Z')
    page.goto((ROOT/'index.html').as_uri());page.wait_for_function('mygoGame.loaded')
    page.clock.pause_at('2026-01-01T00:01:00Z')
    assert page.locator('#player-character option[value="3"]').count()==1
    assert page.evaluate('MYGO_ASSETS.characters[3].actionFrames.length')==48
    select_game_option(page,'#player-character','3');select_game_option(page,'#opponent-character','1')
    select_game_option(page,'#mode','duel');page.uncheck('#terrain-enabled');start_match(page);page.clock.run_for(1800)
    assert page.locator('#name1').inner_text()=='要乐奈'
    page.click('#sound');expect(page.locator('#sound')).to_have_attribute('aria-pressed','true')
    page.evaluate('''() => {window.ranaDraws=new Set();const ctx=document.querySelector('#game').getContext('2d'),draw=ctx.drawImage,cache=new WeakMap();
      ctx.drawImage=function(...args){const im=args[0];if(!cache.has(im))cache.set(im,im.src===MYGO_ASSETS.characters[3].atlas);
        if(cache.get(im)){const f=MYGO_ASSETS.characters[3].actionFrames.find(f=>f.x===args[1]&&f.y===args[2]);if(f)ranaDraws.add(f.name);}return draw.apply(this,args);};}''')
    def restart(close=False):
        page.click('#restart');page.clock.run_for(1800)
        page.evaluate('''close => {const m=mygoGame.match;m.fighters[0].energy=100;m.fighters[1].x=close?390:1050;window.ranaEvents=[];
          const drain=m.drainEvents;m.drainEvents=function(){const events=drain.call(this);ranaEvents.push(...events);return events;};}''',close)
    restart();x=page.evaluate('mygoGame.match.fighters[0].x')
    page.keyboard.down('d');page.clock.run_for(200);page.keyboard.up('d')
    assert abs((page.evaluate('mygoGame.match.fighters[0].x')-x)/(1.82*60*235/54*390/345*.2)-1)<.05
    page.locator('#stage').screenshot(path=str(ART/'rana-fight.png'))
    for stance in ['standing','crouch','air']:
        for key,button in [('j','light'),('h','medium'),('k','heavy'),('n','lightKick'),('m','mediumKick'),(',','heavyKick')]:
            restart()
            if stance=='crouch':page.keyboard.down('s')
            if stance=='air':page.keyboard.press('w');page.clock.run_for(180)
            page.keyboard.press(key);page.clock.run_for(260)
            assert f'{stance}-{button}' in page.evaluate('[...ranaDraws]'),(stance,button)
            if stance=='crouch':page.keyboard.up('s')
    for key,move,draw in [('i','ranaPick','pick-release'),('t','ranaChord','pick-release'),('c','ranaRush','rush-impact'),
                          ('y','ranaRise','rising-impact'),('u','ranaSlide','low-slide'),('l','ranaSolo','solo-release'),('p','ranaSuper','super-release')]:
        restart(key in ['c','u','p'])
        page.keyboard.press(key);page.clock.run_for(600 if key=='p' else 270)
        assert any(e.get('attack')==move for e in page.evaluate('ranaEvents')),move
        assert draw in page.evaluate('[...ranaDraws]'),draw
        page.locator('#stage').screenshot(path=str(ART/f'rana-{move}.png'))
        if key=='l':
            page.clock.run_for(850)
            assert len([e for e in page.evaluate('ranaEvents') if e.get('type')=='voicePulse'])==4
    restart();page.keyboard.press('w');page.clock.run_for(210);page.keyboard.press('f');page.clock.run_for(120)
    assert 'dive-impact' in page.evaluate('[...ranaDraws]')
    restart();page.evaluate('mygoGame.match.fighters[0].energy=30');page.keyboard.press('g');page.clock.run_for(500)
    assert page.evaluate('mygoGame.match.fighters[0].energy')==30
    page.keyboard.press('Space');paused=page.evaluate('mygoGame.match.fighters[0].tuneCooldown')
    page.clock.run_for(1300);assert page.evaluate('mygoGame.match.fighters[0].tuneCooldown')==paused
    page.keyboard.press('Space');page.clock.run_for(450)
    assert page.evaluate('mygoGame.match.fighters[0].energy')==50
    assert 'tune-windup' in page.evaluate('[...ranaDraws]') and 'tune-release' in page.evaluate('[...ranaDraws]')
    assert all(freq in page.evaluate('ranaPitches') for freq in [330,415,494,196,247,294,392,440])
    page.keyboard.press('F1');assert page.locator('#moves-content tbody tr').count()==29
    assert all(name in page.locator('#moves-content').inner_text() for name in ['猫掌','调弦','全力独奏','猫步滑踢'])
    assert '奶龙' not in page.locator('#moves-content').inner_text()
    page.click('#close-moves')
    select_game_option(page,'#opponent-character','3');start_match(page);page.clock.run_for(1800)
    page.evaluate('mygoGame.match.fighters[1].energy=100')
    page.keyboard.press('Numpad4');page.clock.run_for(160);assert page.evaluate('mygoGame.match.fighters[1].attack')=='ranaPick'
    # Browser side CPU uses the same authored kit, including the new projectile and rush.
    select_game_option(page,'#mode','cpu');start_match(page);page.clock.run_for(1050)
    page.evaluate('mygoGame.match.fighters[1].energy=100;mygoGame.match.aiThink=0')
    page.clock.run_for(400);assert page.evaluate('mygoGame.match.fighters[1].energy')<100

    mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    phone=mobile.new_page();phone.on('pageerror',lambda e:errors.append(str(e)))
    phone.clock.install(time='2026-01-01T00:00:00Z');phone.goto((ROOT/'index.html').as_uri());phone.wait_for_function('mygoGame.loaded')
    phone.clock.pause_at('2026-01-01T00:01:00Z')
    select_game_option(phone,'#player-character','3');select_game_option(phone,'#mode','practice');phone.uncheck('#terrain-enabled');start_match(phone);phone.clock.run_for(1800)
    for key,text in [('KeyU','猫步滑踢'),('KeyG','静心调弦'),('KeyY','琴锋上挑'),('KeyP','全力独奏')]:
        assert phone.locator(f'[data-key="{key}"]').is_visible()
        assert phone.locator(f'[data-key="{key}"]').inner_text()==text
    assert phone.locator('[data-key="KeyV"]').is_visible() and phone.locator('[data-key="KeyV"]').inner_text()=='抹茶芭菲'
    assert phone.locator('[data-key="Semicolon"]').is_hidden()
    phone.evaluate('mygoGame.match.fighters[1].x=1050')
    phone.tap('[data-key="KeyY"]');phone.clock.run_for(110);assert phone.evaluate('mygoGame.match.fighters[0].attack')=='ranaRise'
    phone.clock.run_for(1300);phone.tap('[data-key="KeyP"]');phone.clock.run_for(650)
    assert phone.evaluate('mygoGame.match.fighters[0].attack')=='ranaSuper'
    assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
    phone.screenshot(path=str(ART/'rana-mobile.png'))
    select_game_option(phone,'#player-character','0');start_match(phone);phone.clock.run_for(1800)
    assert phone.locator('[data-key="KeyU"]').inner_text()=='钢板'
    assert phone.locator('[data-key="KeyP"]').inner_text()=='奶龙大招'
    assert errors==[],errors
    assert remote==[],remote
    print(json.dumps({'selection':'pass','18_normals_rendered':'pass','9_specials':'pass','tune_pause_energy':'pass',
      'four_projectiles':'pass','guitar_audio':'pass','2p_cpu':'pass','mobile':'pass','offline':'pass','errors':errors}))
    browser.close()
