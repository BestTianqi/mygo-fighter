"""Validate all 48 transparent assets and the offline materials viewer."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'tests/artifacts'
ART.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,channel='msedge')
    page=browser.new_page(viewport={'width':1440,'height':1000})
    errors,remote=[],[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:remote.append(r.url) if r.url.startswith('http') else None)
    page.clock.install()
    page.goto((ROOT/'rana-preview.html').as_uri());page.wait_for_function('window.ranaPreviewReady')
    assert page.locator('.tile').count()==48
    assert page.locator('#group option').count()==12
    pixels=page.evaluate('''() => [...document.querySelectorAll('.tile canvas')].map(c=>{
      const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let opaque=0,clear=0,border=0;
      for(let i=3;i<data.length;i+=4){if(data[i]>220)opaque++;if(data[i]<16)clear++;}
      for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if((x===0||x===c.width-1||y===0||y===c.height-1)&&data[(y*c.width+x)*4+3]>16)border++;
      return {opaque,clear,border};})''')
    assert all(v['opaque']>800 and v['clear']>1500 and v['border']==0 for v in pixels),pixels
    for group in range(12):
        page.select_option('#group',str(group));assert page.locator('#count').inner_text()==f'{group*4+1} / 48'
        for i in range(4):
            page.select_option('#pose',page.evaluate(f'RANA_ASSETS.frames[{group*4+i}].name'))
            assert page.locator('#count').inner_text()==f'{group*4+i+1} / 48'
    page.click('#next');assert page.locator('#count').inner_text()=='1 / 48'
    page.click('#previous');assert page.locator('#count').inner_text()=='48 / 48'
    page.select_option('#group','0')
    normal=page.locator('#preview').screenshot();page.check('#mirror');assert page.locator('#preview').screenshot()!=normal
    page.uncheck('#mirror');page.check('#compare');page.locator('#preview').screenshot(path=str(ART/'rana-character-comparison.png'))
    page.uncheck('#compare');page.locator('#preview').screenshot(path=str(ART/'rana-character-preview.png'))
    page.click('#play');page.clock.run_for(1400);assert page.locator('#count').inner_text()!='1 / 48'
    page.click('#play');stopped=page.locator('#count').inner_text();page.clock.run_for(1200);assert page.locator('#count').inner_text()==stopped
    page.select_option('#group','0');page.evaluate('document.body.classList.add("proof")');page.set_viewport_size({'width':1600,'height':1000})
    page.screenshot(path=str(ART/'rana-actions-proof.png'),full_page=True)
    mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    phone=mobile.new_page();phone.on('pageerror',lambda e:errors.append(str(e)))
    phone.goto((ROOT/'rana-preview.html').as_uri());phone.wait_for_function('window.ranaPreviewReady')
    phone.select_option('#group','11');phone.tap('#next');assert phone.locator('#count').inner_text()=='46 / 48'
    assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
    phone.screenshot(path=str(ART/'rana-materials-mobile.png'))
    assert errors==[],errors
    assert remote==[],remote
    print(json.dumps({'selected_frames':48,'transparent_pixels':'pass','twelve_groups':'pass','pose_selection':'pass',
        'mirror_comparison_playback':'pass','mobile':'pass','offline':'pass','errors':errors}))
    browser.close()
