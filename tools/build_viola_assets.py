"""Pack Viola's 17 independent drawings; install only character 15.

Usage: python tools/build_viola_assets.py
Call install_viola_assets(assets) before export_assets to include her in a rebuild.
Frame aliases intentionally reuse whole drawings for transition phases; their
provenance is explicit in the reviewed manifest instead of inventing extra poses.
"""
import base64
import copy
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from build import ROOT, data_url, figures_from_sheet, game_atlas
from build_mujica_assets import extract_group, pack_pieces

FOLDER = ROOT / 'assets/mewtype/viola'
ID = 15
GROUPS = [
    dict(file='mewtype/viola/actions-locomotion-source-v1.png', columns=4, rows=2,
         names=['walk-contact', 'walk-pass', 'dash-forward', 'guard-standing',
                'guard-crouch', 'jump-rise', 'hit-high', 'knockdown-ground']),
    dict(file='mewtype/viola/actions-combat-source-v2.png', columns=4, rows=2,
         names=['jab-1-impact', 'jab-2-impact', 'jab-3-impact', 'heavy-impact',
                'skill-u-impact', 'skill-i-impact', 'skill-o-impact', 'super-impact']),
]


def frame_aliases():
    aliases = {
        'dash-back': 'walk-pass', 'jump-fall': 'jump-rise',
        'crouch': 'guard-crouch', 'guard-high': 'guard-standing',
        'guard-low': 'guard-crouch', 'landing': 'guard-crouch',
        'getup': 'guard-crouch', 'hit-low': 'hit-high',
        'knockdown-fall': 'hit-high', 'victory': 'idle',
        'defeat': 'knockdown-ground', 'throw-windup': 'guard-standing',
        'throw-release': 'skill-o-impact', 'heavy-windup': 'guard-standing',
        'heavy-recover': 'walk-contact', 'super-windup': 'skill-u-impact',
        'super-recover': 'idle', 'super-release': 'super-impact',
        'normal-windup': 'guard-standing', 'normal-recover': 'walk-contact',
    }
    for n in (1, 2, 3):
        aliases[f'jab-{n}'] = f'jab-{n}-impact'
        aliases[f'jab-{n}-windup'] = 'guard-standing'
        aliases[f'jab-{n}-recover'] = 'walk-contact'
    aliases['heavy'] = 'heavy-impact'
    for slot in ('u', 'i', 'o'):
        aliases[f'skill-{slot}'] = f'skill-{slot}-impact'
        aliases[f'skill-{slot}-windup'] = 'guard-crouch' if slot == 'i' else 'guard-standing'
        aliases[f'skill-{slot}-recover'] = 'guard-crouch' if slot == 'i' else 'walk-contact'
    for stance in ('crouch', 'air'):
        for button in ('light', 'heavy'):
            impact = ('skill-i-impact' if stance == 'crouch' else
                      'heavy-impact' if button == 'heavy' else 'jump-rise')
            for phase in ('windup', 'impact', 'recover'):
                aliases[f'{stance}-{button}-{phase}'] = impact
    return aliases


def build_viola_art():
    portrait_path = FOLDER / 'portrait-source-v1.png'
    portrait_sprite, anchor = figures_from_sheet(portrait_path, 1, 1)[0]
    pieces = [('idle', portrait_sprite, anchor)]
    for group in GROUPS:
        pieces.extend(extract_group(ROOT / 'assets' / group['file'], group))
    packed = pack_pieces(pieces)
    by_name = {frame['name']: frame for frame in packed['frames']}
    aliases = frame_aliases()
    packed['frames'].extend(dict(by_name[source], name=name) for name, source in aliases.items())
    atlas_bytes = base64.b64decode(packed['atlas'].split(',', 1)[1])
    (FOLDER / 'virtual-runtime.webp').write_bytes(atlas_bytes)
    (FOLDER / 'virtual-frames.json').write_text(json.dumps(packed['frames'], ensure_ascii=False, indent=2) + '\n', 'utf8')

    portrait = portrait_sprite.copy()
    portrait.thumbnail((640, 1100), Image.Resampling.LANCZOS)
    portrait.save(FOLDER / 'portrait.webp', quality=94, method=6)
    size = round(portrait_sprite.height * 0.22)
    center = round(portrait_sprite.width * 0.425)
    face = portrait_sprite.crop((center - size // 2, 0, center + size - size // 2, size))
    face = face.resize((320, 320), Image.Resampling.LANCZOS)
    face.save(FOLDER / 'face.webp', quality=94, method=6)
    idle_frame = dict(name='idle', x=0, y=0, w=portrait_sprite.width,
                      h=portrait_sprite.height, ax=anchor, ay=portrait_sprite.height,
                      height=235)
    idle = game_atlas(portrait_sprite, [idle_frame], 1)
    idle_bytes = base64.b64decode(idle['atlas'].split(',', 1)[1])
    (FOLDER / 'idle-runtime.webp').write_bytes(idle_bytes)
    portrait_record = dict(portrait=data_url(portrait, quality=94),
                           face=data_url(face, quality=94), idle=idle)

    proof = Image.new('RGB', (8 * 185, 3 * 245), '#233346')
    draw = ImageDraw.Draw(proof)
    try:
        font = ImageFont.truetype('C:/Windows/Fonts/consola.ttf', 11)
    except OSError:
        font = ImageFont.load_default()
    for i, (name, sprite, _) in enumerate(pieces):
        thumb = sprite.copy()
        thumb.thumbnail((175, 211), Image.Resampling.LANCZOS)
        x, y = i % 8 * 185, i // 8 * 245
        proof.paste(thumb, (x + (185 - thumb.width) // 2, y + 211 - thumb.height), thumb)
        draw.text((x + 3, y + 217), name, fill='#f1e5ec', font=font)
    proof.save(FOLDER / 'proof.png')
    sources = ['mewtype/viola/portrait-source-v1.png'] + [group['file'] for group in GROUPS]
    metadata = dict(id=ID, key='viola', name='薇欧拉', form='virtual',
                    sourceFiles=sources, groups=GROUPS, actualDrawings=len(pieces),
                    aliases=aliases,
                    sha256={name: hashlib.sha256((ROOT / 'assets' / name).read_bytes()).hexdigest() for name in sources},
                    reference='https://www.bilibili.com/video/BV11uK36xEs2/',
                    referencePublisher='梦限大MewType (official)',
                    referenceFrames=[4, 8, 20],
                    method='Built-in imagegen; new 2D fan-game artwork. Transparent connected figures, foot anchors and 17 unique drawings checked. Cell 1 and 5 of combat v1 were corrected toward screen right in v2; v1 is archived, not installed.')
    (FOLDER / 'manifest.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n', 'utf8')
    print(f'Viola: {len(pieces)} actual drawings, {len(packed["frames"])} named animation frames, {len(atlas_bytes):,} atlas bytes', flush=True)
    return packed, portrait_record


def install_viola_assets(assets):
    """Install id 15 only; preserve every existing character/media field."""
    atlas, portrait = build_viola_art()
    character = dict(atlas=atlas['atlas'], frames=copy.deepcopy(atlas['frames']),
                     portrait=portrait['portrait'])
    if len(assets['characters']) == ID:
        assets['characters'].append(character)
    elif len(assets['characters']) > ID:
        assets['characters'][ID] = character
    else:
        raise ValueError('Viola requires the existing 15-character catalog first')
    assets.setdefault('mewtypeForms', {})[str(ID)] = dict(virtual=atlas)
    assets.setdefault('mewtypePortraits', {})[str(ID)] = portrait


if __name__ == '__main__':
    build_viola_art()
