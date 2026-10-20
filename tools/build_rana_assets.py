"""Pack the 48 selected Rana poses and build their offline visual preview."""
import json
from pathlib import Path
from PIL import Image
from build import figures_from_sheet, data_url

ROOT=Path(__file__).resolve().parents[1]
GROUP_LABELS=['待机与步伐','跳跃与防御','冲刺与起收招','受击与倒地','起身、胜利与投技',
    '站立掌击、吉他与轻脚','站立踢击与低段攻击','蹲下拳脚','空中掌击、吉他与轻脚','空中踢击与调弦','拨弦、突进、上挑与滑踢','俯冲、独奏与大招']
LABELS=['待机','迈步触地','迈步经过','站立防御','上升跳跃','下降跳跃','落地','蹲下防御',
    '前冲','后撤','攻击起手','攻击收招','上段受击','腹部受击','倒地跌落','侧身倒地',
    '起身','胜利','投技起手','投技释放','轻掌击','中吉他碰撞','重吉他挥击','轻脚',
    '中脚','重脚','蹲轻掌','蹲中吉他','蹲重上挑','蹲轻脚','蹲中脚','蹲重脚',
    '空中轻掌','空中中吉他','空中重吉他','空中轻脚','空中中脚','空中重脚','调弦起手','调弦释放',
    '拨弦释放','低姿突进','吉他上挑','低位滑踢','空中俯冲','吉他独奏','大招蓄势','大招释放']

def build():
    groups=json.loads((ROOT/'assets/rana-actions.json').read_text(encoding='utf-8'))
    poses=[]
    for group in groups:
        sprites=figures_from_sheet(ROOT/'assets'/group['file'],2,2)
        for name,height,(sprite,anchor) in zip(group['names'],group['heights'],sprites):
            if name in group.get('overrides',{}):
                sprite,anchor=figures_from_sheet(ROOT/'assets'/group['overrides'][name],1,1)[0]
            poses.append((name,height,sprite,anchor))
    assert len(poses)==len(set(p[0] for p in poses))==48
    cell_w=max(p[2].width for p in poses)+12
    cell_h=max(p[2].height for p in poses)+12
    atlas=Image.new('RGBA',(cell_w*8,cell_h*6))
    frames=[]
    for i,(name,height,sprite,anchor) in enumerate(poses):
        x,y=(i%8)*cell_w+6,(i//8)*cell_h+6
        atlas.paste(sprite,(x,y))
        frames.append(dict(name=name,label=LABELS[i],x=x,y=y,w=sprite.width,h=sprite.height,
            ax=round(sprite.width/2 if name=='knockdown-ground' else anchor,2),ay=sprite.height,height=height,group=i//4))
    atlas.save(ROOT/'assets/rana-runtime.webp',lossless=True,method=6)
    poses[0][2].save(ROOT/'assets/rana-idle.png')
    (ROOT/'assets/rana-frames.json').write_text(json.dumps(frames,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    assets=dict(atlas=data_url(atlas,lossless=True),frames=frames,groups=GROUP_LABELS,
        background=data_url(Image.open(ROOT/'assets/stages/ring-v1.png').convert('RGB').resize((1280,720)),85),
        comparisons=[dict(name=name,src=data_url(Image.open(ROOT/f'assets/{key}-idle.png'),lossless=True))
            for key,name in [('anon','千早爱音'),('soyo','长崎素世'),('tomori','高松灯')]])
    template=(ROOT/'src/rana-preview.html').read_text(encoding='utf-8')
    html=template.replace('/*__RANA_ASSETS__*/','window.RANA_ASSETS='+json.dumps(assets,ensure_ascii=False,separators=(',',':'))+';')
    (ROOT/'rana-preview.html').write_text(html,encoding='utf-8')
    print(f'Built {len(frames)} Rana poses and offline rana-preview.html; atlas {atlas.size}.')

if __name__=='__main__':build()
