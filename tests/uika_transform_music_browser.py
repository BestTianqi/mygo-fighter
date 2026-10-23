"""Uika's H plays a separate Imprisoned XII track throughout her stage form."""
import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright
from ui_helpers import select_game_option,start_match,set_game_sound
from meme_skills_browser import PROBE
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'tests/artifacts'
report={'errors':[],'remote_requests':[],'checks':[]}

def begin(page,characters=(7,0)):
    select_game_option(page,'#mode','duel')
    select_game_option(page,'#player-character',str(characters[0]))
    select_game_option(page,'#opponent-character',str(characters[1]))
    page.uncheck('#terrain-enabled');start_match(page);page.clock.run_for(1800)
    page.evaluate("""()=>{mygoGame.match.fighters.forEach((f,i)=>{f.energy=100;f.x=400+i*160;});memeProbe.clear();}""")
    page.locator('#stage').focus()

def music(page,kind='starts'):
    return page.evaluate(f'memeProbe.{kind}.filter(x=>x.keys.includes("uikaImprisoned"))')
def active(page):
    return page.evaluate('[...memeProbe.active.values()].filter(x=>x.keys.includes("uikaImprisoned")).length')
def check(value,label):
    assert value,label
    report['checks'].append(label)

with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1366,'height':768})
    page.add_init_script(PROBE)
    page.on('pageerror',lambda e:report['errors'].append(str(e)))
    page.on('request',lambda r:report['remote_requests'].append(r.url) if r.url.startswith('http') else None)
    page.clock.install(time='2026-01-01T00:00:00Z')
    try:
        page.goto((ROOT/'index.html').as_uri(),timeout=120000);page.wait_for_function('mygoGame.loaded')
        page.clock.pause_at('2026-01-01T00:01:00Z')
        check(page.evaluate('!!MYGO_ASSETS.transformMusic?.uikaImprisoned'),'official music is embedded offline')
        begin(page)
        clip=page.evaluate('memeProbe.decoded.find(x=>x.keys.includes("uikaImprisoned"))')
        check(clip and 19.9<clip['duration']<20.1 and clip['rms']>.01,'a real twenty-second music excerpt decodes')
        page.keyboard.press('h');page.clock.run_for(40)
        check(len(music(page))==1 and active(page)==1,'H starts Imprisoned XII once')
        check(page.evaluate('mygoGame.match.fighters[0].energy===50&&!!mygoGame.match.fighters[0].stageForm'),'H keeps its existing cost and transformation')
        page.keyboard.press('h');page.clock.run_for(30)
        check(len(music(page))==1,'repeated H cannot restart the song')
        page.keyboard.press('j');page.clock.run_for(350)
        check(active(page)==1,'normal attacks do not interrupt the music')
        page.evaluate("mygoGame.match.hit(1,'heavy')");page.clock.run_for(100)
        check(active(page)==1,'taking damage does not interrupt the music')
        page.click('#pause');check(active(page)==0,'pause suspends music')
        page.clock.run_for(1500);page.click('#pause');page.clock.run_for(30)
        check(active(page)==1 and len(music(page))==2,'resume continues the existing track')
        page.evaluate('mygoGame.match.fighters[0].stageForm.ms=10');page.clock.run_for(40)
        check(active(page)==0,'form expiry stops the music')
        begin(page);set_game_sound(page,False);page.locator('#stage').focus();page.keyboard.press('h');page.clock.run_for(40)
        check(len(music(page))==0,'muted transformation stays silent')
        set_game_sound(page,True);begin(page);page.keyboard.press('h');page.clock.run_for(40)
        check(active(page)==1,'music plays again in a new match after muted transformation')
        set_game_sound(page,False);check(active(page)==0,'muting stops a playing track')
        set_game_sound(page,True);begin(page);page.keyboard.press('h');page.clock.run_for(40)
        check(active(page)==1,'new match resumes the transformation music channel')
        page.click('#restart');page.clock.run_for(1800)
        check(active(page)==0,'restart clears transformation music')
        begin(page);page.keyboard.press('h');page.clock.run_for(40)
        check(active(page)==1,'restarted game can play the song on a fresh transformation')
        page.evaluate('mygoGame.match.fighters[1].hp=0;mygoGame.match.endRound()');page.clock.run_for(30)
        check(active(page)==0,'round completion stops transformation music')
        begin(page,(6,0));page.keyboard.press('h');page.clock.run_for(40)
        check(len(music(page))==0,'other Mujica transformations retain their existing sound')
        begin(page,(7,7));page.keyboard.press('h');page.keyboard.press('Numpad7');page.clock.run_for(40)
        check(active(page)==2,'both Uika fighters own independent music channels')
        page.evaluate('mygoGame.match.fighters[0].stageForm.ms=10');page.clock.run_for(40)
        check(active(page)==1,'one form expiring preserves the other player music')
        assert not report['errors'],report['errors'];assert not report['remote_requests'],report['remote_requests']
        print(json.dumps(report,ensure_ascii=False,indent=2))
    except Exception:
        page.screenshot(path=str(ART/'uika-transform-music-failure.png'));raise
    finally:
        (ART/'uika-transform-music-browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf-8')
        browser.close()
