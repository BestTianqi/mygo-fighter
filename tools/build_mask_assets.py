"""Pack three newly drawn mask transformation poses for each Mujica member."""
import base64
import hashlib
import json
from pathlib import Path
from PIL import Image
from build import figures_from_sheet
ROOT=Path(__file__).resolve().parents[1]
FOLDER=ROOT/'assets/mujica/mask-transformation'
NAMES=['mask-take','mask-raise','mask-settle']

def pack_mask_assets():
    sources=json.loads((FOLDER/'sources.json').read_text('utf-8'))
    forms={}
    for row in sources['characters']:
        path=ROOT/row['source']
        if hashlib.sha256(path.read_bytes()).hexdigest()!=row['sha256']:
            raise ValueError('Mask drawing hash mismatch: '+str(path))
        pieces=figures_from_sheet(path,3,1)
        cell_width=max(im.width for im,ax in pieces)+16
        cell_height=max(im.height for im,ax in pieces)+16
        atlas=Image.new('RGBA',(cell_width*3,cell_height))
        frames=[]
        for i,((piece,ax),name) in enumerate(zip(pieces,NAMES)):
            if piece.height/piece.width<1.2 or piece.height<250:
                raise ValueError('Incomplete mask figure: '+str(path)+'/'+name)
            x,y=i*cell_width+8,8
            atlas.paste(piece,(x,y))
            frames.append(dict(name=name,x=x,y=y,w=piece.width,h=piece.height,ax=round(ax,2),ay=piece.height,height=235))
        out=FOLDER/(row['key']+'-mask-runtime.webp')
        atlas.save(out,lossless=True,method=6)
        (FOLDER/(row['key']+'-mask-frames.json')).write_text(json.dumps(frames,ensure_ascii=False,indent=2),'utf-8')
        forms[str(row['id'])]=dict(atlas='data:image/webp;base64,'+base64.b64encode(out.read_bytes()).decode(),frames=frames)
    if set(forms)!={'5','6','7','8','9'}:raise ValueError('Expected all five mask animations')
    return forms

if __name__=='__main__':
    forms=pack_mask_assets()
    print('Packed',len(forms),'mask animations with',sum(len(f['frames']) for f in forms.values()),'drawings')
