"""Play the embedded Soyo super, original recording and film on desktop and touch."""
import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from ui_helpers import select_game_option, start_match

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'tests/artifacts'
PROBE = '''() => {
  window.soyoProbe={starts:[],stops:[],decoded:[]};const names=new WeakMap();let index=0;
  const p=AudioContext.prototype,decode=p.decodeAudioData,create=p.createBufferSource;
  p.decodeAudioData=function(bytes){const key=Object.keys({...MYGO_ASSETS.penguinVoices,...MYGO_ASSETS.soyoVoices})[index++];
    return decode.call(this,bytes).then(b=>{names.set(b,key);soyoProbe.decoded.push({key,duration:b.duration});return b;});};
  p.createBufferSource=function(){const s=create.call(this),start=s.start,stop=s.stop;
    s.start=function(...args){if(names.has(this.buffer))soyoProbe.starts.push({key:names.get(this.buffer),offset:args[1]||0});return start.apply(this,args);};
    s.stop=function(...args){if(names.has(this.buffer))soyoProbe.stops.push(names.get(this.buffer));return stop.apply(this,args);};return s;};
}'''
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    errors, remote = [], []
    page = browser.new_page(viewport={'width': 1366, 'height': 768})
    page.add_init_script('(' + PROBE + ')()')
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: remote.append(r.url) if r.url.startswith('http') else None)
    page.clock.install(time='2026-01-01T00:00:00Z')
    page.goto((ROOT / 'index.html').as_uri()); page.wait_for_function('mygoGame.loaded')
    page.clock.pause_at('2026-01-01T00:01:00Z')
    select_game_option(page, '#player-character', '1')
    select_game_option(page, '#mode', 'duel'); page.uncheck('#terrain-enabled')
    start_match(page); page.clock.run_for(1800)
    page.click('#sound'); expect(page.locator('#sound')).to_have_attribute('aria-pressed', 'true')
    assert len(page.evaluate('soyoProbe.decoded')) == 6
    assert page.evaluate('soyoProbe.decoded.some(c=>c.key==="soyoSuper"&&Math.abs(c.duration-2.6)<.02)')

    def restart():
        page.click('#restart'); page.clock.run_for(1800)
        page.evaluate('''() => {const m=mygoGame.match;m.fighters[0].energy=100;m.fighters[1].x=500;
          soyoProbe.starts=[];soyoProbe.stops=[];window.soyoEvents=[];
          const drain=m.drainEvents;m.drainEvents=function(){const e=drain.call(this);soyoEvents.push(...e);return e;};}''')

    restart(); page.keyboard.press('p'); page.clock.run_for(80)
    assert page.evaluate('mygoGame.match.fighters[0].attack') == 'soyoSuper'
    assert page.evaluate('mygoGame.match.fighters[0].energy') == 0
    assert page.locator('#soyo-cutin-0').is_visible()
    assert page.evaluate('document.querySelector("#soyo-cutin-0 video").muted')
    assert page.evaluate('soyoProbe.starts.map(s=>s.key)') == ['soyoSuper']
    # Film uses the real media clock, independently of the fixed-step combat clock.
    time.sleep(.25)
    assert page.evaluate('document.querySelector("#soyo-cutin-0 video").currentTime') > 0
    assert page.evaluate('document.querySelector("#soyo-cutin-0 video").getVideoPlaybackQuality().totalVideoFrames') > 0
    page.locator('#stage').screenshot(path=str(ART / 'soyo-super-cutin.png'))
    page.keyboard.press('Space')
    before = page.evaluate('document.querySelector("#soyo-cutin-0 video").currentTime')
    assert page.evaluate('document.querySelector("#soyo-cutin-0 video").paused')
    assert not page.locator('#soyo-cutin-0').is_visible()
    state = page.evaluate('JSON.stringify(mygoGame.match.fighters)')
    time.sleep(.15); page.clock.run_for(1000)
    assert page.evaluate('JSON.stringify(mygoGame.match.fighters)') == state
    assert abs(page.evaluate('document.querySelector("#soyo-cutin-0 video").currentTime') - before) < .03
    page.keyboard.press('Space'); page.clock.run_for(30)
    assert page.locator('#soyo-cutin-0').is_visible()
    assert page.evaluate('soyoProbe.starts.length') == 2
    assert page.evaluate('soyoProbe.starts[1].offset') > 0
    page.clock.run_for(3900)
    hits = page.evaluate('soyoEvents.filter(e=>e.type==="hit"&&e.attack==="soyoSuper")')
    assert [h['damage'] for h in hits] == [8, 11, 22], hits
    assert not page.locator('#soyo-cutin-0').is_visible()

    restart(); page.keyboard.press('p'); page.clock.run_for(1100)
    page.evaluate('mygoGame.match.hit(1,"throw")'); page.clock.run_for(30)
    assert not page.locator('#soyo-cutin-0').is_visible()
    assert page.evaluate('soyoProbe.stops') == ['soyoSuper']
    restart(); page.keyboard.press('p'); page.clock.run_for(30); page.click('#restart')
    assert not page.locator('#soyo-cutin-0').is_visible()
    assert page.evaluate('document.querySelector("#soyo-cutin-0 video").paused')
    assert page.evaluate('soyoProbe.stops') == ['soyoSuper']
    page.clock.run_for(1800); page.keyboard.press('F1')
    assert '为什么要演奏春日影' in page.locator('#moves-content').inner_text()
    assert '小键盘−' in page.locator('#moves-content').inner_text()
    page.click('#close-moves')

    select_game_option(page, '#opponent-character', '1'); start_match(page); page.clock.run_for(1800)
    page.evaluate('mygoGame.match.fighters.forEach((f,i)=>{f.energy=100;f.x=i?1100:100});soyoProbe.starts=[];soyoProbe.stops=[]')
    page.keyboard.press('p'); page.keyboard.press('NumpadSubtract'); page.clock.run_for(30)
    assert page.evaluate('mygoGame.match.fighters.every(f=>f.attack==="soyoSuper"&&f.energy===0)')
    assert all(page.locator(f'#soyo-cutin-{s}').is_visible() for s in [0, 1])
    assert page.evaluate('soyoProbe.starts.map(s=>s.key)') == ['soyoSuper', 'soyoSuper']
    page.click('#sound')
    assert page.evaluate('soyoProbe.stops.length') == 2
    assert page.locator('#soyo-cutin-0').is_visible()
    page.evaluate('mygoGame.match.fighters[1].hp=0'); page.clock.run_for(200)
    assert all(not page.locator(f'#soyo-cutin-{s}').is_visible() for s in [0, 1])

    phone = browser.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    phone.on('pageerror', lambda e: errors.append(str(e)))
    phone.on('request', lambda r: remote.append(r.url) if r.url.startswith('http') else None)
    phone.clock.install(time='2026-01-01T00:00:00Z'); phone.goto((ROOT / 'index.html').as_uri())
    phone.wait_for_function('mygoGame.loaded'); phone.clock.pause_at('2026-01-01T00:01:00Z')
    select_game_option(phone, '#player-character', '1'); select_game_option(phone, '#mode', 'practice')
    phone.uncheck('#terrain-enabled'); start_match(phone); phone.clock.run_for(1800)
    button = phone.locator('[data-key="KeyP"]'); assert button.is_visible()
    assert button.inner_text() == '春日影大招'
    phone.tap('[data-key="KeyP"]'); phone.clock.run_for(80)
    assert phone.evaluate('mygoGame.match.fighters[0].attack') == 'soyoSuper'
    assert phone.locator('#soyo-cutin-0').is_visible()
    assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
    phone.screenshot(path=str(ART / 'soyo-super-mobile.png'))
    assert errors == [], errors
    assert remote == [], remote
    report = {'P_100_energy': 'pass', 'original_video_decodes_and_plays': 'pass', 'original_voice': 'pass',
              'three_hits': [h['damage'] for h in hits], 'pause_resume_media_offset': 'pass',
              'interrupt_reset_round_cleanup': 'pass', 'P2_independent': 'pass', 'mute': 'pass',
              'mobile_touch': 'pass', 'offline': 'pass', 'errors': errors}
    (ART / 'soyo-super-browser-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report)); browser.close()
