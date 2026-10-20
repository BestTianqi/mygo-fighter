"""Inspect real sprite draws during L, including pause and both players."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from ui_helpers import select_game_option, start_match

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'tests/artifacts'
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(viewport={'width':1366,'height':768})
    errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
    page.clock.install(time='2026-01-01T00:00:00Z')
    page.goto((ROOT/'index.html').as_uri());page.wait_for_function('mygoGame.loaded')
    page.clock.pause_at('2026-01-01T00:01:00Z')
    page.evaluate('''() => {
      const ctx=document.querySelector('#game').getContext('2d'), draw=ctx.drawImage, transform=ctx.setTransform;
      const sources=[MYGO_ASSETS.anonActions.atlas,MYGO_ASSETS.soyoActions.atlas,MYGO_ASSETS.tomoriActions.atlas,
        MYGO_ASSETS.characters[3].atlas,MYGO_ASSETS.characters[4].atlas,MYGO_ASSETS.penguin.atlas];
      const cache=new WeakMap();window.blinkDraws=[];
      ctx.setTransform=function(...args){window.blinkDraws=[];return transform.apply(this,args);};
      ctx.drawImage=function(...args){if(!cache.has(args[0]))cache.set(args[0],sources.indexOf(args[0].src));
        const group=cache.get(args[0]);if(group>=0){const m=ctx.getTransform();blinkDraws.push({group,alpha:ctx.globalAlpha,x:m.e,y:m.f});}
        return draw.apply(this,args);};
    }''')
    proof=[]
    def setup(c, penguin=False, air=False):
        select_game_option(page,'#player-character',str(c));select_game_option(page,'#opponent-character',str(c))
        select_game_option(page,'#mode','duel');page.uncheck('#terrain-enabled');start_match(page);page.clock.run_for(1800)
        page.evaluate('''({penguin,air})=>{mygoGame.match.fighters.forEach((f,i)=>{
          f.x=i?1150:100;f.energy=100;if(penguin)f.penguin={ms:20000};if(air){f.y=230;f.vy=0;}});}''',{'penguin':penguin,'air':air})
        page.clock.run_for(150)

    for c, penguin in [(0,False),(1,False),(2,False),(3,False),(4,False),(2,True)]:
        setup(c,penguin)
        group=5 if penguin else c
        page.keyboard.press('l');page.clock.run_for(30)
        traveling=page.evaluate(f'blinkDraws.filter(d=>d.group==={group}&&d.alpha>.65&&d.alpha<1)')
        assert traveling,(c,penguin,'missing visible travel transition')
        page.clock.run_for(70)
        ghosts=page.evaluate(f'blinkDraws.filter(d=>d.group==={group}&&d.alpha>.02&&d.alpha<.6)')
        positions={round(g['x'],1) for g in ghosts}
        assert len(positions)>=4,(c,penguin,ghosts)
        assert max(positions)-min(positions)>45,(c,penguin,positions)
        if c==0:
            page.locator('#stage').screenshot(path=str(ART/'blink-afterimages.png'))
            page.click('#pause');frozen=page.evaluate('JSON.stringify(mygoGame.feedback.effects)')
            page.clock.run_for(500);assert page.evaluate('JSON.stringify(mygoGame.feedback.effects)')==frozen
            page.click('#overlay-action')
        page.clock.run_for(300)
        assert not page.evaluate('mygoGame.feedback.effects.some(e=>e.type==="blink")')
        proof.append({'character':c,'penguin':penguin,'distinct_sprite_ghosts':len(positions)})

    setup(1,air=True);page.keyboard.press('Numpad3');page.clock.run_for(100)
    ghosts=page.evaluate('blinkDraws.filter(d=>d.group===1&&d.alpha>.02&&d.alpha<.6)')
    assert len({round(g['x'],1) for g in ghosts})>=4
    page.locator('#stage').screenshot(path=str(ART/'blink-air-2p.png'))
    page.click('#restart');page.clock.run_for(30)
    assert not page.evaluate('mygoGame.feedback.effects.some(e=>e.type==="blink")')
    assert not errors,errors
    report={'forms':proof,'air_2p':'pass','pause_freezes':'pass','restart_clears':'pass','errors':errors}
    (ART/'blink-afterimage-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report));browser.close()
