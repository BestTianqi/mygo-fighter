"""Play the ten new normal/stage kits through physical keys and touch."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from ui_helpers import select_game_option, start_match

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'tests/artifacts'
parser=argparse.ArgumentParser()
parser.add_argument('--file',type=Path,default=ROOT/'index.html')
parser.add_argument('--characters',type=int,nargs='+',default=[6,7,5,8,9])
args=parser.parse_args()
game_file=args.file.resolve()
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1366,'height':768})
    errors=[];remote=[];proof=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:remote.append(r.url) if r.url.startswith('http') else None)
    # A selection made while the embedded artwork decodes must not break boot.
    page.add_init_script('''addEventListener('DOMContentLoaded',()=>{
      const select=document.querySelector('#player-character');select.value='''+json.dumps(str(args.characters[0]))+''';
      select.dispatchEvent(new Event('change',{bubbles:true}));
    });''')
    page.clock.install(time='2026-01-01T00:00:00Z')
    page.goto(game_file.as_uri());page.wait_for_function('mygoGame.loaded')
    page.clock.pause_at('2026-01-01T00:01:00Z')
    assert page.locator('#player-character option').count()==15
    assert page.locator('#opponent-character option').count()==15
    assert page.locator('#menu-wordmark').inner_text()=='Ave Mujica'
    page.screenshot(path=str(ART/'mujica-menu.png'))
    page.evaluate('''() => {
      const c=document.querySelector('#game').getContext('2d'),draw=c.drawImage,cache=new WeakMap();
      window.mujicaDraws=[];
      c.drawImage=function(...a){const im=a[0];if(!cache.has(im)){
        let found=null;for(const [id,forms] of Object.entries(MYGO_ASSETS.mujicaForms))for(const [form,art] of Object.entries(forms))
          if(art.atlas===im.src)found={id:Number(id),form,frames:art.frames};
        for(const [form,art]of Object.entries(MYGO_ASSETS.memeCrawlForms))if(art.atlas===im.src)found={id:7,form,frames:art.frames};
        cache.set(im,found);}
        const group=cache.get(im);if(group){const frame=group.frames.find(f=>f.x===a[1]&&f.y===a[2]);
          if(frame)mujicaDraws.push({id:group.id,form:group.form,name:frame.name,alpha:c.globalAlpha,decoded:im.naturalWidth>0&&im.naturalHeight>0});}
        return draw.apply(this,a);};
    }''')

    def setup(c, mode='duel'):
        select_game_option(page,'#player-character',str(c));select_game_option(page,'#opponent-character',str(c))
        select_game_option(page,'#mode',mode);page.uncheck('#terrain-enabled');start_match(page)
        page.wait_for_function(f'mygoGame.match.fighters[0].character==={c}&&document.querySelector("#loading").hidden')
        page.clock.run_for(1800)

    def reset(stage=False):
        page.evaluate('''()=>{const m=mygoGame.match;m.start();m.advance(1000);m.release();
          m.fighters.forEach((f,i)=>{f.energy=100;f.x=i?1350:200;});window.mujicaDraws=[];}''')
        page.locator('#stage').focus();page.clock.run_for(30)
        if stage:
            page.keyboard.press('h');page.clock.run_for(30)
            assert page.evaluate('mygoGame.match.fighters[0].energy')==50
            assert page.evaluate('mygoGame.match.fighters[0].stageForm.ms')>=19950
            page.evaluate('mygoGame.match.fighters[0].energy=100')

    for c in args.characters:
        setup(c)
        assert page.locator('#menu-selection').inner_text()
        for stage in [False,True]:
            form='stage' if stage else 'normal'
            for key,slot,cost in [('u','u',20),('i','i',25),('o','o',30),('p','super',100)]:
                reset(stage)
                move=page.evaluate(f'''()=>{{const m=MygoFighter.MOVES.mujica_{c}_{form}_{slot};return {{start:m.start,end:m.end,duration:m.duration,crawl:!!m.crawl}};}}''')
                before_x=page.evaluate('mygoGame.match.fighters[0].x')
                page.keyboard.press(key);page.clock.run_for(30)
                state=page.evaluate('({attack:mygoGame.match.fighters[0].attack,energy:mygoGame.match.fighters[0].energy})')
                assert state=={'attack':f'mujica_{c}_{form}_{slot}','energy':100-cost},(c,form,key,state)
                windup='crawl-windup' if move['crawl'] else 'super-windup' if slot=='super' else 'skill-'+slot+'-windup'
                assert page.evaluate(f'mujicaDraws.some(d=>d.id==={c}&&d.form==="{form}"&&d.name==="{windup}"&&d.decoded)')
                # Advance through release so the actual shield/wave/trap/super
                # render paths run, rather than checking only the first pose.
                page.clock.run_for(move['start']+60)
                impact='crawl-a' if move['crawl'] else 'super-impact' if slot=='super' else 'skill-'+slot+'-impact'
                assert page.evaluate(f'mujicaDraws.some(d=>d.id==={c}&&d.form==="{form}"&&d.name==="{impact}"&&d.decoded)'),(c,form,key,'impact')
                if move['crawl']:
                    page.clock.run_for(180)
                    assert page.evaluate(f'mujicaDraws.some(d=>d.id===7&&d.form==="{form}"&&d.name==="crawl-b"&&d.decoded)')
                    assert page.evaluate('mygoGame.match.fighters[0].x')>before_x+10
                    assert page.evaluate('mygoGame.match.fighters[0].crouch'), 'crawl must use the low hurtbox'
                if slot=='super':
                    assert page.locator('#mujica-super-title').is_visible()
                    assert page.locator('#mujica-super-name').inner_text()==page.evaluate(f'MygoFighter.MOVES.mujica_{c}_{form}_super.name')
                    page.locator('#stage').screenshot(path=str(ART/f'mujica-{c}-{form}-super.png'))
                current=page.evaluate('mygoGame.match.fighters[0].attackMs')
                page.clock.run_for(max(30,move['end']+50-current))
                recovery='crawl-recover' if move['crawl'] else 'super-recover' if slot=='super' else 'skill-'+slot+'-recover'
                assert page.evaluate(f'mujicaDraws.some(d=>d.id==={c}&&d.form==="{form}"&&d.name==="{recovery}"&&d.decoded)'),(c,form,key,'recover')
                page.clock.run_for(move['duration']+180)
                assert not errors,(c,form,key,errors)
            reset(stage);page.keyboard.press('j');page.clock.run_for(140)
            page.keyboard.press('j');page.clock.run_for(140)
            page.keyboard.press('j');page.clock.run_for(190)
            assert page.evaluate('MygoFighter.MOVES[mygoGame.match.fighters[0].attack].chain')==3
            for chain in [1,2,3]:
                assert page.evaluate(f'mujicaDraws.some(d=>d.id==={c}&&d.form==="{form}"&&d.name==="jab-{chain}-impact")'),(c,form,chain,page.evaluate('[...new Set(mujicaDraws.map(d=>d.name))]'))
            page.locator('#stage').screenshot(path=str(ART/f'mujica-{c}-{form}.png'))
            reset(stage);x=page.evaluate('mygoGame.match.fighters[0].x')
            page.keyboard.press('l');page.clock.run_for(100)
            assert page.evaluate('mygoGame.match.fighters[0].x')>x+240
            assert page.evaluate(f'mujicaDraws.some(d=>d.id==={c}&&d.form==="{form}"&&d.alpha<.6)')
        reset();page.keyboard.press('Numpad7');page.clock.run_for(30)
        assert page.evaluate('!!mygoGame.match.fighters[1].stageForm')
        page.keyboard.press('Numpad4');page.clock.run_for(30)
        assert page.evaluate('mygoGame.match.fighters[1].attack')==f'mujica_{c}_stage_u'
        reset(True);page.click('#home');state=page.evaluate('JSON.stringify(mygoGame.match.fighters[0])')
        page.clock.run_for(500);assert page.evaluate('JSON.stringify(mygoGame.match.fighters[0])')==state
        page.click('#menu-resume');page.clock.run_for(30)
        assert page.evaluate('!!mygoGame.match.fighters[0].stageForm')
        page.evaluate('mygoGame.match.fighters[0].stageForm.ms=30');page.clock.run_for(100)
        assert not page.evaluate('mygoGame.match.fighters[0].stageForm')
        assert '50' in page.locator('#special1').inner_text()
        reset(True);page.evaluate('mygoGame.match.fighters[1].hp=0');page.clock.run_for(750)
        assert page.evaluate('mygoGame.match.phase')=='roundOver'
        page.click('#overlay-action');page.clock.run_for(30)
        assert not page.evaluate('mygoGame.match.fighters[0].stageForm')
        assert page.locator('[data-key="KeyU"]').inner_text().endswith(page.evaluate(f'MygoFighter.MOVES.mujica_{c}_normal_u.name'))
        assert '·' not in page.locator('#name1').inner_text()
        setup(c,'cpu')
        page.evaluate('''()=>{const m=mygoGame.match;m.start();m.advance(1000);
          m.fighters.forEach((f,i)=>{f.energy=100;f.x=i?500:300;});}''')
        page.clock.run_for(5000)
        assert page.locator('#p2-tag').inner_text()=='CPU'
        assert page.evaluate('mygoGame.match.fighters[0].hp')<200,(c,'CPU did not attack')
        proof.append({'id':c,'normal_and_stage_skills':4,'normals_and_blink':'pass','2p':'pass','cpu':'pass','menu_freeze_expiry':'pass'})
        print(f'Character {c}: both forms, skills, attacks, blink, 2P, expiry and next round passed',flush=True)

    phone=browser.new_page(viewport={'width':844,'height':390},is_mobile=True,has_touch=True)
    phone.on('pageerror',lambda e:errors.append(str(e)))
    phone.clock.install(time='2026-01-01T00:00:00Z');phone.goto(game_file.as_uri())
    phone.wait_for_function('mygoGame.loaded');phone.clock.pause_at('2026-01-01T00:01:00Z')
    touch_character=args.characters[0]
    select_game_option(phone,'#player-character',str(touch_character));select_game_option(phone,'#mode','duel');start_match(phone)
    phone.wait_for_function(f'mygoGame.match.fighters[0].character==={touch_character}&&document.querySelector("#loading").hidden')
    phone.clock.run_for(1800);phone.evaluate('mygoGame.match.fighters[0].energy=100;mygoGame.match.fighters[1].x=1400')
    phone.locator('[data-key="KeyH"]').tap();phone.clock.run_for(30)
    assert phone.evaluate('!!mygoGame.match.fighters[0].stageForm')
    phone.locator('[data-key="KeyU"]').tap();phone.clock.run_for(30)
    assert phone.evaluate('mygoGame.match.fighters[0].attack')==f'mujica_{touch_character}_stage_u'
    phone.screenshot(path=str(ART/'mujica-mobile.png'))
    phone.locator('#home').tap();phone.set_viewport_size({'width':390,'height':844})
    assert phone.locator('#menu-wordmark').inner_text()=='Ave Mujica'
    assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
    menu_end=phone.locator('.menu-secondary').bounding_box();footer=phone.locator('.menu-footer').bounding_box()
    assert menu_end['y']+menu_end['height']<=footer['y']
    phone.screenshot(path=str(ART/'mujica-menu-mobile.png'),full_page=True)
    phone.locator('#menu-resume').tap();phone.clock.run_for(30)
    assert phone.evaluate('!!mygoGame.match.fighters[0].stageForm')
    assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
    phone.screenshot(path=str(ART/'mujica-mobile-portrait.png'),full_page=True)
    assert not errors,errors
    assert not remote,remote
    report={'file':game_file.name,'characters':proof,'touch_transform_skill':'pass','mobile_sizes':[844,390],'offline':True,'errors':errors}
    report_name='mujica-browser-report.json' if game_file.name=='index.html' else 'mujica-development-browser-report.json'
    (ART/report_name).write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report));browser.close()
