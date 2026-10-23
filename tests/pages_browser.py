"""Serve the publishing artifact below a project subpath, just like github.io."""
import functools
import http.server
import json
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
report={'errors':[],'missing':[]}
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='msedge',headless=True)
        page=browser.new_page(viewport={'width':1366,'height':900})
        page.add_init_script('''window.pagesAudio={decoded:0,starts:0};
          const decode=AudioContext.prototype.decodeAudioData,create=AudioContext.prototype.createBufferSource;
          AudioContext.prototype.decodeAudioData=function(bytes){return decode.call(this,bytes).then(buffer=>{pagesAudio.decoded++;return buffer})};
          AudioContext.prototype.createBufferSource=function(){const s=create.call(this),start=s.start;s.start=function(...args){pagesAudio.starts++;return start.apply(this,args)};return s};''')
        page.on('pageerror',lambda e:report['errors'].append(str(e)))
        page.on('response',lambda r:report['missing'].append(r.url) if r.status>=400 else None)
        page.goto(f'http://127.0.0.1:{server.server_port}/_site/',timeout=120000)
        page.wait_for_function('mygoGame.loaded',timeout=60000)
        assert page.locator('#menu-lan').is_disabled()
        page.click('#menu-duel')
        for character in [6,8]:page.click(f'.selection-character[data-character="{character}"]')
        page.click('#selection-confirm');page.wait_for_function('mygoGame.match.phase==="fighting"',timeout=60000)
        assert page.evaluate('mygoGame.match.fighters.map(f=>f.character)')==[6,8]
        assert page.locator('#sound').get_attribute('aria-pressed')=='true', 'Hosted voice URLs must not silently disable sound'
        assert page.evaluate('pagesAudio.decoded')==79
        page.evaluate('mygoGame.match.fighters[0].energy=100')
        page.locator('#stage').focus();page.keyboard.press('u');page.wait_for_timeout(100)
        assert page.evaluate('pagesAudio.starts')>0
        report['audio']={'decoded':page.evaluate('pagesAudio.decoded'),'starts':page.evaluate('pagesAudio.starts')}
        page.locator('#stage').focus();page.keyboard.press('j')
        page.screenshot(path=str(ROOT/'tests/artifacts/pages-static-battle.png'))
        page.click('#pause');page.wait_for_function('mygoGame.match.paused')
        assert not report['errors'],report['errors']
        assert not report['missing'],report['missing']
        report['checks']=['project subpath loads all media','Mujica selection and battle start','static site disables local server entry','attack and pause work']
        browser.close()
finally:
    server.shutdown();server.server_close()
    (ROOT/'tests/artifacts/pages-browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
