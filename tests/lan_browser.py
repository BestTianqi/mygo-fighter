"""Two isolated browsers sharing one authoritative LAN match."""
from pathlib import Path
import json,time
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
report={'checks':[],'errors':[]}
with sync_playwright() as p:
    b=p.chromium.launch(channel='msedge',headless=True)
    contexts=[b.new_context(viewport={'width':1280,'height':900}) for _ in range(2)]
    a,c=[ctx.new_page() for ctx in contexts]
    try:
        for page in [a,c]:
            page.on('pageerror',lambda e:report['errors'].append(str(e)))
            page.goto('http://localhost:8765',timeout=120000);page.wait_for_function('mygoGame.loaded',timeout=60000)
            page.click('#menu-lan')
        a.click('#lan-create');a.wait_for_function('document.querySelector("#lan-code").textContent.length===6')
        code=a.locator('#lan-code').inner_text();c.fill('#lan-join-code',code);c.click('#lan-join')
        a.wait_for_function('!document.querySelector("#lan-ready").disabled');c.wait_for_function('!document.querySelector("#lan-ready").disabled')
        a.select_option('#lan-arena','6');a.select_option('#lan-character','6');c.select_option('#lan-character','8')
        a.wait_for_timeout(250)
        a.click('#lan-ready');c.click('#lan-ready')
        for page in [a,c]:page.wait_for_function('mygoGame.match.phase==="fighting"&&!mygoGame.match.paused',timeout=60000)
        assert a.evaluate('mygoGame.match.fighters.map(f=>f.character)')==[6,8]
        assert c.evaluate('mygoGame.match.fighters.map(f=>f.character)')==[6,8]
        report['checks'].append('two independent browsers join, select their own characters and share host map')
        before=a.evaluate('mygoGame.match.fighters[0].x')
        for page,key in [(a,'KeyD'),(c,'KeyA')]:page.evaluate('(code)=>document.querySelector("#stage").dispatchEvent(new KeyboardEvent("keydown",{code,bubbles:true}))',key)
        a.wait_for_timeout(700)
        for page,key in [(a,'KeyD'),(c,'KeyA')]:page.evaluate('(code)=>dispatchEvent(new KeyboardEvent("keyup",{code}))',key)
        a.wait_for_timeout(150)
        a.click('#pause');a.wait_for_function('mygoGame.match.paused');c.wait_for_function('mygoGame.match.paused')
        a.wait_for_timeout(150)
        assert a.evaluate('mygoGame.match.fighters.map(f=>f.x)')==c.evaluate('mygoGame.match.fighters.map(f=>f.x)')
        assert a.evaluate('mygoGame.match.fighters[0].x')>before
        report['checks'].append('both use WASD, positions converge exactly and pause affects both')
        c.click('#overlay-action');a.wait_for_function('!mygoGame.match.paused')
        for page in [a,c]:page.evaluate('document.querySelector("#stage").dispatchEvent(new KeyboardEvent("keydown",{code:"KeyJ",bubbles:true}))')
        a.wait_for_timeout(100)
        for page in [a,c]:page.evaluate('dispatchEvent(new KeyboardEvent("keyup",{code:"KeyJ"}))')
        a.wait_for_timeout(700)
        a.click('#pause');c.wait_for_function('mygoGame.match.paused');a.wait_for_timeout(100)
        assert a.evaluate('mygoGame.match.fighters.map(f=>f.hp)')==c.evaluate('mygoGame.match.fighters.map(f=>f.hp)')
        assert min(a.evaluate('mygoGame.match.fighters.map(f=>f.hp)'))<200
        report['checks'].append('attacks and HP synchronize, guest can resume shared pause')
        a.click('#overlay-action');a.wait_for_function('!mygoGame.match.paused')
        a.evaluate('''()=>{const el=document.querySelector('#stage');for(const code of ['KeyS','KeyK'])el.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true}));for(const code of ['KeyK','KeyS'])el.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));}''')
        c.wait_for_function('mygoGame.match.fighters[0].attack==="mujica_6_normal_crouch_heavy"')
        a.wait_for_timeout(800);a.click('#pause');c.wait_for_function('mygoGame.match.paused');a.wait_for_timeout(100)
        assert a.evaluate('mygoGame.match.fighters[0].energy')==c.evaluate('mygoGame.match.fighters[0].energy')
        report['checks'].append('same-frame quick down+K retains its crouching gesture on both clients')
        c.context.set_offline(True)
        a.wait_for_function('document.querySelector("#lan-battle-status").textContent.includes("断线")',timeout=15000)
        assert a.evaluate('mygoGame.match.paused')
        c.context.set_offline(False)
        a.wait_for_function('document.querySelector("#lan-battle-status").textContent.includes("双方在线")',timeout=20000)
        report['checks'].append('network loss pauses authoritative simulation and reconnect restores both online')
        c.screenshot(path=str(ROOT/'tests/artifacts/lan-guest-battle.png'))
        a.click('#overlay-reselect');a.wait_for_function('document.querySelector("#lan-dialog").open');c.wait_for_function('document.querySelector("#lan-dialog").open')
        a.screenshot(path=str(ROOT/'tests/artifacts/lan-room.png'))
        c.click('#lan-leave');a.wait_for_function('document.querySelector("#lan-ready").disabled')
        a.click('#lan-leave')
        assert a.locator('#main-menu').is_visible()
        report['checks'].append('reselect returns both to lobby; leaving frees slot and preserves offline menu')
        assert not report['errors'],report['errors']
    finally:
        (ROOT/'tests/artifacts/lan-browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf-8');b.close()
print(json.dumps(report,ensure_ascii=False,indent=2))
