"""Verify intact idle artwork for all five Mujica members and both forms.
Run npm run build, then python tests/mujica_idle_browser.py.
"""
import functools
import http.server
import json
import os
import re
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'output/mujica-idle'
OUTPUT.mkdir(parents=True, exist_ok=True)
assets = json.loads((ROOT / 'frontend/public/assets.json').read_text('utf-8'))

class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 128

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

server = Server(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT / 'frontend/dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
report = {'errors': [], 'forms': []}
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, **({'channel': 'msedge'} if os.name == 'nt' else {}))
        page = browser.new_page(viewport={'width': 1366, 'height': 900})
        page.add_init_script('''window.idleTrace=[];window.idleAtlas='';
          const draw=CanvasRenderingContext2D.prototype.drawImage;
          CanvasRenderingContext2D.prototype.drawImage=function(...args){
            if(window.idleAtlas&&args[0]?.src?.endsWith(window.idleAtlas)){
              idleTrace.push({height:args[4],y:args[2]});if(idleTrace.length>500)idleTrace.shift();
            }
            return draw.apply(this,args);
          };''')
        page.on('pageerror', lambda e: report['errors'].append(str(e)))
        page.goto(f'http://127.0.0.1:{server.server_port}/')
        page.get_by_role('button', name='自由练习', exact=True).click()
        for character in range(5, 10):
            roster = page.get_by_role('button', name=re.compile(r'^选择[^\d]'))
            expect(roster).to_have_count(15)
            roster.nth(character).click()
            roster.nth(0).click()
            page.get_by_role('button', name='登台对战').click()
            canvas = page.get_by_label('MyGO 格斗对战画面')
            expect(canvas).to_be_visible(timeout=30000)
            for form in ['normal', 'stage']:
                art = assets['mujicaPortraits'][str(character)][form]['idle']
                page.evaluate('path=>{window.idleAtlas=path;window.idleTrace=[]}', art['atlas'])
                if form == 'stage':
                    canvas.focus()
                    page.keyboard.press('h')
                    expect(page.get_by_label('对战舞台')).to_contain_text('✦')
                page.wait_for_function('idleTrace.length>3', timeout=15000)
                page.wait_for_timeout(300)
                samples = page.evaluate('idleTrace')
                frame = art['frames'][0]
                intact = all(abs(s['height']-frame['h'])<0.01 and abs(s['y']-frame['y'])<0.01 for s in samples)
                report['forms'].append({'character': character, 'form': form,
                                        'intact': intact, 'sampleHeights': sorted(set(s['height'] for s in samples))})
                page.screenshot(path=str(OUTPUT / f'{character}-{form}.png'))
            page.evaluate("window.idleAtlas=''")
            page.get_by_role('button', name='暂停', exact=True).click()
            page.get_by_role('button', name='重新选人', exact=True).click()
        browser.close()
finally:
    server.shutdown()
    server.server_close()
    (OUTPUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), 'utf-8')
print(json.dumps(report, ensure_ascii=False, indent=2))
assert not report['errors'], report['errors']
assert len(report['forms']) == 10
assert all(entry['intact'] for entry in report['forms']), 'Idle artwork must remain intact during breathing'
