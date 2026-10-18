"""Real movement, camera transforms, raised/lower terrain, giant skill and touch offline."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from ui_helpers import select_game_option, start_match

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'tests/artifacts'
ART.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel='msedge')
    page = browser.new_page(viewport={'width':1366,'height':768})
    errors, remote = [], []
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:remote.append(r.url) if r.url.startswith('http') else None)
    page.clock.install(time='2026-01-01T00:00:00Z')
    page.goto((ROOT / 'index.html').as_uri());page.wait_for_function('mygoGame.loaded')
    page.clock.pause_at('2026-01-01T00:01:00Z')
    select_game_option(page,'#mode','duel');start_match(page);page.clock.run_for(1800)
    page.evaluate('''() => {
      window.fighterDraws={};const ctx=document.querySelector('#game').getContext('2d'),draw=ctx.drawImage,cache=new WeakMap();
      ctx.drawImage=function(...args){const im=args[0];if(!cache.has(im)){
        const soyo=[MYGO_ASSETS.characters[1].atlas,MYGO_ASSETS.soyoActions.atlas];
        const anon=[MYGO_ASSETS.characters[0].atlas,MYGO_ASSETS.anonActions.atlas,MYGO_ASSETS.anonNormals.atlas,MYGO_ASSETS.milkDragon.atlas];
        cache.set(im,soyo.includes(im.src)?1:anon.includes(im.src)?0:-1);
      }const side=cache.get(im);if(side>=0){const t=ctx.getTransform();fighterDraws[side]={x:t.e,y:t.f};}return draw.apply(this,args);};
    }''')
    def visible(target=page):
        result=target.evaluate('''() => {
          const m=mygoGame.match,c=mygoGame.camera;
          for(const f of m.fighters){const b=MygoCamera.fighterBounds(f);
            for(const [x,y]of[[b.left,b.top],[b.right,b.bottom]]){
              const px=480+(x-c.x)*c.zoom,py=270+(y-c.y)*c.zoom;
              if(px<63.9||px>896.1||py<103.9||py>440.1)return{x:px,y:py,c};
            }
          }return true;
        }''')
        assert result is True,result
    initial=page.evaluate('mygoGame.camera')
    page.keyboard.down('a');page.keyboard.down('ArrowRight');page.clock.run_for(6000)
    page.keyboard.up('a');page.keyboard.up('ArrowRight');page.clock.run_for(50)
    assert page.evaluate('mygoGame.match.fighters[0].x') < -600
    assert page.evaluate('mygoGame.match.fighters[1].x') > 1600
    assert page.evaluate('mygoGame.match.fighters.every(f=>f.y<0)')
    assert page.evaluate('mygoGame.camera.zoom') < initial['zoom']*.5
    visible()
    # Check that actual sprite draws use the same camera transform as the model.
    assert page.evaluate('''() => {const c=mygoGame.camera,m=mygoGame.match,canvas=document.querySelector('#game');
      return m.fighters.every((f,i)=>Math.abs(fighterDraws[i].x-(480+(f.x-c.x)*c.zoom)*canvas.width/960)<2
        &&Math.abs(fighterDraws[i].y-(270+(438-f.y-c.y)*c.zoom)*canvas.height/540)<3); }''')
    page.locator('#stage').screenshot(path=str(ART/'expanded-map-wide.png'))
    page.keyboard.press('Space');frozen=page.evaluate('JSON.stringify(mygoGame.camera)')
    page.clock.run_for(1200);assert page.evaluate('JSON.stringify(mygoGame.camera)')==frozen
    page.keyboard.press('Space');page.clock.run_for(50)
    for i in range(6):
        page.click('#settings');page.click(f'[data-stage="{i}"]');page.click('#close-settings');page.clock.run_for(50)
        visible()
    page.click('#restart');page.clock.run_for(1800)
    assert page.evaluate('Math.abs(mygoGame.camera.x-480)<1')
    page.keyboard.down('d');page.keyboard.down('ArrowRight');page.clock.run_for(3200)
    page.keyboard.up('d');page.keyboard.up('ArrowRight');page.clock.run_for(500)
    assert page.evaluate('mygoGame.camera.x') > 1000
    visible();page.locator('#stage').screenshot(path=str(ART/'expanded-map-pan.png'))

    # Put the pair on the real uppermost deck, then use ordinary jump/drop controls.
    page.evaluate('''() => {const m=mygoGame.match;m.fighters.forEach((f,i)=>Object.assign(f,{x:1400+i*80,y:480,vy:0,vx:0}));}''')
    page.clock.run_for(1500);visible()
    assert page.evaluate('mygoGame.camera.zoom') > 1
    page.keyboard.press('w');page.clock.run_for(230)
    assert page.evaluate('mygoGame.match.fighters[0].y') > 570
    visible();page.locator('#stage').screenshot(path=str(ART/'expanded-map-upper-jump.png'))
    page.clock.run_for(1000)
    assert page.evaluate('mygoGame.match.fighters[0].y') == 480
    page.keyboard.down('s');page.keyboard.press('w');page.clock.run_for(600);page.keyboard.up('s')
    assert page.evaluate('mygoGame.match.fighters[0].y') < 480
    visible()

    page.evaluate('''() => {const m=mygoGame.match;Object.assign(m.fighters[0],{x:-600,y:0,vy:0,vx:0,energy:100});
      Object.assign(m.fighters[1],{x:1480,y:480,vy:0,vx:0});}''')
    page.clock.run_for(1000);page.keyboard.press('p');page.clock.run_for(1150)
    assert page.evaluate('mygoGame.match.fighters[0].attack') == 'super'
    visible();page.locator('#stage').screenshot(path=str(ART/'expanded-map-dragon.png'))
    page.clock.run_for(2000)
    page.click('#settings');page.uncheck('#terrain-enabled');page.click('#close-settings');page.clock.run_for(1500)
    assert page.evaluate('mygoGame.match.options.terrain') is None
    assert page.evaluate('mygoGame.match.fighters.every(f=>f.y===0)')
    visible()

    mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    phone=mobile.new_page();phone.on('pageerror',lambda e:errors.append(str(e)))
    phone.clock.install(time='2026-01-01T00:00:00Z')
    phone.goto((ROOT/'index.html').as_uri());phone.wait_for_function('mygoGame.loaded')
    phone.clock.pause_at('2026-01-01T00:01:00Z')
    select_game_option(phone,'#player-character','1');select_game_option(phone,'#mode','practice')
    start_match(phone);phone.clock.run_for(1800)
    cdp=mobile.new_cdp_session(phone)
    def touch(key,ms):
        b=phone.locator(f'[data-key="{key}"]').bounding_box()
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':b['x']+b['width']/2,'y':b['y']+b['height']/2}]})
        phone.clock.run_for(ms);cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    touch('KeyA',6000);phone.clock.run_for(50)
    assert phone.evaluate('mygoGame.match.fighters[0].x') < -600
    visible(phone)
    phone.evaluate('mygoGame.match.fighters[0].hp=50');touch('KeyG',30);phone.clock.run_for(800)
    assert phone.evaluate('mygoGame.match.fighters[0].hp')==74
    assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
    phone.screenshot(path=str(ART/'expanded-map-mobile.png'))
    assert errors==[],errors
    assert remote==[],remote
    print(json.dumps({'expanded_movement':'pass','upper_lower_terrain':'pass','actual_render_camera':'pass',
        'both_fighters_visible':'pass','zoom_follow_pause_reset':'pass','six_maps':'pass','giant_skill':'pass',
        'mobile_movement_and_heal':'pass','offline':'pass','errors':errors}))
    mobile.close();browser.close()
