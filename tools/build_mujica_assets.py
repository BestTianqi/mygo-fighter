"""Pack the actual 56 drawings for each Ave Mujica form, without pose substitution.

Usage: python tools/build_mujica_assets.py [--character sakiko] [--form normal]
Full build requires all five characters and both complete forms.
"""
import argparse
import base64
import hashlib
import json
import re
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage
from build import data_url, figures_from_sheet

ROOT = Path(__file__).resolve().parents[1]
KEYS = [('umiri', 5), ('sakiko', 6), ('uika', 7), ('mutsumi', 8), ('nyamu', 9)]
DISPLAY_NAMES = {'umiri': '八幡海铃', 'sakiko': '丰川祥子', 'uika': '三角初华', 'mutsumi': '若叶睦', 'nyamu': '祐天寺若麦'}
POSE_GROUPS = [
    ['idle', 'walk-contact', 'walk-pass', 'guard-standing', 'guard-crouch', 'dash-forward', 'dash-back', 'jump-rise'],
    ['jump-fall', 'landing', 'hit-high', 'hit-low', 'knockdown-fall', 'knockdown-ground', 'getup', 'victory'],
    ['throw-windup', 'throw-release', 'jab-1-windup', 'jab-1-impact', 'jab-1-recover', 'jab-2-windup', 'jab-2-impact', 'jab-2-recover'],
    ['jab-3-windup', 'jab-3-impact', 'jab-3-recover', 'heavy-windup', 'heavy-impact', 'heavy-recover', 'crouch-light-windup', 'crouch-light-impact'],
    ['crouch-light-recover', 'crouch-heavy-windup', 'crouch-heavy-impact', 'crouch-heavy-recover', 'air-light-windup', 'air-light-impact', 'air-light-recover', 'air-heavy-windup'],
    ['air-heavy-impact', 'air-heavy-recover', 'skill-u-windup', 'skill-u-impact', 'skill-u-recover', 'skill-i-windup', 'skill-i-impact', 'skill-i-recover'],
    ['skill-o-windup', 'skill-o-impact', 'skill-o-recover', 'super-windup', 'super-impact', 'super-recover', 'transform-prepare', 'transform-release'],
]
POSE_NAMES = [name for group in POSE_GROUPS for name in group]
POSE_HEIGHTS = {
    'guard-crouch': 155, 'dash-forward': 205, 'dash-back': 210, 'jump-rise': 180,
    'jump-fall': 220, 'landing': 180, 'hit-low': 205, 'knockdown-fall': 180,
    'knockdown-ground': 75, 'getup': 180, 'victory': 245, 'throw-release': 225,
    'jab-3-windup': 240, 'jab-3-impact': 260, 'heavy-windup': 245,
    'skill-o-windup': 245, 'skill-o-impact': 245, 'super-windup': 260, 'super-impact': 260,
}


def pose_height(name):
    if name.startswith('crouch-'):
        return 160 if name == 'crouch-heavy-impact' else 155
    if name.startswith('air-'):
        return 200 if name == 'air-heavy-impact' else 190
    return POSE_HEIGHTS.get(name, 235)


def validate_groups(groups, partial=False):
    names = [name for group in groups for name in group['names']]
    if not partial and names != POSE_NAMES:
        raise ValueError('expected all 56 named poses in canonical order')
    if partial and (len(set(names)) != len(names) or any(group['names'] not in POSE_GROUPS for group in groups)):
        raise ValueError('partial groups must have unique canonical pose names')
    for group in groups:
        if group.get('columns') != 4 or group.get('rows') != 2 or len(group['names']) != 8:
            raise ValueError('each source sheet must contain a 4 by 2 grid of eight drawings')


def source_groups(key, form, partial=False):
    folder = ROOT / 'assets/mujica' / key
    manifest_path = folder / 'manifest.json'
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
        if manifest['key'] != key or manifest['id'] != dict(KEYS)[key]:
            raise ValueError(f'{key}: manifest key/id mismatch')
        groups = manifest.get('forms', {}).get(form, {}).get('groups', [])
        if partial:
            groups = [group for group in groups if (ROOT / 'assets' / group['file']).exists()]
    elif partial:
        groups = []
    else:
        raise FileNotFoundError(f'{key}: reviewed manifest is missing: {manifest_path}')
    if partial:
        # Provisional previews are explicitly incomplete. Only a reviewed manifest
        # can select source versions for the final offline game.
        for i, names in enumerate(POSE_GROUPS, 1):
            if any(group['names'] == names for group in groups):
                continue
            versions = list((folder / form).glob(f'group-{i}-v*.png'))
            if not versions:
                continue
            source = max(versions, key=lambda p: int(re.search(r'-v(\d+)\.png$', p.name)[1]))
            groups.append(dict(file=source.relative_to(ROOT / 'assets').as_posix(), columns=4, rows=2, names=names))
        groups.sort(key=lambda group: POSE_GROUPS.index(group['names']))
    try:
        validate_groups(groups, partial)
    except ValueError as error:
        raise ValueError(f'{key}/{form}: {error}') from error
    return groups


def extract_group(source, group, strict=True):
    rgba = np.array(Image.open(source).convert('RGBA'))
    if rgba[:, :, 3].min() > 16:
        raise ValueError(f'{source}: transparent background is required')
    labels, _ = ndimage.label(rgba[:, :, 3] > 16, structure=np.ones((3, 3)))
    for label, region in enumerate(ndimage.find_objects(labels), 1):
        if region is None or np.count_nonzero(labels[region] == label) < 1800:
            continue
        sy, sx = region
        if strict and (sx.start == 0 or sy.start == 0 or sx.stop == rgba.shape[1] or sy.stop == rgba.shape[0]):
            raise ValueError(f'{source}: a large figure touches the source edge; inspect for cropped body or instrument')
    figures = figures_from_sheet(source, group['columns'], group['rows'])
    if len(figures) != len(group['names']):
        raise ValueError(f'{source}: expected exactly eight extracted drawings')
    return [(name, sprite, anchor) for name, (sprite, anchor) in zip(group['names'], figures)]


def pack_pieces(pieces):
    """Tight eight-drawing rows preserve alpha, foot anchors and world geometry."""
    seen, scaled = set(), []
    for name, sprite, anchor in pieces:
        digest = hashlib.sha256(str(sprite.size).encode() + sprite.tobytes()).digest()
        if digest in seen:
            raise ValueError(f'{name}: duplicate drawing cannot stand in for another pose')
        seen.add(digest)
        height = pose_height(name)
        # 423 pixels for a standing body is ample at the game's display size;
        # ten forms also have to share the offline file and GPU memory budget.
        target_h = min(sprite.height, round(height * 1.8))
        target_w = max(1, round(sprite.width * target_h / sprite.height))
        piece = sprite.resize((target_w, target_h), Image.Resampling.LANCZOS) if target_h != sprite.height else sprite.copy()
        frame = dict(name=name, w=piece.width, h=piece.height,
                     ax=round(piece.width / 2 if name == 'knockdown-ground' else anchor * piece.width / sprite.width, 3),
                     ay=piece.height, height=height, group=POSE_NAMES.index(name) // 8)
        scaled.append((piece, frame))
    if not scaled:
        raise ValueError('no actual drawings to pack')
    rows = [scaled[i:i + 8] for i in range(0, len(scaled), 8)]
    width = max(sum(piece.width + 12 for piece, _ in row) for row in rows)
    atlas = Image.new('RGBA', (width, sum(max(piece.height for piece, _ in row) + 12 for row in rows)))
    frames, y = [], 6
    for row in rows:
        x = 6
        for piece, frame in row:
            atlas.paste(piece, (x, y))
            frames.append(dict(frame, x=x, y=y))
            x += piece.width + 12
        y += max(piece.height for piece, _ in row) + 12
    # WebP preserves alpha exactly. Quality 98 RGB retains the drawn details
    # while leaving room for ten forms alongside the original game's media.
    return dict(atlas=data_url(atlas, quality=98), frames=frames)


def pack_form(key, form, partial=False):
    folder = ROOT / 'assets/mujica' / key
    groups = source_groups(key, form, partial)
    if not groups:
        return None
    pieces = []
    for group in groups:
        source = ROOT / 'assets' / group['file']
        pieces.extend(extract_group(source, group, strict=not partial))
    packed = pack_pieces(pieces)
    import io
    runtime_bytes = base64.b64decode(packed['atlas'].split(',', 1)[1])
    runtime = Image.open(io.BytesIO(runtime_bytes))
    suffix = '-partial' if partial else ''
    (folder / f'{form}{suffix}-runtime.webp').write_bytes(runtime_bytes)
    (folder / f'{form}{suffix}-frames.json').write_text(json.dumps(packed['frames'], ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    if pieces[0][0] == 'idle':
        idle = pieces[0][1].copy(); idle.thumbnail((380, 520), Image.Resampling.LANCZOS)
        idle.save(folder / f'{form}{suffix}-idle.webp', lossless=True, method=6)
    # Visual QA is one actual drawing per cell, on a neutral contrasting ground.
    proof = Image.new('RGB', (8 * 185, ((len(pieces) + 7) // 8) * 245), '#233346')
    draw = ImageDraw.Draw(proof)
    try:
        font = ImageFont.truetype('C:/Windows/Fonts/consola.ttf', 11)
    except OSError:
        font = ImageFont.load_default()
    for i, (name, sprite, _) in enumerate(pieces):
        thumb = sprite.copy(); thumb.thumbnail((175, 211), Image.Resampling.LANCZOS)
        x, y = i % 8 * 185, i // 8 * 245
        proof.paste(thumb, (x + (185 - thumb.width) // 2, y + 211 - thumb.height), thumb)
        draw.text((x + 3, y + 217), name, fill='#f1e5ec', font=font)
    proof.save(folder / f'{form}{suffix}-proof.png')
    print(f'{key}/{form}{suffix}: {len(packed["frames"])} real poses, runtime {runtime.size}, source sheets untouched', flush=True)
    return packed


def pack_all():
    # Validate every manifest and file before doing expensive image compression.
    for key, _ in KEYS:
        for form in ('normal', 'stage'):
            for group in source_groups(key, form):
                if not (ROOT / 'assets' / group['file']).is_file():
                    raise FileNotFoundError(f'{key}/{form}: missing source {group["file"]}')
    forms, characters = {}, []
    for key, identifier in KEYS:
        forms[identifier] = {form: pack_form(key, form) for form in ('normal', 'stage')}
        portrait = (ROOT / 'assets/mujica' / key / 'normal-idle.webp').read_bytes()
        characters.append(dict(id=identifier, key=key, portrait='data:image/webp;base64,' + base64.b64encode(portrait).decode()))
    return forms, characters


def build():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--character', choices=[key for key, _ in KEYS])
    parser.add_argument('--form', choices=['normal', 'stage'])
    parser.add_argument('--partial', action='store_true', help='pack existing complete groups only; never used by the game build')
    args = parser.parse_args()
    forms = []
    for key, identifier in KEYS:
        if args.character and args.character != key:
            continue
        for form in ['normal', 'stage']:
            if args.form and args.form != form:
                continue
            packed = pack_form(key, form, args.partial)
            if packed:
                forms.append(dict(id=identifier, key=key, name=DISPLAY_NAMES[key], form=form, **packed))
    print(f'Packed {len(forms)} forms and {sum(len(form["frames"]) for form in forms)} reviewed poses.')


if __name__ == '__main__':
    build()
