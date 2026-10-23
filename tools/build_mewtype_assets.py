"""Pack MewType's five virtual outfits, with 54 actual drawings per person.

Usage: python tools/build_mewtype_assets.py [--character arale] [--partial]
Final packing requires reviewed manifests and every source sheet. Provisional
previews may show existing complete sheets, but never invent missing drawings.
"""
import argparse
import base64
import io
import json
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from build_mujica_assets import POSE_GROUPS as MUJICA_GROUPS, extract_group, pack_pieces

ROOT = Path(__file__).resolve().parents[1]
KEYS = [('arale', 10), ('ritsu', 11), ('miyako', 12), ('yuno', 13), ('nonoka', 14)]
DISPLAY_NAMES = dict(arale='仲町阿拉蕾', ritsu='峰月律', miyako='藤都子', yuno='千石由乃', nonoka='宫永野乃花')
POSE_GROUPS = [names[:] for names in MUJICA_GROUPS[:6]] + [MUJICA_GROUPS[6][:6]]
POSE_NAMES = [name for names in POSE_GROUPS for name in names]


def validate_groups(groups, partial=False):
    names = [name for group in groups for name in group['names']]
    if not partial and names != POSE_NAMES:
        raise ValueError('expected all 54 named poses in canonical order')
    if partial and (len(names) != len(set(names)) or any(group['names'] not in POSE_GROUPS for group in groups)):
        raise ValueError('partial sheets must contain unique canonical pose groups')
    for group in groups:
        index = POSE_GROUPS.index(group['names'])
        columns = 4 if index < 6 else 3
        if group.get('columns') != columns or group.get('rows') != 2 or len(group['names']) != columns * 2:
            raise ValueError(f'group {index + 1} requires a {columns} by 2 grid with {columns * 2} actual drawings')


def source_groups(key, partial=False):
    folder = ROOT / 'assets/mewtype' / key
    manifest_path = folder / 'manifest.json'
    if manifest_path.is_file():
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
        if manifest.get('key') != key or manifest.get('id') != dict(KEYS)[key]:
            raise ValueError(f'{key}: manifest key/id mismatch')
        groups = manifest.get('forms', {}).get('virtual', {}).get('groups', [])
        if partial:
            groups = [group for group in groups if (ROOT / 'assets' / group['file']).is_file()]
    elif partial:
        groups = []
    else:
        raise FileNotFoundError(f'{key}: reviewed manifest is missing: {manifest_path}')
    if partial:
        for i, names in enumerate(POSE_GROUPS, 1):
            if any(group['names'] == names for group in groups):
                continue
            versions = list((folder / 'virtual').glob(f'group-{i}-v*.png'))
            if versions:
                source = max(versions, key=lambda path: int(re.search(r'-v(\d+)\.png$', path.name)[1]))
                groups.append(dict(file=source.relative_to(ROOT / 'assets').as_posix(), columns=4 if i < 7 else 3,
                                   rows=2, names=names[:]))
        groups.sort(key=lambda group: POSE_GROUPS.index(group['names']))
    try:
        validate_groups(groups, partial)
    except ValueError as error:
        raise ValueError(f'{key}/virtual: {error}') from error
    return groups


def validate_sources():
    """Fail before rebuilding any existing art if a new final source is missing."""
    for key, _ in KEYS:
        for group in source_groups(key):
            source = ROOT / 'assets' / group['file']
            if not source.is_file():
                raise FileNotFoundError(f'{key}/virtual: missing source {source}')


def pack_character(key, partial=False):
    groups = source_groups(key, partial)
    if not groups:
        return None
    pieces = []
    for group in groups:
        # Keep full connected figures, including instruments crossing grid lines.
        # Six-figure source group 7 uses its declared 3 by 2 geometry.
        pieces.extend(extract_group(ROOT / 'assets' / group['file'], group))
    packed = pack_pieces(pieces)
    folder = ROOT / 'assets/mewtype' / key
    stem = 'virtual-partial' if partial else 'virtual'
    runtime_bytes = base64.b64decode(packed['atlas'].split(',', 1)[1])
    (folder / f'{stem}-runtime.webp').write_bytes(runtime_bytes)
    (folder / f'{stem}-frames.json').write_text(json.dumps(packed['frames'], ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    if pieces[0][0] == 'idle':
        idle = pieces[0][1].copy()
        idle.thumbnail((380, 520), Image.Resampling.LANCZOS)
        idle.save(folder / f'{stem}-idle.webp', lossless=True, method=6)
    proof = Image.new('RGB', (1480, ((len(pieces) + 7) // 8) * 245), '#233346')
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
    proof.save(folder / f'{stem}-proof.png')
    runtime = Image.open(io.BytesIO(runtime_bytes))
    print(f'{key}/{stem}: {len(pieces)} actual drawings, runtime {runtime.size}, {len(runtime_bytes):,} bytes', flush=True)
    return packed


def pack_all():
    validate_sources()
    forms, characters = {}, []
    for key, identifier in KEYS:
        forms[identifier] = dict(virtual=pack_character(key))
        portrait = (ROOT / 'assets/mewtype' / key / 'virtual-idle.webp').read_bytes()
        characters.append(dict(id=identifier, key=key, portrait='data:image/webp;base64,' + base64.b64encode(portrait).decode()))
    return forms, characters


def write_preview(forms, partial=False):
    payload = dict(partial=partial, forms=forms, expected=270)
    template = (ROOT / 'tools/templates/mewtype-preview.html').read_text(encoding='utf-8')
    html = template.replace('/*__MEWTYPE_PREVIEW__*/', 'window.MEWTYPE_PREVIEW=' + json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + ';')
    target = ROOT / 'mewtype-preview.html'
    target.write_bytes(html.encode('utf-8'))
    print(f'Offline MewType preview: {target.stat().st_size:,} bytes; {sum(len(form["frames"]) for form in forms)} actual drawings', flush=True)


def build():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--character', choices=[key for key, _ in KEYS])
    parser.add_argument('--partial', action='store_true', help='show only existing complete sheets, never fabricate missing poses')
    args = parser.parse_args()
    forms = []
    for key, identifier in KEYS:
        if args.character and args.character != key:
            continue
        packed = pack_character(key, args.partial)
        if packed:
            forms.append(dict(id=identifier, key=key, name=DISPLAY_NAMES[key], form='virtual', **packed))
    write_preview(forms, args.partial)


if __name__ == '__main__':
    build()
