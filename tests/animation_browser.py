"""Observe actual atlas draws while exercising Anon's new poses with real controls."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from ui_helpers import select_game_option, start_match

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'tests/artifacts'
ART.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel='msedge')
    page = browser.new_page(viewport={'width':1366, 'height':768})
    errors, remote = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: remote.append(r.url) if r.url.startswith('http') else None)
    page.clock.install(time='2026-01-01T00:00:00Z')
    page.goto((ROOT / 'index.html').as_uri()); page.wait_for_function('mygoGame.loaded')
    page.clock.pause_at('2026-01-01T00:01:00Z')
    assert page.evaluate('MYGO_ASSETS.anonActions.frames.length') == 24
    page.evaluate('''() => {
      window.drawnActions=new Set(); const cache=new WeakMap(), ctx=document.querySelector('#game').getContext('2d'), draw=ctx.drawImage;
      ctx.drawImage=function(...args){
        const image=args[0]; if(!cache.has(image))cache.set(image,image.src===MYGO_ASSETS.anonActions.atlas);
        if(cache.get(image)){const f=MYGO_ASSETS.anonActions.frames.find(f=>f.x===args[1]&&f.y===args[2]);if(f)drawnActions.add(f.name);}
        return draw.apply(this,args);
      };
    }''')
    page.click('#super-demo'); page.clock.run_for(1800)
    page.keyboard.down('d'); page.clock.run_for(300)
    page.keyboard.press('ShiftLeft'); page.clock.run_for(100); page.keyboard.up('d'); page.clock.run_for(650)
    page.keyboard.down('a'); page.keyboard.press('ShiftLeft'); page.clock.run_for(100); page.keyboard.up('a'); page.clock.run_for(650)
    page.keyboard.press('w'); page.clock.run_for(200)
    page.locator('#stage').screenshot(path=str(ART / 'anon-new-jump.png'))
    page.clock.run_for(1000)
    page.keyboard.press('j'); page.clock.run_for(450)
    page.keyboard.down('s'); page.keyboard.press('j'); page.clock.run_for(450); page.keyboard.up('s')
    page.keyboard.down('o'); page.clock.run_for(50)
    page.locator('#stage').screenshot(path=str(ART / 'anon-new-guard.png'))
    page.keyboard.down('s'); page.clock.run_for(50); page.keyboard.up('o'); page.keyboard.up('s'); page.clock.run_for(100)
    for key, ms in [('c',180),('y',130),(';',210),('t',260)]:
        page.click('#restart'); page.clock.run_for(1800)
        page.evaluate('mygoGame.match.fighters[1].x=850')
        page.keyboard.press(key); page.clock.run_for(ms)
        if key=='y':page.locator('#stage').screenshot(path=str(ART / 'anon-new-rising.png'))
        if key=='t':page.locator('#stage').screenshot(path=str(ART / 'anon-new-sonic.png'))
        page.clock.run_for(1500)

    select_game_option(page,'#mode','duel'); start_match(page); page.clock.run_for(1800)
    def place():
        page.evaluate('mygoGame.match.fighters[0].x=420;mygoGame.match.fighters[1].x=485')
    place(); page.keyboard.press('Numpad1'); page.clock.run_for(200); page.clock.run_for(900)
    place(); page.keyboard.down('s'); page.clock.run_for(50)
    page.keyboard.press('Numpad2'); page.clock.run_for(250); page.keyboard.up('s'); page.clock.run_for(1000)
    place(); page.keyboard.press('Numpad5'); page.clock.run_for(350)
    page.locator('#stage').screenshot(path=str(ART / 'anon-new-knockdown.png'))
    page.clock.run_for(1000)
    page.click('#restart'); page.clock.run_for(1800); place()
    page.evaluate('mygoGame.match.fighters[1].hp=1')
    page.keyboard.press('j'); page.clock.run_for(900)
    assert page.evaluate('mygoGame.match.phase') == 'roundOver'
    missing = page.evaluate('MYGO_ASSETS.anonActions.frames.map(f=>f.name).filter(name=>!drawnActions.has(name))')
    assert missing == [], missing
    assert errors == [], errors
    assert remote == [], remote
    print(json.dumps({'actual_new_sprite_draws':24,'keyboard_sequences':'pass','offline':'pass','errors':errors}))
    browser.close()
