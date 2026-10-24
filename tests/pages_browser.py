"""Verify the production React game under a GitHub Pages project path.
Run npm run build:pages, then python tests/pages_browser.py.
Requires Python Playwright and Chromium (or installed Edge on Windows).
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
PREFIX = '/mygo-fighter/'
OUTPUT = ROOT / 'output/pages-check'
OUTPUT.mkdir(parents=True, exist_ok=True)

class ProjectHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if not self.path.startswith(PREFIX):
            self.send_error(404)
            return
        self.path = '/' + self.path[len(PREFIX):]
        super().do_GET()

    def log_message(self, *args):
        pass

class AssetServer(http.server.ThreadingHTTPServer):
    # Artwork and recordings load concurrently; avoid local-server accept queue resets.
    request_queue_size = 128

server = AssetServer(
    ('127.0.0.1', 0),
    functools.partial(ProjectHandler, directory=str(ROOT / 'frontend/dist')),
)
threading.Thread(target=server.serve_forever, daemon=True).start()
report = {'errors': [], 'missing': [], 'checks': []}
assets = json.loads((ROOT / 'frontend/public/assets.json').read_text('utf-8'))
recordings = {}
for group in ['penguinVoices', 'soyoVoices', 'memeVoices', 'summonVoices', 'transformMusic']:
    recordings.update(assets[group])
recording_count = len(recordings)

def wait_game_time(page, milliseconds):
    # The runtime caps each frame at 50 ms. On a busy renderer, wall-clock
    # sleeps can finish before an attack's recovery has advanced in-game.
    page.evaluate('''duration => new Promise(resolve => {
      let previous = performance.now(), elapsed = 0;
      function frame(now) {
        elapsed += Math.min(50, now - previous);
        previous = now;
        if (elapsed >= duration) resolve();
        else requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    })''', milliseconds)

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(
            **({'channel': 'msedge'} if os.name == 'nt' else {}), headless=True,
        )
        page = browser.new_page(viewport={'width': 1366, 'height': 900})
        page.add_init_script('''window.pagesAudio={decoded:0,starts:0};
          const decode=AudioContext.prototype.decodeAudioData,create=AudioContext.prototype.createBufferSource;
          AudioContext.prototype.decodeAudioData=function(bytes){return decode.call(this,bytes).then(buffer=>{pagesAudio.decoded++;return buffer})};
          AudioContext.prototype.createBufferSource=function(){const s=create.call(this),start=s.start;s.start=function(...args){pagesAudio.starts++;return start.apply(this,args)};return s};''')
        page.on('pageerror', lambda e: report['errors'].append(str(e)))
        def record_failed_request(request):
            # Reselecting a character closes the active super video mid-download.
            # Chromium reports this normal media cancellation as ERR_ABORTED.
            if request.resource_type == 'media' and request.failure == 'net::ERR_ABORTED':
                return
            report['missing'].append(f'{request.url}: {request.failure}')
        page.on('requestfailed', record_failed_request)
        page.on('response', lambda r: report['missing'].append(r.url) if r.status >= 400 else None)
        page.goto(f'http://127.0.0.1:{server.server_port}{PREFIX}', timeout=120000)
        page.wait_for_load_state('networkidle')
        expect(page.get_by_role('button', name='开始对战')).to_be_enabled(timeout=15000)
        expect(page.get_by_role('button', name='局域网联机 · 需本地启动')).to_be_disabled()
        page.get_by_role('button', name='自由练习', exact=True).click()
        roster = page.get_by_role('button', name=re.compile(r'^选择[^\d]'))
        expect(roster).to_have_count(15)
        roster.nth(6).click()
        roster.nth(8).click()
        page.get_by_role('button', name='登台对战').click()
        canvas = page.get_by_label('MyGO 格斗对战画面')
        expect(canvas).to_be_visible(timeout=30000)
        page.wait_for_function('count => pagesAudio.decoded === count', arg=recording_count, timeout=45000)
        page.wait_for_timeout(2000)
        expect(page.get_by_role('meter', name='1P 生命')).to_have_attribute('aria-valuenow', '200')
        canvas.focus()
        page.keyboard.press('u')
        page.wait_for_function('pagesAudio.starts > 0', timeout=5000)
        wait_game_time(page, 1000)
        page.keyboard.press('h')
        page.wait_for_timeout(800)
        expect(page.get_by_label('对战舞台')).to_contain_text('✦')
        page.screenshot(path=str(OUTPUT / 'mujica-stage-form.png'))
        page.get_by_role('button', name='暂停', exact=True).click()
        expect(page.get_by_text('对战已暂停', exact=True)).to_be_visible()
        page.get_by_role('button', name='重新选人', exact=True).click()
        roster = page.get_by_role('button', name=re.compile(r'^选择[^\d]'))
        roster.nth(0).click()
        roster.nth(1).click()
        page.get_by_role('button', name='登台对战').click()
        expect(canvas).to_be_visible(timeout=30000)
        page.wait_for_timeout(2000)
        canvas.focus()
        page.keyboard.press('p')
        page.wait_for_timeout(850)
        page.screenshot(path=str(OUTPUT / 'anon-yellow-dragon.png'))
        expect(page.get_by_role('button', name='音效开', exact=True)).to_have_attribute('aria-pressed', 'true')
        stages = json.loads((ROOT / 'frontend/public/assets.json').read_text('utf-8'))['stages']
        # Each character exercises a different authored stage. This also warms
        # every atlas and transformation family used by the retained renderer.
        for character in range(1, 15):
            page.get_by_role('button', name='暂停', exact=True).click()
            page.get_by_role('button', name='重新选人', exact=True).click()
            roster = page.get_by_role('button', name=re.compile(r'^选择[^\d]'))
            roster.nth(character).click()
            roster.nth((character + 1) % 15).click()
            page.get_by_role('button', name=stages[character]['name'], exact=True).click()
            page.get_by_role('button', name='登台对战').click()
            expect(canvas).to_be_visible(timeout=30000)
            page.wait_for_timeout(2000)
            canvas.focus()
            page.keyboard.press('j')
            wait_game_time(page, 1000)
            if character == 2 or 5 <= character <= 9:
                page.keyboard.press('h')
                page.wait_for_timeout(900)
                expect(page.get_by_label('对战舞台')).to_contain_text('✦')
            for key in ['u', 'i', 'o']:
                page.keyboard.press(key)
                page.wait_for_timeout(900)
            page.keyboard.press('p')
            page.wait_for_timeout(500)
            if character in [1, 2, 7, 8, 14]:
                page.screenshot(path=str(OUTPUT / f'character-{character}-stage-{character}.png'))
            assert not report['errors'], report['errors']
        page.get_by_role('button', name='主菜单', exact=True).click()
        page.get_by_role('button', name='3v3 车轮战', exact=True).click()
        roster = page.get_by_role('button', name=re.compile(r'^选择[^\d]'))
        for character in range(6):
            roster.nth(character).click()
        page.get_by_role('button', name='登台对战').click()
        expect(canvas).to_be_visible(timeout=30000)
        page.wait_for_timeout(2000)
        expect(page.get_by_label('对战舞台')).to_contain_text('3v3')
        page.screenshot(path=str(OUTPUT / 'three-v-three.png'))
        report['audio'] = page.evaluate('pagesAudio')
        report['checks'] = [
            'production UI and original media load under a project subpath',
            'static hosting disables the unavailable LAN server',
            '15 characters and Mujica normal/stage artwork',
            f'{recording_count} recordings decode and skills play recorded audio',
            'transformation, Anon super, pause and character reselect',
            'all 15 characters and 15 stages; normal skills and transformation families',
            '3v3 team selection and battle HUD',
        ]
        assert not report['errors'], report['errors']
        assert not report['missing'], report['missing']
        browser.close()
finally:
    server.shutdown()
    server.server_close()
    (OUTPUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), 'utf-8')
print(json.dumps(report, ensure_ascii=False, indent=2))
