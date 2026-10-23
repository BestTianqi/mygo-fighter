"""Real mask sprites, transformation aura, Mortis recordings and resource rules offline."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from ui_helpers import select_game_option,start_match
from meme_skills_browser import PROBE
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'tests/artifacts'
report={'errors':[],'remote_requests':[],'checks':[]}
def begin(page,id):
    select_game_option(page,'#mode','duel');select_game_option(page,'#player-character',str(id));select_game_option(page,'#opponent-character','0')
    page.uncheck('#terrain-enabled');start_match(page);page.clock.run_for(1800)
    page.evaluate("""()=>{const m=mygoGame.match;m.fighters.forEach((f,i)=>{f.x=400+i*250;f.energy=100;});
      const drain=m.drainEvents.bind(m);m.drainEvents=()=>{const es=drain();memeProbe.events.push(...es);return es;};memeProbe.clear();maskProbe.draws=[];}""");page.locator('#stage').focus()
def check(page,condition,label):
    assert page.evaluate(condition),label
    report['checks'].append(label)
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1366,'height':768});page.add_init_script(PROBE)
    page.on('pageerror',lambda e:report['errors'].append(str(e)))
    page.on('request',lambda r:report['remote_requests'].append(r.url) if r.url.startswith('http') else None)
    page.clock.install(time='2026-01-01T00:00:00Z')
    try:
        page.goto((ROOT/'index.html').as_uri(),timeout=120000);page.wait_for_function('mygoGame.loaded');page.clock.pause_at('2026-01-01T00:01:00Z')
        page.evaluate("""()=>{window.maskProbe={draws:[]};const ctx=document.querySelector('#game').getContext('2d'),draw=ctx.drawImage,cache=new WeakMap();
          ctx.drawImage=function(...args){const image=args[0];if(image&&!cache.has(image))cache.set(image,Object.entries(MYGO_ASSETS.mujicaMaskForms).find(([id,art])=>art.atlas===image.src)||null);
            const entry=image&&cache.get(image);if(entry){const frame=entry[1].frames.find(f=>f.x===args[1]&&f.y===args[2]);if(frame)maskProbe.draws.push({id:+entry[0],name:frame.name,loaded:image.naturalWidth>0});}return draw.apply(this,args);};}""")
        for id in range(5,10):
            begin(page,id);page.keyboard.press('h');page.clock.run_for(80)
            for pose,ms in [('mask-take',200),('mask-raise',220),('mask-settle',280)]:
                check(page,f'maskProbe.draws.some(d=>d.id==={id}&&d.name==="{pose}"&&d.loaded)',f'{id} renders {pose} from real new artwork')
                page.locator('#stage').screenshot(path=str(ART/f'mujica-mask-{id}-{pose}.png'))
                page.clock.run_for(ms)
            check(page,'mygoGame.match.fighters[0].energy===50','mask animation preserves H cost')
            page.keyboard.press('u');page.clock.run_for(40)
            check(page,f'mygoGame.match.fighters[0].attack==="mujica_{id}_stage_u"','stage skills remain immediately usable')
        begin(page,8);page.keyboard.press('h');page.clock.run_for(800)
        page.click('#moves');help=page.locator('#moves-content').inner_text();assert '我只有两岁' in help and '我要吃汉堡' in help;page.click('#close-moves');page.clock.run_for(30)
        page.evaluate('mygoGame.match.fighters[0].energy=100')
        page.keyboard.down('s');page.keyboard.press('u');page.keyboard.up('s');page.clock.run_for(450)
        check(page,'memeProbe.starts.filter(x=>x.keys.includes("meme_8_toddler")).length===1','cry skill plays its actual community recording once')
        check(page,'mygoGame.match.fighters[1].hp===186&&mygoGame.match.fighters[0].energy===82','cry deals fourteen and gains only two resonance')
        page.locator('#stage').screenshot(path=str(ART/'mortis-toddler-cry.png'));page.clock.run_for(900)
        page.evaluate("""()=>{const [a,b]=mygoGame.match.fighters;a.x=400;b.x=800;b.hp=200;b.stun=0;b.pushVx=0;a.energy=100;}""")
        page.keyboard.down('s');page.keyboard.press('i');page.keyboard.up('s');page.clock.run_for(230)
        check(page,'mygoGame.match.waves.some(w=>w.attack==="mujica_8_stage_burger")','burger skill emits a physical forward projectile')
        check(page,'memeProbe.starts.filter(x=>x.keys.includes("meme_8_burger")).length===1','burger skill plays its own original phrase once')
        page.locator('#stage').screenshot(path=str(ART/'mortis-burger-projectile.png'));page.clock.run_for(1400)
        check(page,'mygoGame.match.fighters[1].hp===182&&mygoGame.match.fighters[0].energy===77','burger hits for eighteen and gains two resonance')
        page.evaluate("""()=>{const [a,b]=mygoGame.match.fighters;a.energy=0;a.x=400;b.x=500;b.stun=0;b.pushVx=0;}""");page.keyboard.press('j');page.clock.run_for(230)
        check(page,'mygoGame.match.fighters[0].energy===12','normal attacks regain twelve resonance')
        for width,height in [(390,844),(844,390)]:
            page.set_viewport_size(dict(width=width,height=height));begin(page,8);page.keyboard.press('h')
            page.clock.run_for(480);page.locator('#stage').screenshot(path=str(ART/f'mujica-mask-mobile-{width}.png'))
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        assert not report['errors'],report['errors'];assert not report['remote_requests'],report['remote_requests']
        print(json.dumps({'checks':len(report['checks']),'errors':report['errors'],'remote_requests':report['remote_requests']},ensure_ascii=False))
    except Exception:
        page.screenshot(path=str(ART/'mortis-mask-failure.png'));raise
    finally:
        (ART/'mortis-mask-browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf-8');browser.close()
