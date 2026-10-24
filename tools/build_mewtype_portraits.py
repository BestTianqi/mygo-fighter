"""Pack MewType's reviewed virtual portraits without rebuilding attack sheets."""
import json

from PIL import Image
from build import ROOT, data_url, export_assets, figures_from_sheet, game_atlas

FOLDER = ROOT / 'assets/mewtype/portraits-v1'
CHARACTERS = [('arale', 10), ('ritsu', 11), ('miyako', 12), ('yuno', 13), ('nonoka', 14)]


def install_mewtype_portraits(assets):
    metadata = json.loads((FOLDER / 'crops.json').read_text(encoding='utf-8'))
    portraits = {}
    for key, identifier in CHARACTERS:
        source = FOLDER / f'{key}-source-v1.png'
        with Image.open(source) as image:
            if image.mode != 'RGBA' or image.getextrema()[3][0] != 0:
                raise ValueError(f'{source.name}: expected genuine transparency')
        sprite, anchor = figures_from_sheet(source, 1, 1)[0]
        portrait = sprite.copy()
        portrait.thumbnail((640, 1100), Image.Resampling.LANCZOS)
        portrait.save(FOLDER / f'{key}-virtual.webp', quality=94, method=6)
        crop = metadata[key]
        size = round(sprite.height * crop['size'])
        cx = round(sprite.width * crop['centerX'])
        top = round(sprite.height * crop.get('top', 0))
        face = sprite.crop((cx - size // 2, top, cx + size - size // 2, top + size))
        face = face.resize((320, 320), Image.Resampling.LANCZOS)
        face.save(FOLDER / f'{key}-virtual-face.webp', quality=94, method=6)
        frame = dict(name='idle', x=0, y=0, w=sprite.width, h=sprite.height,
                     ax=anchor, ay=sprite.height, height=235)
        portraits[str(identifier)] = dict(portrait=data_url(portrait, quality=94),
                                         face=data_url(face, quality=94),
                                         idle=game_atlas(sprite, [frame], 1))
        assets['characters'][identifier]['portrait'] = portraits[str(identifier)]['portrait']
    assets['mewtypePortraits'] = portraits


if __name__ == '__main__':
    assets = json.loads((ROOT / 'frontend/public/assets.json').read_text(encoding='utf-8'))
    install_mewtype_portraits(assets)
    export_assets(assets)
