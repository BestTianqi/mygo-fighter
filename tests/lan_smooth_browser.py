"""Two real browser clients with ordered network delay. Run against npm start.
LAN_URL=http://127.0.0.1:8080 python tests/lan_smooth_browser.py
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.getenv('LAN_URL', 'http://127.0.0.1:8080')
OUT = Path('output/lan-check')
OUT.mkdir(parents=True, exist_ok=True)
REPORT = {'runs': [], 'errors': []}
INIT = r'''
const delay = RTT / 2;
function fifo(callback) {
  let due = 0, count = 0;
  return value => {
    due = Math.max(due, performance.now() + delay + ((++count * 17) % 11) - 5 + (count % 180 === 0 ? 250 : 0));
    setTimeout(() => callback(value), Math.max(0, due - performance.now()));
  };
}
const NativeSocket = WebSocket;
window.lanTest = {states: 0, attacks: 0, last: null, sockets: [], sends: []};
window.WebSocket = class extends NativeSocket {
  constructor(...args) {
    super(...args);
    window.lanTest.sockets.push(this);
    this.delayedSend = fifo(raw => {if(this.readyState === 1) super.send(raw)});
  }
  set onmessage(handler) {
    super.onmessage = fifo(event => {
      const p = JSON.parse(event.data);
      if (p.type === 'state') {window.lanTest.states++; window.lanTest.last = p.data;}
      handler.call(this, event);
    });
  }
  send(raw) {
    const p = JSON.parse(raw);
    if(p.type === 'input') window.lanTest.sends.push({at:performance.now(),p});
    if(['input','ping'].includes(p.type)) this.delayedSend(raw);
    else super.send(raw);
  }
};
'''
with sync_playwright() as pw:
    for rtt in [20, 80, 150]:
        browsers = [pw.chromium.launch(headless=True) for _ in range(2)]
        pages = []
        try:
            for browser in browsers:
                context = browser.new_context(viewport={'width': 1100, 'height': 900}, has_touch=True)
                context.add_init_script(INIT.replace('RTT', str(rtt)))
                page = context.new_page()
                page.on('pageerror', lambda e: REPORT['errors'].append(str(e)))
                page.goto(BASE + '/?diagnostics=1')
                page.get_by_role('button', name='局域网联机', exact=True).click()
                pages.append(page)
            host, guest = pages
            host.get_by_role('button', name='创建房间', exact=True).click()
            host.wait_for_function("sessionStorage.getItem('mygo-room-v2') !== null")
            session = host.evaluate("JSON.parse(sessionStorage.getItem('mygo-room-v2'))")
            guest.get_by_role('textbox', name='房间码', exact=True).fill(session['room']['code'])
            guest.get_by_role('button', name='加入房间', exact=True).click()
            for page in pages:
                expect(page.get_by_role('button', name='准备开战', exact=True)).to_be_enabled()
            # Exercise authored transformation and ultimate video assets in LAN play.
            host.get_by_role('combobox').nth(0).select_option('6')
            guest.get_by_role('combobox').nth(0).select_option('8')
            for page in pages:
                page.get_by_role('button', name='准备开战', exact=True).click()
            for page in pages:
                expect(page.get_by_label('MyGO 格斗对战画面')).to_be_visible(timeout=60000)
                page.wait_for_function("lanTest.last?.state.phase === 'fighting'", timeout=60000)
            # Legal movement far from the opponent: input should reach prediction within two frames.
            host.wait_for_timeout(300)
            for _ in range(2):
                host.keyboard.down('a')
                host.wait_for_timeout(65)
                host.keyboard.up('a')
                host.wait_for_timeout(100)
                host.keyboard.down('d')
                host.wait_for_timeout(65)
                host.keyboard.up('d')
                host.wait_for_timeout(100)
            host.wait_for_timeout(1000)
            movement = host.evaluate('window.mygoDiagnostics.inputMotionMs')
            assert movement['n'] >= 4, movement
            assert movement['p95'] < 34, movement
            host.keyboard.down('d')
            guest.keyboard.down('a')
            host.wait_for_timeout(300)
            host.keyboard.up('d')
            guest.keyboard.up('a')
            for key in ['j', 'j', 'k', 'l', 'h', 'u', 'i', 'o']:
                host.keyboard.press(key)
                guest.keyboard.press(key)
                host.wait_for_timeout(180)
            host.get_by_role('button', name='J 攻击', exact=True).tap()
            guest.get_by_role('button', name='↑ 跳跃', exact=True).tap()
            host.wait_for_timeout(500)
            host.keyboard.press('p')
            guest.keyboard.press('p')
            host.wait_for_timeout(1200)
            host.screenshot(path=str(OUT / f'lan-{rtt}.png'))
            # Pause and restart boundaries must not replay old actions.
            host.get_by_role('button', name='暂停', exact=True).click()
            for page in pages:
                expect(page.get_by_text('对战已暂停', exact=True)).to_be_visible()
            host.get_by_role('button', name='继续对战', exact=True).click()
            for page in pages:
                expect(page.get_by_text('对战已暂停', exact=True)).not_to_be_visible()
            old_epoch = host.evaluate('lanTest.last.epoch')
            host.get_by_role('button', name='重开', exact=True).click()
            host.wait_for_function('(epoch) => lanTest.last.epoch > epoch', arg=old_epoch)
            # Force socket loss; automatic reconnect must retain a paused match.
            guest.evaluate('lanTest.sockets.at(-1).close()')
            guest.wait_for_function('lanTest.sockets.length >= 2', timeout=15000)
            for page in pages:
                expect(page.get_by_text('对战已暂停', exact=True)).to_be_visible(timeout=15000)
            host.get_by_role('button', name='继续对战', exact=True).click()
            for page in pages:
                expect(page.get_by_text('对战已暂停', exact=True)).not_to_be_visible()
                page.wait_for_function('window.mygoDiagnostics?.frameMs?.n > 30')
            REPORT['runs'].append({'rtt': rtt, 'unblockedMovement': movement, 'clients': [page.evaluate('({metrics:window.mygoDiagnostics,states:lanTest.states})') for page in pages]})
            for page in pages:
                saved = page.evaluate("JSON.parse(sessionStorage.getItem('mygo-room-v2'))")
                page.request.post(BASE + '/api/leaveroom', data={'token': saved['token']})
        finally:
            for page in pages:
                try:
                    saved = page.evaluate("JSON.parse(sessionStorage.getItem('mygo-room-v2'))")
                    if saved:
                        page.request.post(BASE + '/api/leaveroom', data={'token': saved['token']})
                except Exception:
                    pass
            for browser in browsers:
                browser.close()
    (OUT / 'browser.json').write_text(json.dumps(REPORT, indent=2))
    print(json.dumps(REPORT, indent=2))
    assert not REPORT['errors'], REPORT['errors']
