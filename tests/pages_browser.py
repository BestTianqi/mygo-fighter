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
        page.on('pageerror',lambda e:report['errors'].append(str(e)))
        page.on('response',lambda r:report['missing'].append(r.url) if r.status>=400 else None)
        page.goto(f'http://127.0.0.1:{server.server_port}/_site/',timeout=120000)
        page.wait_for_function('mygoGame.loaded',timeout=60000)
        assert page.locator('#menu-lan').is_disabled()
        page.click('#menu-duel')
        for character in [6,8]:page.click(f'[data-character="{character}"]')
        page.click('#selection-confirm');page.wait_for_function('mygoGame.match.phase==="fighting"',timeout=60000)
        assert page.evaluate('mygoGame.match.fighters.map(f=>f.character)')==[6,8]
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
