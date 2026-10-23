"""Verify recorded voices, accelerated supers, crawl finish art and resonance through the shipped HTML."""
import base64
import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright
from ui_helpers import select_game_option, start_match
from meme_skills_browser import PROBE

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'tests/artifacts'
report={'errors':[],'remote_requests':[],'checks':[]}

def begin(page,character,stage=False,penguin=False):
    select_game_option(page,'#mode','duel')
    select_game_option(page,'#player-character',str(character))
    select_game_option(page,'#opponent-character','0')
    page.uncheck('#terrain-enabled')
    start_match(page);page.clock.run_for(1800)
    page.evaluate("""({stage,penguin})=>{const m=mygoGame.match;m.freeze=0;
      m.fighters.forEach((f,i)=>{f.energy=100;f.hp=200;f.x=480+i*150;});
      if(stage)m.fighters[0].stageForm={ms:20000};
      if(penguin)m.fighters[0].penguin={ms:20000};
      const drain=m.drainEvents.bind(m);m.drainEvents=()=>{const es=drain();memeProbe.events.push(...es);return es;};memeProbe.clear();}""",dict(stage=stage,penguin=penguin))
    page.clock.run_for(30);page.locator('#stage').focus()

def check(page,condition,label):
    assert page.evaluate(condition),label
    report['checks'].append(label)

with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1366,'height':768})
    page.add_init_script(PROBE)
    page.on('pageerror',lambda e:report['errors'].append(str(e)))
    page.on('request',lambda r:report['remote_requests'].append(r.url) if r.url.startswith('http') else None)
    page.clock.install(time='2026-01-01T00:00:00Z')
    try:
        page.goto((ROOT/'index.html').as_uri(),timeout=120000)
        page.wait_for_function('mygoGame.loaded')
        page.clock.pause_at('2026-01-01T00:01:00Z')
        begin(page,0)
        deadline=time.monotonic()+30
        while page.evaluate('memeProbe.decoded.length')<78:
            assert time.monotonic()<deadline,'all recorded audio must preload'
            time.sleep(.025)
        page.keyboard.down('s');page.keyboard.press('i');page.keyboard.up('s');page.clock.run_for(350)
        check(page,'memeProbe.starts.filter(x=>x.keys.includes("meme_0_tgw")).length===1','TGW plays its own real recording exactly once')
        check(page,'mygoGame.match.fighters[0].attack==="sonic"','down I retains the TGW attack')
        check(page,'memeProbe.decoded.find(x=>x.keys.includes("meme_0_tgw")).duration>3.6','TGW source contains the complete phrase')
        begin(page,0);page.evaluate('mygoGame.match.fighters[0].energy=9')
        page.keyboard.press('l');page.clock.run_for(30)
        check(page,'mygoGame.match.fighters[0].energy===9&&mygoGame.match.fighters[0].dashCooldown===0','insufficient resonance blocks L without charging')
        page.evaluate('mygoGame.match.fighters[0].energy=10');page.keyboard.press('l');page.clock.run_for(30)
        check(page,'mygoGame.match.fighters[0].energy===0&&mygoGame.match.fighters[0].x>650','L costs exactly ten and moves with afterimages')
        begin(page,2,penguin=True)
        old='data:audio/mpeg;base64,'+base64.b64encode((ROOT/'assets/meme-media/recordings/penguin-p.mp3').read_bytes()).decode()
        assert page.evaluate('MYGO_ASSETS.memeVoices.meme_2_penguin_p')==old
        page.keyboard.press('p');page.clock.run_for(900)
        check(page,'memeProbe.events.filter(e=>e.type==="voicePulse"&&e.attack==="penguinSuper").length===5','all five penguin waves release within one second')
        page.clock.run_for(400)  # The last ring still needs travel time after emission.
        check(page,'JSON.stringify(memeProbe.events.filter(e=>e.type==="hit"&&e.attack==="penguinSuper").map(e=>e.damage))==="[10,10,10,10,10]"','penguin five waves each deal ten damage')
        check(page,'memeProbe.starts.filter(x=>x.keys.includes("meme_2_penguin_p")).length===1','penguin restores the original audio once per cast')
        check(page,'document.querySelector("#meme-cutin-0 video").playbackRate===1','penguin movie plays at its original speed')
        page.locator('#stage').screenshot(path=str(ART/'combat-tempo-penguin.png'))
        for stage in [False,True]:
            begin(page,7,stage=stage)
            page.keyboard.press('p');page.clock.run_for(900)
            attack='mujica_7_'+('stage' if stage else 'normal')+'_super'
            check(page,f'JSON.stringify(memeProbe.events.filter(e=>e.type==="hit"&&e.attack==="{attack}").map(e=>e.damage))==="[10,10,10,10,10]"',f'Uika {stage=} crawls for five exact ten-damage hits in one second')
            check(page,'mygoGame.match.fighters[0].x>480','Uika advances while crawling')
            check(page,'document.querySelector("#meme-cutin-0 video").playbackRate===1','Uika movie plays at original speed despite one-second combat')
            check(page,'memeProbe.decoded.find(x=>x.keys.includes("meme_7_p")).duration>4.6','Uika retains her complete original-speed recording')
            page.locator('#stage').screenshot(path=str(ART/f'combat-tempo-uika-{stage}.png'))
            page.clock.run_for(200)
            check(page,'mygoGame.match.fighters[0].attack===null','Uika recovers after one second')
            check(page,'!document.querySelector("#meme-cutin-0").hidden','Uika film continues after combat recovery')
            page.keyboard.press('j');page.clock.run_for(150)
            check(page,'!document.querySelector("#meme-cutin-0").hidden','another normal does not cut the original-speed film')
            check(page,'[...memeProbe.active.values()].some(x=>x.keys.includes("meme_7_p"))','super audio survives the next normal on a separate channel')
            if not stage:
                deadline=time.monotonic()+10
                while page.evaluate('document.querySelector("#meme-cutin-0 video").readyState<2'):
                    assert time.monotonic()<deadline;time.sleep(.025)
                before=page.evaluate('document.querySelector("#meme-cutin-0 video").currentTime');started=time.monotonic()
                time.sleep(.4)
                after=page.evaluate('document.querySelector("#meme-cutin-0 video").currentTime');elapsed=time.monotonic()-started
                assert .65<(after-before)/elapsed<1.4,(before,after,elapsed)
                report['checks'].append('actual video playback advances at one real second per second')
            page.evaluate('mygoGame.match.fighters[1].hp=0;mygoGame.match.endRound()');page.clock.run_for(1100)
            check(page,"document.querySelector('#finish-art').width===240&&document.querySelector('#finish-art').height===160",'Uika finish uses the actual crawling video frame')
            page.locator('#stage').screenshot(path=str(ART/f'combat-tempo-uika-finish-{stage}.png'))
        for character,stage,key in [(2,False,'tomoriSuper'),(4,False,'rikiSuper'),(8,True,'mujica_8_stage_super'),(0,False,'super')]:
            begin(page,character,stage=stage);page.keyboard.press('p');page.clock.run_for(100)
            expected=1
            check(page,f'document.querySelector("#meme-cutin-0 video").playbackRate==={expected}',f'character {character} super media speed is {expected}x')
            check(page,f'mygoGame.match.fighters[0].attack==="{key}"',f'character {character} retains its own super')
        begin(page,1);page.keyboard.press('p');page.clock.run_for(700)
        check(page,'mygoGame.match.fighters[0].attack===null&&mygoGame.match.fighters[1].hardStun>0','Soyo accelerated release retains two-second hard control')
        page.keyboard.down('a');page.clock.run_for(100);page.keyboard.up('a')
        page.clock.run_for(1000)
        check(page,'!document.querySelector("#soyo-cutin-0").hidden&&document.querySelector("#soyo-cutin-0 video").playbackRate===1','Soyo video continues at original speed after the control wave expires')
        check(page,'mygoGame.match.fighters[0].x<480','Soyo can move freely during the control')
        for width,height in [(390,844),(844,390)]:
            page.set_viewport_size(dict(width=width,height=height));begin(page,7)
            assert page.locator('[data-key="KeyL"]').is_visible()
            assert '10' in page.locator('[data-key="KeyL"]').inner_text()
            page.keyboard.press('p');page.clock.run_for(400)
            page.locator('#stage').screenshot(path=str(ART/f'combat-tempo-mobile-{width}.png'))
        assert not report['errors'],report['errors']
        assert not report['remote_requests'],report['remote_requests']
        print(json.dumps({'checks':len(report['checks']),'errors':report['errors'],'remote_requests':report['remote_requests']},ensure_ascii=False))
    except Exception:
        page.screenshot(path=str(ART/'combat-tempo-failure.png'))
        raise
    finally:
        (ART/'combat-tempo-browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf-8')
        browser.close()
