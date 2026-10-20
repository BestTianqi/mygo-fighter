"""Play the sourced matcha-parfait skill with real keyboard and phone touch."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from ui_helpers import select_game_option,start_match

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'tests/artifacts'
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,channel='msedge')
    page=browser.new_page(viewport={'width':1366,'height':768})
    errors,remote=[],[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:remote.append(r.url) if r.url.startswith('http') else None)
    page.clock.install(time='2026-01-01T00:00:00Z')
    page.goto((ROOT/'index.html').as_uri());page.wait_for_function('mygoGame.loaded')
    page.clock.pause_at('2026-01-01T00:01:00Z')
    select_game_option(page,'#player-character','3');select_game_option(page,'#opponent-character','0')
    select_game_option(page,'#mode','duel');page.uncheck('#terrain-enabled');start_match(page);page.clock.run_for(1800)
    page.evaluate('''() => {window.parfaitDraws=new Set();window.cupDrawCount=0;
      const ctx=document.querySelector('#game').getContext('2d'),draw=ctx.drawImage,cache=new WeakMap();
      ctx.drawImage=function(...args){const im=args[0];if(!cache.has(im))cache.set(im,im.src===MYGO_ASSETS.ranaParfaitActions.atlas?'action':im.src===MYGO_ASSETS.ranaParfait.src?'cup':'other');
        if(cache.get(im)==='action'){const f=MYGO_ASSETS.ranaParfaitActions.frames.find(f=>f.x===args[1]&&f.y===args[2]);if(f)parfaitDraws.add(f.name);}
        if(cache.get(im)==='cup')cupDrawCount++;return draw.apply(this,args);};}''')
    def restart():
        page.click('#restart');page.clock.run_for(1800)
        page.evaluate('''() => {const m=mygoGame.match;m.fighters[0].energy=100;m.fighters[1].x=900;window.parfaitEvents=[];
          const drain=m.drainEvents;m.drainEvents=function(){const events=drain.call(this);parfaitEvents.push(...events);return events;};}''')
    restart();page.keyboard.press('v');page.clock.run_for(70)
    assert page.evaluate('mygoGame.match.fighters[0].attack')=='ranaParfait'
    assert page.evaluate('mygoGame.match.fighters[0].energy')==75
    page.clock.run_for(90);page.locator('#stage').screenshot(path=str(ART/'rana-parfait-windup.png'))
    page.clock.run_for(110);assert page.evaluate('mygoGame.match.waves.length')==1
    first=page.evaluate('mygoGame.match.waves[0].y');page.clock.run_for(210)
    assert page.evaluate('mygoGame.match.waves[0].y')>first
    page.locator('#stage').screenshot(path=str(ART/'rana-parfait-flight.png'))
    assert page.evaluate('cupDrawCount')>0
    assert set(page.evaluate('[...parfaitDraws]'))=={'parfait-ready','parfait-windup','parfait-release','parfait-recover'}
    for _ in range(160):
        if page.evaluate('parfaitEvents.some(e=>e.type==="parfaitSplash")'):break
        page.clock.run_for(10)
    else:raise AssertionError('No parfait hit/splash')
    page.clock.run_for(60);assert page.evaluate('mygoGame.match.fighters[1].hp')==182
    page.locator('#stage').screenshot(path=str(ART/'rana-parfait-splash.png'))
    assert len([e for e in page.evaluate('parfaitEvents') if e.get('type')=='parfaitSplash'])==1
    restart();page.keyboard.press('v');page.clock.run_for(320)
    page.keyboard.press('Space');frozen=page.evaluate('JSON.stringify(mygoGame.match.waves)')
    page.clock.run_for(1200);assert page.evaluate('JSON.stringify(mygoGame.match.waves)')==frozen
    page.keyboard.press('Space');page.clock.run_for(100);assert page.evaluate('JSON.stringify(mygoGame.match.waves)')!=frozen
    page.click('#restart');page.clock.run_for(1800);assert page.evaluate('mygoGame.match.waves.length')==0
    page.keyboard.press('F1');assert '抹茶芭菲投掷' in page.locator('#moves-content').inner_text();assert 'End' in page.locator('#moves-content').inner_text()
    page.click('#close-moves')
    select_game_option(page,'#opponent-character','3');start_match(page);page.clock.run_for(1800)
    page.evaluate('mygoGame.match.fighters[1].energy=100');page.keyboard.press('End');page.clock.run_for(280)
    assert page.evaluate('mygoGame.match.fighters[1].attack')=='ranaParfait'
    assert page.evaluate('mygoGame.match.waves[0].owner===1&&mygoGame.match.waves[0].vx<0')
    assert page.evaluate('mygoGame.match.fighters[1].energy')==75

    mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    phone=mobile.new_page();phone.on('pageerror',lambda e:errors.append(str(e)))
    phone.clock.install(time='2026-01-01T00:00:00Z');phone.goto((ROOT/'index.html').as_uri());phone.wait_for_function('mygoGame.loaded')
    phone.clock.pause_at('2026-01-01T00:01:00Z')
    select_game_option(phone,'#player-character','3');select_game_option(phone,'#mode','practice');phone.uncheck('#terrain-enabled');start_match(phone);phone.clock.run_for(1800)
    assert phone.locator('[data-key="KeyV"]').is_visible() and phone.locator('[data-key="KeyV"]').inner_text()=='抹茶芭菲'
    phone.evaluate('mygoGame.match.fighters[1].x=1050');phone.tap('[data-key="KeyV"]');phone.clock.run_for(120)
    assert phone.evaluate('mygoGame.match.fighters[0].energy')==75
    phone.clock.run_for(320);assert phone.evaluate('mygoGame.match.waves[0].attack')=='ranaParfait'
    assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
    phone.screenshot(path=str(ART/'rana-parfait-mobile.png'))
    select_game_option(phone,'#player-character','0');start_match(phone);phone.clock.run_for(1800)
    assert phone.locator('[data-key="KeyV"]').inner_text()=='三连击'
    phone.tap('[data-key="KeyV"]');phone.clock.run_for(50);assert phone.evaluate('mygoGame.match.fighters[0].attack')=='rush'
    assert errors==[],errors
    assert remote==[],remote
    print(json.dumps({'keyboard_V':'pass','25_energy':'pass','4_actual_poses':'pass','image_projectile':'pass','arc':'pass',
      '18_damage_splash':'pass','pause_restart':'pass','2p_End':'pass','mobile':'pass','Anon_V_preserved':'pass','offline':'pass','errors':errors}))
    browser.close()
