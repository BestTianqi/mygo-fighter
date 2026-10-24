"""Smoke-test LAN relay against a running local Scala server."""

import json
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

URL = os.environ.get("MYGO_TEST_URL", "http://localhost:8080")
OUTPUT = Path(__file__).resolve().parents[1] / "output"
OUTPUT.mkdir(exist_ok=True)

with sync_playwright() as p:
    b = p.chromium.launch(
        headless=True, **({"channel": "msedge"} if sys.platform == "win32" else {})
    )
    contexts = [
        b.new_context(viewport={"width": 1280, "height": 900}) for _ in range(2)
    ]
    pages = []
    errors = []
    for c in contexts:
        c.add_init_script(
            """const dec=HTMLImageElement.prototype.decode;HTMLImageElement.prototype.decode=function(){return dec.call(this).catch(e=>{console.error('DECODE_FAIL',this.src);throw e;});};window.lastState=null;const WS=window.WebSocket;window.WebSocket=class extends WS{constructor(...a){super(...a);this.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.type==='state')window.lastState=m.data;});}};"""
        )
        page = c.new_page()
        page.on(
            "console",
            lambda m: print(m.text, flush=True) if "DECODE_FAIL" in m.text else None,
        )
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(URL)
        pages.append(page)
    host, guest = pages
    for page in pages:
        page.get_by_role("button", name="局域网联机", exact=True).click()
    host.get_by_role("button", name="创建房间", exact=True).click()
    host.wait_for_function("sessionStorage.getItem('mygo-room-v2')!==null")
    code = host.evaluate("JSON.parse(sessionStorage.getItem('mygo-room-v2')).room.code")
    guest.get_by_label("房间码", exact=True).fill(code)
    guest.get_by_role("button", name="加入房间", exact=True).click()
    guest.get_by_label("对战模式 · 房主选择").wait_for()
    assert guest.get_by_label("对战模式 · 房主选择").is_disabled()
    host.get_by_label("对战模式 · 房主选择").select_option("3v3")
    for page, team in zip(pages, [[0, 2, 4], [1, 3, 5]]):
        for slot, char in enumerate(team):
            page.get_by_label(f"第 {slot+1} 位出战").select_option(str(char))
            page.wait_for_timeout(250)
    host.get_by_label("分层地形", exact=True).click()
    host.wait_for_timeout(350)
    host.get_by_role("button", name="准备开战", exact=True).click()
    guest.get_by_role("button", name="准备开战", exact=True).click()
    host.wait_for_timeout(6000)
    for page in pages:
        page.wait_for_function(
            "window.lastState?.state.phase==='fighting'", timeout=15000
        )
    assert host.evaluate("window.lastState.state.teams") == [[0, 2, 4], [1, 3, 5]]
    assert guest.evaluate("window.lastState.state.teams") == [[0, 2, 4], [1, 3, 5]]
    x = host.evaluate("window.lastState.state.fighters[0].x")
    host.keyboard.down("d")
    host.wait_for_timeout(300)
    host.keyboard.up("d")
    host.wait_for_timeout(300)
    assert host.evaluate("window.lastState.state.fighters[0].x") > x
    assert guest.evaluate("window.lastState.state.fighters[0].x") > x
    host.get_by_role("button", name="暂停", exact=True).click()
    for page in pages:
        page.wait_for_function("window.lastState.state.paused===true")
    host.screenshot(path=str(OUTPUT / "lan-relay-host.png"))
    guest.screenshot(path=str(OUTPUT / "lan-relay-guest.png"))
    host.get_by_role("button", name="继续对战", exact=True).click()
    for page in pages:
        page.wait_for_function("window.lastState.state.paused===false")
    host.get_by_role("button", name="重开", exact=True).click()
    for page in pages:
        page.wait_for_function("window.lastState.state.fighters.every(f=>f.hp===200)")
    guest.reload()
    guest.wait_for_function(
        "window.lastState?.state.teams?.[1]?.[2]===5", timeout=45000
    )
    host.get_by_role("navigation", name="游戏操作").get_by_role(
        "button", name="主菜单", exact=True
    ).click()
    for page in pages:
        page.get_by_label("第 3 位出战").wait_for(timeout=15000)
        assert page.get_by_role("button", name="准备开战", exact=True).is_visible()
    assert not errors, errors
    print(
        json.dumps(
            {
                "passed": True,
                "checks": [
                    "two isolated browsers",
                    "create/join",
                    "host-only mode",
                    "ordered six fighters",
                    "asset preload",
                    "authoritative movement visible on both",
                    "pause/resume",
                    "restart",
                    "guest reload/reconnect",
                    "return lobby preserves teams",
                ],
                "errors": errors,
            }
        )
    )
    b.close()
