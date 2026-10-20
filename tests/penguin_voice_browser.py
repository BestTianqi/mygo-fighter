"""Verify the five original recordings reach real Web Audio sources offline."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from ui_helpers import select_game_option,start_match

ROOT=Path(__file__).resolve().parents[1]
PROBE='''() => {
  window.voiceProbe={decoded:[],starts:[],stops:[]};const names=new WeakMap();let decodeIndex=0;
  const proto=AudioContext.prototype,decode=proto.decodeAudioData,create=proto.createBufferSource;
   proto.decodeAudioData=function(bytes){const name=Object.keys({...MYGO_ASSETS.penguinVoices,...MYGO_ASSETS.soyoVoices})[decodeIndex++];
    return decode.call(this,bytes).then(buffer=>{names.set(buffer,name);const samples=buffer.getChannelData(0);
      let energy=0,peak=0;for(const s of samples){energy+=s*s;peak=Math.max(peak,Math.abs(s));}
      voiceProbe.decoded.push({name,duration:buffer.duration,rms:Math.sqrt(energy/samples.length),peak});return buffer;});};
  proto.createBufferSource=function(){const source=create.call(this),start=source.start,stop=source.stop;
    source.start=function(...args){if(names.has(this.buffer))voiceProbe.starts.push({name:names.get(this.buffer),offset:args[1]||0});return start.apply(this,args);};
    source.stop=function(...args){if(names.has(this.buffer))voiceProbe.stops.push(names.get(this.buffer));return stop.apply(this,args);};return source;};
}'''
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,channel='msedge')
    errors,remote=[],[]
    def setup(page):
        page.add_init_script('('+PROBE+')()')
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('request',lambda r:remote.append(r.url) if r.url.startswith('http') else None)
        page.clock.install(time='2026-01-01T00:00:00Z')
        page.goto((ROOT/'index.html').as_uri());page.wait_for_function('mygoGame.loaded')
        page.clock.pause_at('2026-01-01T00:01:00Z')
        select_game_option(page,'#player-character','2');select_game_option(page,'#opponent-character','2')
        select_game_option(page,'#mode','duel');page.uncheck('#terrain-enabled');start_match(page);page.clock.run_for(1800)
    page=browser.new_page(viewport={'width':1366,'height':768});setup(page)
    def morph():
        page.click('#restart');page.clock.run_for(1800)
        page.evaluate('mygoGame.match.fighters[0].energy=100;mygoGame.match.fighters[1].x=1200')
        page.keyboard.press('g');page.clock.run_for(850)
        page.evaluate('mygoGame.match.fighters[0].energy=100;voiceProbe.starts=[];voiceProbe.stops=[]')
    morph();page.keyboard.press('i');page.clock.run_for(600)
    assert page.evaluate('voiceProbe.starts.length')==0
    page.click('#sound');page.wait_for_function('voiceProbe.decoded.length===6')
    assert page.locator('#sound').get_attribute('aria-pressed')=='true'
    clips=page.evaluate('voiceProbe.decoded.filter(c=>c.name.startsWith("penguin"))')
    assert all(.5<c['duration']<4 and .025<c['rms']<.5 and c['peak']<.99 for c in clips),clips
    for key,name in [('c','penguinKick'),('u','penguinCry'),('i','penguinHey'),('t','penguinLaugh'),('l','penguinCall')]:
        morph();page.keyboard.press(key);page.clock.run_for(50)
        assert page.evaluate('voiceProbe.starts.map(s=>s.name)')==[name]
        page.clock.run_for(1100)
        assert page.evaluate('voiceProbe.starts.length')==1,'three pulses must not replay the whole recording'
    morph();page.keyboard.down('i');page.clock.run_for(900);page.keyboard.up('i')
    assert page.evaluate('voiceProbe.starts.length')==1
    morph();page.keyboard.press('u');page.clock.run_for(100);page.keyboard.press('Space')
    assert page.evaluate('voiceProbe.stops')==['penguinCry']
    page.clock.run_for(1200);assert page.evaluate('voiceProbe.starts.length')==1
    page.keyboard.press('Space');assert page.evaluate('voiceProbe.starts.length')==2
    assert page.evaluate('voiceProbe.starts[1].name')=='penguinCry'
    page.click('#sound');assert page.evaluate('voiceProbe.stops.length')==2
    page.clock.run_for(1000);page.keyboard.press('i');page.clock.run_for(50)
    assert page.evaluate('voiceProbe.starts.length')==2
    page.click('#sound');page.wait_for_function('document.querySelector("#sound").getAttribute("aria-pressed")==="true"')
    morph();page.keyboard.press('u');page.clock.run_for(100)
    page.evaluate('mygoGame.match.hit(1,"throw")');page.clock.run_for(20)
    assert page.evaluate('voiceProbe.stops')==['penguinCry'],page.evaluate('voiceProbe')
    morph();page.keyboard.press('u');page.clock.run_for(100);page.click('#restart')
    assert page.evaluate('voiceProbe.stops')==['penguinCry']
    morph();page.evaluate('mygoGame.match.fighters[1].energy=100')
    page.keyboard.press('Delete');page.clock.run_for(850)
    page.keyboard.press('u');page.keyboard.press('Numpad4');page.clock.run_for(50)
    assert sorted(page.evaluate('voiceProbe.starts.map(s=>s.name)'))==['penguinCry','penguinHey']
    assert page.evaluate('voiceProbe.stops')==[]
    page.evaluate('mygoGame.match.fighters[0].penguin.ms=10');page.clock.run_for(30)
    assert 'penguinCry' in page.evaluate('voiceProbe.stops')
    page.evaluate('mygoGame.match.fighters[0].hp=0');page.clock.run_for(30)
    assert 'penguinHey' in page.evaluate('voiceProbe.stops')

    mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    phone=mobile.new_page();setup(phone);phone.tap('#sound');phone.wait_for_function('voiceProbe.decoded.length===6')
    phone.evaluate('mygoGame.match.fighters[0].energy=100')
    cdp=mobile.new_cdp_session(phone)
    def tap(key):
        b=phone.locator(f'[data-key="{key}"]').bounding_box()
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':b['x']+b['width']/2,'y':b['y']+b['height']/2}]})
        phone.clock.run_for(30);cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    tap('KeyG');phone.clock.run_for(850);tap('KeyI');phone.clock.run_for(50)
    assert phone.evaluate('voiceProbe.starts.map(s=>s.name)')==['penguinHey']
    assert errors==[],errors
    assert remote==[],remote
    print(json.dumps({'original_video_clips':clips,'five_skill_recordings':'pass','mute_pause_reset_interrupt':'pass',
      'independent_P2':'pass','expiry_round_cleanup':'pass','mobile_touch_audio':'pass','offline':'pass','errors':errors}))
    browser.close()
