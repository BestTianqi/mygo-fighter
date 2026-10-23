"""Pack the reviewed full-body portraits, face crops and idle frames for the lobby/game."""
from PIL import Image
from build import ROOT, data_url, figures_from_sheet, game_atlas

FOLDER = ROOT / 'assets/mujica/portraits-v2'
CHARACTERS = [('umiri', 5), ('sakiko', 6), ('uika', 7), ('mutsumi', 8), ('nyamu', 9)]
# Face centers in each tightly packed full-body drawing, reviewed at portrait scale.
FACE_X = {'umiri': [.53, .50], 'sakiko': [.54, .52], 'uika': [.39, .49],
          'mutsumi': [.51, .52], 'nyamu': [.57, .58]}


def pack_portraits():
    result = {}
    for key, identifier in CHARACTERS:
        print(f'Packing reviewed portraits: {key}', flush=True)
        source = FOLDER / f'{key}-source-v4.png'
        if not source.exists():
            source = FOLDER / f'{key}-source-v3.png'
        if not source.exists():
            source = FOLDER / f'{key}-source-v2.png'
        if Image.open(source).getextrema()[-1][0] != 0:
            raise ValueError(f'{source.name}: portrait needs a real transparent background')
        sprites = figures_from_sheet(source, 2, 1)
        forms = {}
        for i, (form, (sprite, anchor)) in enumerate(zip(['normal', 'stage'], sprites)):
            portrait = sprite.copy()
            portrait.thumbnail((640, 1100), Image.Resampling.LANCZOS)
            portrait.save(FOLDER / f'{key}-{form}.webp', quality=94, method=6)
            # Keep the complete hair and shoulders; the separate square crop makes centering explicit.
            size = round(sprite.height * .31)
            cx = round(sprite.width * FACE_X[key][i])
            face = sprite.crop((cx - size // 2, 0, cx + size - size // 2, size))
            face = face.resize((320, 320), Image.Resampling.LANCZOS)
            face.save(FOLDER / f'{key}-{form}-face.webp', quality=94, method=6)
            frame = dict(name='idle', x=0, y=0, w=sprite.width, h=sprite.height,
                         ax=anchor, ay=sprite.height, height=235)
            forms[form] = dict(portrait=data_url(portrait, quality=94), face=data_url(face, quality=94),
                               idle=game_atlas(sprite, [frame], 1))
        result[identifier] = forms
    return result


def install_portraits(assets):
    assets['mujicaPortraits'] = pack_portraits()
    for identifier, forms in assets['mujicaPortraits'].items():
        assets['characters'][identifier]['portrait'] = forms['normal']['portrait']
    # Three genuine headset/stop-palm/bow drawings for Sakiko's customer-service attack.
    folder = ROOT / 'assets/meme-media/sakiko-customer-service'
    pieces = figures_from_sheet(folder / 'customer-actions-source-v1.png', 3, 1)
    height = max(sprite.height for sprite, _ in pieces)
    width = max(sprite.width for sprite, _ in pieces) + 16
    atlas = Image.new('RGBA', (width * 3, height + 16))
    frames = []
    for i, ((sprite, anchor), phase) in enumerate(zip(pieces, ['windup', 'impact', 'recover'])):
        x, y = i * width + 8, 8
        atlas.paste(sprite, (x, y))
        frames.append(dict(name='customer-' + phase, x=x, y=y, w=sprite.width, h=sprite.height,
                           ax=anchor, ay=sprite.height, height=235 if i < 2 else 222))
    assets['sakikoCustomerActions'] = game_atlas(atlas, frames, 3)


if __name__ == '__main__':
    print('Packed', len(pack_portraits()), 'characters, normal/stage portraits, face crops and idle frames.')
