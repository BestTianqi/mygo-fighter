"""Exercise the menu as a player, including retained fights and mobile layout."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'tests/artifacts'
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1366,'height':768})
    errors=[];remote=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:remote.append(r.url) if r.url.startswith('http') else None)
    page.clock.install(time='2026-01-01T00:00:00Z')
    page.goto((ROOT/'index.html').as_uri());page.wait_for_function('mygoGame.loaded')
    page.clock.pause_at('2026-01-01T00:01:00Z')
    assert page.locator('#main-menu').is_visible()
    assert page.locator('#battle-screen').is_hidden()
    assert page.locator('#menu-resume').is_hidden()
    page.keyboard.press('j');page.keyboard.press('F1');page.clock.run_for(50)
    assert page.evaluate('mygoGame.match.phase')=='idle'
    assert not page.locator('dialog[open]').count()
    page.screenshot(path=str(ART/'main-menu-desktop.png'))

    page.click('#menu-help');assert page.locator('#help-dialog').is_visible()
    assert 'U / I / O' in page.locator('#help-dialog').inner_text()
    page.click('#close-help');assert page.locator('#main-menu').is_visible()
    page.click('#menu-settings');page.select_option('#player-character','4')
    page.select_option('#opponent-character','3');page.click('[data-stage="2"]')
    page.click('#close-settings');page.clock.run_for(30)
    summary=page.locator('#menu-selection').inner_text()
    assert '立希' in summary and '乐奈' in summary,summary
    page.click('#menu-start');page.clock.run_for(1800)
    assert page.locator('#main-menu').is_hidden()
    assert page.locator('#battle-screen').is_visible()
    assert page.evaluate('mygoGame.match.options.mode')=='cpu'
    assert page.evaluate('mygoGame.match.fighters.map(f=>f.character)')==[4,3]
    # Use a non-attacking opponent to compare the retained match exactly.
    page.evaluate('''() => {
      const m=mygoGame.match;m.options.mode='duel';m.freeze=0;m.waves=[];
      m.fighters.forEach(f=>{f.attack=null;f.stun=f.knockdown=f.cooldown=f.landingRecovery=0;f.vx=f.vy=0;});
      m.fighters[1].x=1500;m.fighters[0].y=m.floorHeight(m.fighters[0].x);m.fighters[0].hp=137;
    }''')
    page.click('#home');assert page.locator('#main-menu').is_visible()
    assert page.locator('#menu-resume').is_visible()
    terrain=page.evaluate('JSON.stringify(mygoGame.match.options.terrain)')
    frozen=page.evaluate('JSON.stringify({f:mygoGame.match.fighters,t:mygoGame.match.remaining})')
    page.keyboard.press('l');page.clock.run_for(1500)
    assert page.evaluate('JSON.stringify({f:mygoGame.match.fighters,t:mygoGame.match.remaining})')==frozen
    page.click('#menu-settings');page.select_option('#player-character','0')
    page.click('[data-stage="5"]');page.uncheck('#terrain-enabled');page.click('#close-settings')
    assert page.evaluate('JSON.stringify(mygoGame.match.options.terrain)')==terrain
    assert page.evaluate('JSON.stringify({f:mygoGame.match.fighters,t:mygoGame.match.remaining})')==frozen
    page.click('#menu-help');assert '爱音' in page.locator('#help-player-name').inner_text()
    page.click('#close-help');page.clock.run_for(100)
    assert page.evaluate('mygoGame.match.paused')
    page.click('#menu-resume');page.clock.run_for(30)
    assert page.locator('#main-menu').is_hidden()
    assert not page.evaluate('mygoGame.match.paused')
    assert '立希' in page.locator('#help-player-name').inner_text()
    assert page.evaluate('mygoGame.match.fighters[0].hp')==137
    page.keyboard.press('j');page.clock.run_for(30)
    assert page.evaluate('mygoGame.match.fighters[0].attack')=='riki_light'

    page.click('#home');page.click('#menu-practice');page.clock.run_for(1800)
    assert page.evaluate('mygoGame.match.options.mode')=='practice'
    assert page.evaluate('mygoGame.match.options.terrain') is None
    assert page.locator('#timer').inner_text()=='∞'
    page.click('#settings');page.click('[data-stage="1"]');page.check('#terrain-enabled')
    assert page.evaluate('JSON.stringify(mygoGame.match.options.terrain)===JSON.stringify(MYGO_ASSETS.stages[1].terrain)')
    page.click('#close-settings')
    page.click('#home');page.click('#menu-duel');page.clock.run_for(1800)
    assert page.evaluate('mygoGame.match.options.mode')=='duel'
    assert page.locator('#p2-tag').inner_text()=='2P'
    page.keyboard.press('Numpad1');page.clock.run_for(30)
    assert page.evaluate('mygoGame.match.fighters[1].attack')=='rana_light'
    page.click('#home');page.click('#menu-settings');page.select_option('#player-character','2')
    page.click('#start');page.clock.run_for(1800)
    assert page.locator('#main-menu').is_hidden()
    assert page.evaluate('mygoGame.match.fighters[0].character')==2
    page.locator('#stage').screenshot(path=str(ART/'main-menu-enter-fight.png'))

    for width,height in [(390,844),(844,390),(667,375)]:
        phone=browser.new_page(viewport={'width':width,'height':height},is_mobile=True,has_touch=True)
        phone.on('pageerror',lambda e:errors.append(str(e)))
        phone.clock.install(time='2026-01-01T00:00:00Z');phone.goto((ROOT/'index.html').as_uri())
        phone.wait_for_function('mygoGame.loaded');phone.clock.pause_at('2026-01-01T00:01:00Z')
        assert phone.locator('#main-menu').is_visible()
        assert phone.evaluate('document.documentElement.scrollWidth <= innerWidth')
        for key in ['menu-start','menu-duel','menu-practice','menu-settings','menu-help']:
            box=phone.locator('#'+key).bounding_box()
            assert box and box['x']>=0 and box['x']+box['width']<=width+1,(width,key,box)
            assert box['height']>=36,(width,key,box)
        phone.screenshot(path=str(ART/f'main-menu-mobile-{width}.png'),full_page=True)
        phone.locator('#menu-practice').tap();phone.clock.run_for(1800)
        assert phone.locator('#main-menu').is_hidden()
        phone.locator('#home').tap();assert phone.locator('#main-menu').is_visible()
        assert not phone.locator('.touch-attacks').is_visible()
        resume=phone.locator('#menu-resume').bounding_box()
        assert resume and resume['height']>=36
        last=phone.locator('#menu-help').bounding_box();footer=phone.locator('.menu-footer').bounding_box()
        assert last['y']+last['height']<=footer['y'],(width,last,footer)
        phone.screenshot(path=str(ART/f'main-menu-resume-{width}.png'),full_page=True)
        phone.close()
    assert errors==[],errors
    assert remote==[],remote
    report={'initial_menu':True,'cpu_duel_practice':'pass','settings_and_help':'pass',
        'retained_match_and_resume':'pass','mobile_sizes':[390,844,667],'offline':True,'errors':errors}
    (ART/'main-menu-browser-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report));browser.close()
