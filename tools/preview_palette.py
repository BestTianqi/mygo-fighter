"""Render every normal Anon frame from the built offline game on one neutral board.

Requires Python Playwright and local Edge. Does not modify any character image.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'tests/artifacts/anon-palette-proof.png'
OUTPUT.parent.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel='msedge')
    page = browser.new_page(viewport={'width': 1440, 'height': 1000}, device_scale_factor=1)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto((ROOT / 'index.html').as_uri())
    page.wait_for_function('window.mygoGame && mygoGame.loaded')
    report = page.evaluate('''async () => {
      mygoGame.match.setPaused(true);
      const load = src => new Promise((resolve,reject) => {
        const im = new Image(); im.onload=()=>resolve(im); im.onerror=reject; im.src=src;
      });
      const base=MYGO_ASSETS.characters[0], normal=MYGO_ASSETS.anonNormals;
      const [baseImage,normalImage]=await Promise.all([load(base.atlas),load(normal.atlas)]);
      document.body.insertAdjacentHTML('beforeend','<main id="proof"><h1>爱音普通形态 · 统一配色对照</h1><p>每组拳脚首格为同一待机参考。在相同中性背景下比较发色、肤色、制服、格裙和长袜。</p></main>');
      document.head.insertAdjacentHTML('beforeend', `<style>
        body{margin:0;background:#171e28;color:#eef0f6;font-family:'Microsoft YaHei',sans-serif}.app{display:none}
        #proof{padding:28px 30px 34px;max-width:none}h1{font-size:25px;margin:0 0 8px}p{font-size:12px;color:#a9b7c6;margin:0 0 20px}
        section{margin:0 0 22px}h2{font-size:14px;margin:0 0 10px;color:#f3b5cf}.grid{display:grid;gap:9px}
        figure{margin:0;background:#2b323d;border:1px solid #414c5d;border-radius:4px;text-align:center;padding:6px 0}
        figure.reference{border-color:#eab4cd;background:#353440}canvas{display:block;width:100%;height:210px;object-fit:contain}
        figcaption{font-size:10px;color:#c3cdd9;padding:4px 0}
      </style>`);
      const results=[];
      function addGroup(title, items, columns) {
        const section=document.createElement('section'); section.innerHTML='<h2>'+title+'</h2><div class="grid"></div>';
        const grid=section.querySelector('.grid');grid.style.gridTemplateColumns='repeat('+columns+',1fr)';
        for(const item of items){
          const {art,index,image,label,reference}=item, f=art.frames[index];
          const figure=document.createElement('figure'); if(reference)figure.className='reference';
          const canvas=document.createElement('canvas');canvas.width=180;canvas.height=210;
          const ctx=canvas.getContext('2d');
          const logicalHeight=f.height || 235*f.h/base.frames[0].h;
          const scale=Math.min(logicalHeight/235*180/f.h,170/f.w,194/f.h);
          ctx.drawImage(image,f.x,f.y,f.w,f.h,(180-f.w*scale)/2,202-f.h*scale,f.w*scale,f.h*scale);
          const pixels=ctx.getImageData(0,0,180,210).data;let opaque=0,clear=0;
          for(let i=3;i<pixels.length;i+=4){if(pixels[i]>220)opaque++;if(pixels[i]<16)clear++;}
          results.push({label,opaque,clear});
          const caption=document.createElement('figcaption');caption.textContent=label;
          figure.append(canvas,caption);grid.append(figure);
        }
        section.append(grid);document.querySelector('#proof').append(section);
      }
      const labels=['待机基准','移动 1','移动 2','防御','轻击起手','轻击命中','轻击收招','重击起手','重击命中','重击收招','跳跃上升','跳跃下降','受击','击倒','胜利','败北'];
      addGroup('基础普通形态 · 16 帧',base.frames.map((f,index)=>({art:base,index,image:baseImage,label:labels[index],reference:index===0})),8);
      const attacks=['轻拳','中拳','重拳','轻脚','中脚','重脚'];
      for(const [row,title] of ['站立拳脚','蹲下拳脚','空中拳脚'].entries()){
        const items=[{art:base,index:0,image:baseImage,label:'同一待机参考',reference:true}];
        for(let i=0;i<6;i++)items.push({art:normal,index:row*6+i,image:normalImage,label:title+' · '+attacks[i]});
        addGroup(title,items,7);
      }
      return {base:base.frames.length,normals:normal.frames.length,frames:results};
    }''')
    assert report['base'] == 16 and report['normals'] == 18
    assert all(f['opaque'] > 1000 and f['clear'] > 1000 for f in report['frames'])
    page.screenshot(path=str(OUTPUT), full_page=True)
    assert errors == [], errors
    print(json.dumps({'basic_frames': report['base'], 'normal_frames': report['normals'],
                      'opaque_and_transparent_regions': 'pass', 'browser_errors': errors,
                      'proof': str(OUTPUT)}, ensure_ascii=False))
    browser.close()
