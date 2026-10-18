"""Render the 32 penguin sprites beside their idle reference using the game atlas."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'tests/artifacts/tomori-penguin-proof.png'
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel='msedge')
    page = browser.new_page(viewport={'width': 1440, 'height': 1000}, device_scale_factor=1)
    page.goto((ROOT / 'index.html').as_uri())
    page.wait_for_function('mygoGame.loaded')
    result = page.evaluate('''async () => {
      const load=src=>new Promise(resolve=>{const im=new Image();im.onload=()=>resolve(im);im.src=src;});
      const base=MYGO_ASSETS.penguin, actions=MYGO_ASSETS.penguin;
      const [baseImage,actionImage]=await Promise.all([load(base.atlas),load(actions.atlas)]);
      document.body.insertAdjacentHTML('beforeend','<main id="action-proof"><h1>高松灯 · 凑企鹅 32 张动作</h1><p>每组首格为当前待机配色基准，动作按游戏内显示比例绘制。</p></main>');
      document.head.insertAdjacentHTML('beforeend',`<style>
        body{display:block;margin:0;background:#171e28;color:#edf0f6;font-family:'Microsoft YaHei',sans-serif}.app{display:none}
        #action-proof{padding:26px}h1{font-size:25px;margin:0 0 8px}p{font-size:12px;color:#a9b7c6;margin:0 0 20px}
        section{margin-bottom:18px}h2{font-size:14px;color:#f3b5cf;margin:0 0 8px}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
        figure{margin:0;padding:5px;background:#2b323d;border:1px solid #414c5d;border-radius:4px;text-align:center}
        figure.reference{border-color:#eab4cd;background:#353440}canvas{display:block;width:100%;height:260px;object-fit:contain}figcaption{font-size:11px;padding:4px;color:#c5d0df}
      </style>`);
      const groups=['Penguin presence and waddle','Jump, land and low guard','Flipper strikes and foot poke','Kicks and transitions','Four video-inspired skills','Call, transform and hit','Knockdown and recovery','Low and air attacks'];
      const labels=['Idle','Step contact','Step passing','Guard','Jump rise','Jump fall','Landing','Low guard','Light flipper','Medium flipper','Body bump','Light foot','Medium kick','Sweep','Windup','Recover','Flying kick','Cry counter','hey?','Laugh','Call prepare','Gugugaga','Transform','Hit','Knockdown fall','Knockdown ground','Get up','Victory source','Low flipper','Low kick','Air flipper','Air kick'];
      const results=[];
      for(let group=0;group<8;group++){
        const section=document.createElement('section');section.innerHTML='<h2>'+groups[group]+'</h2><div class="grid"></div>';
        const items=[{f:base.frames[0],image:baseImage,label:'待机基准',height:190},...actions.frames.slice(group*4,group*4+4).map((f,i)=>({f,image:actionImage,label:labels[group*4+i],height:f.height}))];
        for(const [index,item] of items.entries()){
          const {f,image,label,height}=item,canvas=document.createElement('canvas');canvas.width=270;canvas.height=280;
          const ctx=canvas.getContext('2d'),scale=.9*height/f.h;
          ctx.drawImage(image,f.x,f.y,f.w,f.h,(270-f.w*scale)/2,266-f.h*scale,f.w*scale,f.h*scale);
          const pixels=ctx.getImageData(0,0,270,280).data;let opaque=0,clear=0;
          for(let i=3;i<pixels.length;i+=4){if(pixels[i]>220)opaque++;if(pixels[i]<16)clear++;}
          results.push({label,opaque,clear});
          const figure=document.createElement('figure');if(!index)figure.className='reference';
          const caption=document.createElement('figcaption');caption.textContent=label;figure.append(canvas,caption);section.querySelector('.grid').append(figure);
        }
        document.querySelector('#action-proof').append(section);
      }
      return results;
    }''')
    assert len(result) == 40
    assert all(f['opaque'] > 900 and f['clear'] > 1000 for f in result), result
    page.screenshot(path=str(OUTPUT), full_page=True)
    print(json.dumps({'new_frames': 32, 'proof': str(OUTPUT)}, ensure_ascii=False))
    browser.close()
