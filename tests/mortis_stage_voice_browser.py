"""Form-specific real Mortis recordings on both keyboard layouts."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from ui_helpers import select_game_option,start_match,set_game_sound
from meme_skills_browser import PROBE
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'tests/artifacts'
report={'errors':[],'remote_requests':[],'checks':[]}
def begin(page):
    select_game_option(page,'#mode','duel');select_game_option(page,'#player-character','8');select_game_option(page,'#opponent-character','8')
    page.uncheck('#terrain-enabled');start_match(page);page.clock.run_for(1800)
    page.evaluate("""()=>{mygoGame.match.fighters.forEach((f,i)=>{f.x=200+i*1200;f.energy=100;});memeProbe.clear();}""");page.locator('#stage').focus()
def starts(page,key):return page.evaluate('key=>memeProbe.starts.filter(s=>s.keys.includes(key))',key)
def check(value,label):
    assert value,label
    report['checks'].append(label)
def cast(page,key,voice):
    page.evaluate('mygoGame.match.fighters[0].energy=100;memeProbe.clear()');page.keyboard.press(key);page.clock.run_for(50)
    check(len(starts(page,voice))==1,f'{key} starts {voice} once')
    page.clock.run_for(1500)
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1366,'height':768});page.add_init_script(PROBE)
    page.on('pageerror',lambda e:report['errors'].append(str(e)))
    page.on('request',lambda r:report['remote_requests'].append(r.url) if r.url.startswith('http') else None)
    page.clock.install(time='2026-01-01T00:00:00Z')
    try:
        page.goto((ROOT/'index.html').as_uri(),timeout=120000);page.wait_for_function('mygoGame.loaded');page.clock.pause_at('2026-01-01T00:01:00Z')
        begin(page)
        for slot in 'uio':cast(page,slot,'meme_8_'+slot)
        page.evaluate('memeProbe.clear();mygoGame.match.fighters[0].energy=100');page.keyboard.press('h');page.clock.run_for(60)
        check(len(starts(page,'meme_8_stage_h'))==1,'H plays the independent Mortis arrival voice')
        check(not starts(page,'meme_8_i'),'H no longer borrows the normal I recording')
        page.keyboard.press('h');page.clock.run_for(40);check(len(starts(page,'meme_8_stage_h'))==1,'holding the transformed form never repeats H voice')
        page.click('#pause');page.clock.run_for(600);page.click('#pause');page.clock.run_for(30)
        rows=starts(page,'meme_8_stage_h');check(len(rows)==2 and rows[-1]['offset']>0,'pause resumes the original clip from its saved offset')
        for slot in 'uio':
            cast(page,slot,'meme_8_stage_'+slot)
            check(not starts(page,'meme_8_'+slot),f'{slot} stage voice is separate from normal')
        page.keyboard.down('s');page.keyboard.press('u');page.keyboard.up('s');page.clock.run_for(60)
        check(len(starts(page,'meme_8_toddler'))==1,'two-year-old gesture retains its own meme voice');page.clock.run_for(1500)
        page.keyboard.down('s');page.keyboard.press('i');page.keyboard.up('s');page.clock.run_for(60)
        check(len(starts(page,'meme_8_burger'))==1,'hamburger gesture retains its own meme voice');page.clock.run_for(1500)
        page.evaluate('mygoGame.match.fighters[0].stageForm.ms=10');page.clock.run_for(40)
        cast(page,'u','meme_8_u')
        check(not starts(page,'meme_8_stage_u'),'form expiry restores normal U voice')
        begin(page);page.keyboard.press('h');page.keyboard.press('Numpad7');page.clock.run_for(60)
        check(len(starts(page,'meme_8_stage_h'))==2,'both players transform with independent arrival sources')
        check(page.evaluate('[...memeProbe.active.values()].filter(x=>x.keys.includes("meme_8_stage_h")).length')==2,'one character voice does not replace the other channel')
        page.evaluate('memeProbe.clear()');page.keyboard.press('Numpad4');page.clock.run_for(60)
        check(len(starts(page,'meme_8_stage_u'))==1,'2P uses the same stage U recording')
        set_game_sound(page,False);page.clock.run_for(1500);page.evaluate('memeProbe.clear();mygoGame.match.fighters[0].energy=100');page.locator('#stage').focus();page.keyboard.press('o');page.clock.run_for(60)
        check(page.evaluate('mygoGame.match.fighters[0].attack')=='mujica_8_stage_o' and len(starts(page,'meme_8_stage_o'))==0,'muted stage O still casts without audio')
        set_game_sound(page,True);begin(page);page.keyboard.press('h');page.clock.run_for(60)
        check(page.evaluate('[...memeProbe.active.values()].some(x=>x.keys.includes("meme_8_stage_h"))'),'arrival audio is active before restart')
        page.click('#restart');page.clock.run_for(1800)
        check(page.evaluate('[...memeProbe.active.values()].filter(x=>x.keys.some(k=>k.startsWith("meme_8_stage_"))).length')==0,'restart clears all new stage recordings')
        check(page.evaluate('MYGO_ASSETS.memeSkills[8].variants.mujica_8_stage_super.videoRate')==1,'the existing Mortis super stays at original video speed')
        assert not report['errors'],report['errors'];assert not report['remote_requests'],report['remote_requests']
        print(json.dumps({'checks':len(report['checks']),'errors':report['errors'],'remote_requests':report['remote_requests']},ensure_ascii=False))
    except Exception:
        page.screenshot(path=str(ART/'mortis-stage-voice-failure.png'));raise
    finally:
        (ART/'mortis-stage-voice-browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf-8');browser.close()
