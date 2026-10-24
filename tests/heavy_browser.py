"""Exercise K, crouch+K and airborne K for all 21 playable forms in the production UI."""
import functools
import http.server
import json
import os
import re
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'output/heavy-animation'
OUTPUT.mkdir(parents=True, exist_ok=True)
assets = json.loads((ROOT / 'frontend/public/assets.json').read_text('utf-8'))

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 128

def wait_game_time(page, duration):
    page.evaluate('''duration=>new Promise(resolve=>{
      let previous=performance.now(),elapsed=0;
      function frame(now){elapsed+=Math.min(50,now-previous);previous=now;
        if(elapsed>=duration)resolve();else requestAnimationFrame(frame);}
      requestAnimationFrame(frame);
    })''', duration)

def art_for(character, form):
    if character >= 10:
        return [assets['mewtypeForms'][str(character)]['virtual']]
    if character >= 5:
        return [assets['mujicaForms'][str(character)][form]]
    if form == 'penguin':
        return [assets['penguin']]
    if character == 0:
        return [assets['anonActions'], assets['anonNormals']]
    return [[assets['soyoActions']], [assets['tomoriActions']],
            [assets['characters'][3]], [assets['characters'][4]]][character-1]

server = Server(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT / 'frontend/dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
report = {'errors': [], 'forms': []}
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, **({'channel': 'msedge'} if os.name == 'nt' else {}))
        page = browser.new_page(viewport={'width': 1366, 'height': 900})
        page.add_init_script('''window.heavyUrls=[];window.heavyTrace=[];
          const draw=CanvasRenderingContext2D.prototype.drawImage;
          CanvasRenderingContext2D.prototype.drawImage=function(...args){
            if(heavyUrls.some(url=>args[0]?.src?.endsWith(url))){
              const m=this.getTransform();
              heavyTrace.push({url:heavyUrls.find(url=>args[0].src.endsWith(url)),rect:args.slice(1,5),shear:m.c});
            }
            return draw.apply(this,args);
          };''')
        page.on('pageerror', lambda e: report['errors'].append(str(e)))
        page.goto(f'http://127.0.0.1:{server.server_port}/')
        page.get_by_role('button', name='自由练习', exact=True).click()
        for character in range(15):
            roster = page.get_by_role('button', name=re.compile(r'^选择[^\d]'))
            expect(roster).to_have_count(15)
            roster.nth(character).click()
            roster.nth(1 if character == 0 else 0).click()
            page.get_by_role('button', name='登台对战').click()
            canvas = page.get_by_label('MyGO 格斗对战画面')
            expect(canvas).to_be_visible(timeout=30000)
            wait_game_time(page, 1400)
            forms = ['normal', 'stage'] if 5 <= character < 10 else ['normal', 'penguin'] if character == 2 else ['normal']
            for form in forms:
                canvas.focus()
                if form != 'normal':
                    page.keyboard.press('h')
                    wait_game_time(page, 1000)
                art = art_for(character, form)
                frames = {(a['atlas'], f['x'], f['y'], f['w'], f['h']): f.get('name', 'normal-impact')
                          for a in art for f in a['frames'] + a.get('actionFrames', [])}
                checks = []
                page.evaluate('urls=>window.heavyUrls=urls', [a['atlas'] for a in art])
                for stance in ['standing', 'crouch', 'air']:
                    if stance == 'crouch':
                        page.keyboard.down('s')
                        wait_game_time(page, 50)
                    elif stance == 'air':
                        page.keyboard.press('w')
                        wait_game_time(page, 50)
                    page.evaluate('window.heavyTrace=[]')
                    page.keyboard.press('k')
                    wait_game_time(page, 210)
                    if stance == 'standing':
                        page.screenshot(path=str(OUTPUT / f'{character}-{form}-impact.png'))
                    wait_game_time(page, 1000)
                    if stance == 'crouch':
                        page.keyboard.up('s')
                    samples = page.evaluate('heavyTrace')
                    assert samples, (character, form, stance, 'no artwork')
                    assert all((s['url'], *s['rect']) in frames for s in samples), (character, form, stance, 'fragmented or invalid drawing')
                    poses = sorted(set(frames[(s['url'], *s['rect'])] for s in samples))
                    assert any('heavy' in pose or pose in ['normal-impact', 'crouch-flipper', 'air-flipper'] for pose in poses), (character, form, stance, poses)
                    assert any(abs(s['shear']) > 0.001 for s in samples), (character, form, stance, 'missing weight transfer')
                    checks.append({'stance': stance, 'poses': poses})
                report['forms'].append({'character': character, 'form': form, 'checks': checks})
                page.evaluate('window.heavyUrls=[]')
            page.get_by_role('button', name='暂停', exact=True).click()
            page.get_by_role('button', name='重新选人', exact=True).click()
        browser.close()
finally:
    server.shutdown()
    server.server_close()
    (OUTPUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), 'utf-8')
print(json.dumps({'errors': report['errors'], 'forms': len(report['forms']),
                  'heavySequences': sum(len(f['checks']) for f in report['forms'])}, ensure_ascii=False))
assert not report['errors'], report['errors']
assert len(report['forms']) == 21
