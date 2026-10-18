"""Pack the redrawn character frames and local stage assets into an offline HTML.

Build dependencies: Pillow, numpy, scipy (game itself has no dependencies).
Usage: python tools/build.py
"""
import base64
import io
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]


def data_url(image, quality=90, lossless=False):
    buffer = io.BytesIO()
    image.save(buffer, format="WEBP", quality=quality, method=6, lossless=lossless)
    return "data:image/webp;base64," + base64.b64encode(buffer.getvalue()).decode()


def figures_from_sheet(path, columns, rows):
    source = Image.open(path).convert("RGBA")
    rgba = np.array(source)
    labels, _ = ndimage.label(rgba[:, :, 3] > 16, structure=np.ones((3, 3)))
    regions = ndimage.find_objects(labels)
    selected = {}
    for label, region in enumerate(regions, 1):
        if region is None:
            continue
        sy, sx = region
        mask = labels[region] == label
        count = int(mask.sum())
        if count < 1800:
            continue
        col = int((sx.start + sx.stop) / 2 * columns / source.width)
        row = int((sy.start + sy.stop) / 2 * rows / source.height)
        slot = row * columns + col
        if slot not in selected or count > selected[slot][0]:
            selected[slot] = (count, region, label)
    count = columns * rows
    if set(selected) != set(range(count)):
        raise ValueError(f"{path.name}: expected {count} complete figures; found slots {sorted(selected)}")

    sprites = []
    for slot in range(count):
        _, region, label = selected[slot]
        piece = rgba[region].copy()
        piece[labels[region] != label] = 0
        # Foot anchor uses the opaque shoe band, as in UI/FighterActionArt.h.
        band = max(3, piece.shape[0] // 20)
        yy, xx = np.nonzero(piece[-band:, :, 3] > 32)
        anchor_x = float(xx.mean()) if len(xx) else piece.shape[1] / 2
        sprites.append((Image.fromarray(piece), anchor_x))
    return sprites


def frames_from_sheet(character):
    # Four poses per source sheet leave substantially more pixels for each face.
    # Earlier sheets remain available and supply the established pose heights.
    reference = figures_from_sheet(ROOT / f"assets/{character}-normal-actions-v2.png", 4, 4)
    sprites = []
    for group in range(1, 5):
        sprites.extend(figures_from_sheet(ROOT / f"assets/{character}-actions-v3-{group}.png", 2, 2))
    idle_height = sprites[0][0].height
    normalized = []
    for i, (sprite, anchor_x) in enumerate(sprites):
        target_height = round(idle_height * reference[i][0].height / reference[0][0].height)
        ratio = target_height / sprite.height
        sprite = sprite.resize((round(sprite.width * ratio), target_height), Image.Resampling.LANCZOS)
        normalized.append((sprite, anchor_x * ratio))
    sprites = normalized

    cell_w = max(s.width for s, _ in sprites) + 12
    cell_h = max(s.height for s, _ in sprites) + 12
    atlas = Image.new("RGBA", (cell_w * 4, cell_h * 4))
    frames = []
    for i, (sprite, anchor_x) in enumerate(sprites):
        x, y = (i % 4) * cell_w + 6, (i // 4) * cell_h + 6
        atlas.paste(sprite, (x, y))
        frames.append(dict(x=x, y=y, w=sprite.width, h=sprite.height,
                           ax=round(anchor_x, 2), ay=sprite.height))
    atlas.save(ROOT / f"assets/{character}-runtime.webp", lossless=True, method=6)
    atlas.save(ROOT / f"assets/{character}-normal-actions-v3.png")
    sprites[0][0].save(ROOT / f"assets/{character}-idle.png")
    # Lossless character art preserves the small eye and eyelash lines.
    return dict(atlas=data_url(atlas, lossless=True), frames=frames, portrait=data_url(sprites[0][0], lossless=True))


def extra_frames(sheets, name, columns):
    sprites = []
    for filename, cols, rows, heights in sheets:
        figures = figures_from_sheet(ROOT / 'assets' / filename, cols, rows)
        for i, (sprite, anchor_x) in enumerate(figures):
            sprites.append((sprite, anchor_x, heights[i]))
    cell_w = max(s.width for s, _, _ in sprites) + 12
    cell_h = max(s.height for s, _, _ in sprites) + 12
    atlas = Image.new('RGBA', (cell_w * columns, cell_h * ((len(sprites) + columns - 1) // columns)))
    frames = []
    for i, (sprite, anchor_x, height) in enumerate(sprites):
        x, y = i % columns * cell_w + 6, i // columns * cell_h + 6
        atlas.paste(sprite, (x, y))
        frames.append(dict(x=x, y=y, w=sprite.width, h=sprite.height,
                           ax=round(anchor_x, 2), ay=sprite.height, height=height))
    atlas.save(ROOT / f'assets/{name}-runtime.webp', lossless=True, method=6)
    return dict(atlas=data_url(atlas, lossless=True), frames=frames)


def build():
    characters = [frames_from_sheet(name) for name in ["anon", "soyo"]]
    backgrounds, stages = [], []
    for entry in json.loads((ROOT / 'assets/stages.json').read_text(encoding='utf-8')):
        bg = ImageOps.fit(Image.open(ROOT / entry['file']).convert('RGB'), (1600, 900),
                          method=Image.Resampling.LANCZOS)
        backgrounds.append(data_url(bg, 88))
        thumbnail = bg.resize((320, 180), Image.Resampling.LANCZOS)
        stages.append(dict(id=entry['id'], name=entry['name'], thumbnail=data_url(thumbnail, 78), terrain=entry['terrain']))
    normals = extra_frames([
        ('anon-normals-standing-v3.png', 2, 3, [235, 235, 235, 220, 235, 260]),
        ('anon-normals-crouch-v3.png', 2, 3, [155, 155, 200, 150, 155, 145]),
        ('anon-normals-air-v3.png', 2, 3, [175, 175, 175, 195, 190, 190]),
    ], 'anon-normals', 6)
    dragon = extra_frames([('anon-milkdragon-v1.png', 2, 2, [360] * 4)], 'anon-milkdragon', 2)
    tensora = extra_frames([('soyo-tensora-v1.png', 2, 2, [72] * 4)], 'soyo-tensora', 2)
    action_groups = json.loads((ROOT / 'assets/anon-extra-actions.json').read_text(encoding='utf-8'))
    actions = extra_frames([(g['file'], 2, 2, g['heights']) for g in action_groups], 'anon-extra', 4)
    for frame, name in zip(actions['frames'], [name for g in action_groups for name in g['names']]):
        frame['name'] = name
        if name == 'knockdown-ground': frame['ax'] = round(frame['w'] / 2, 2)
    soyo_groups = json.loads((ROOT / 'assets/soyo-extra-actions.json').read_text(encoding='utf-8'))
    soyo_actions = extra_frames([(g['file'], 2, 2, g['heights']) for g in soyo_groups], 'soyo-extra', 4)
    for frame, name in zip(soyo_actions['frames'], [name for g in soyo_groups for name in g['names']]):
        frame['name'] = name
        if name == 'knockdown-ground': frame['ax'] = round(frame['w'] / 2, 2)
    tomori_groups = json.loads((ROOT / 'assets/tomori-actions.json').read_text(encoding='utf-8'))
    tomori_actions = extra_frames([(g['file'], 2, 2, g['heights']) for g in tomori_groups], 'tomori', 4)
    for frame, name in zip(tomori_actions['frames'], [name for g in tomori_groups for name in g['names']]):
        frame['name'] = name
        if name == 'knockdown-ground': frame['ax'] = round(frame['w'] / 2, 2)
    tomori_frames = {f['name']: f for f in tomori_actions['frames']}
    idle, _ = figures_from_sheet(ROOT / 'assets/tomori-presence-v1.png', 2, 2)[0]
    idle.save(ROOT / 'assets/tomori-idle.png')
    # The legacy sixteen slots remain available for result/fallback poses; live animation uses named frames.
    base_names = ['idle', 'walk-contact', 'walk-pass', 'guard-crouch', 'normal-windup', 'mic-light', 'normal-recover',
                  'echo-windup', 'chorus-release', 'normal-recover', 'jump-rise', 'jump-fall', 'hit-high', 'knockdown-fall', 'victory', 'knockdown-ground']
    characters.append(dict(atlas=tomori_actions['atlas'], frames=[tomori_frames[n] for n in base_names], portrait=data_url(idle, lossless=True)))
    penguin_groups = json.loads((ROOT / 'assets/tomori-penguin-actions.json').read_text(encoding='utf-8'))
    penguin = extra_frames([(g['file'], 2, 2, g['heights']) for g in penguin_groups], 'tomori-penguin', 4)
    for frame, name in zip(penguin['frames'], [name for g in penguin_groups for name in g['names']]):
        frame['name'] = name
        if name == 'knockdown-ground': frame['ax'] = round(frame['w'] / 2, 2)
    assets = dict(characters=characters, backgrounds=backgrounds, stages=stages, anonNormals=normals, milkDragon=dragon, anonActions=actions, soyoActions=soyo_actions, soyoTensora=tensora, tomoriActions=tomori_actions, penguin=penguin)
    voice_folder = ROOT / 'assets/audio'
    voice_manifest = json.loads((voice_folder / 'penguin-voices.json').read_text(encoding='utf-8'))
    assets['penguinVoices'] = {clip['move']: 'data:audio/mpeg;base64,' + base64.b64encode((voice_folder / clip['file']).read_bytes()).decode()
                             for clip in voice_manifest['clips']}
    html = (ROOT / "src/page.html").read_text(encoding="utf-8")
    for marker, value in {
        "/*__STYLE__*/": (ROOT / "src/style.css").read_text(encoding="utf-8"),
        "/*__ASSETS__*/": "window.MYGO_ASSETS=" + json.dumps(assets, separators=(",", ":")) + ";",
        "/*__ENGINE__*/": (ROOT / "src/engine.js").read_text(encoding="utf-8"),
        "/*__ANIMATION__*/": (ROOT / "src/animation.js").read_text(encoding="utf-8"),
        "/*__CAMERA__*/": (ROOT / "src/camera.js").read_text(encoding="utf-8"),
        "/*__VOICE__*/": (ROOT / "src/voice.js").read_text(encoding="utf-8"),
        "/*__APP__*/": (ROOT / "src/app.js").read_text(encoding="utf-8"),
    }.items():
        html = html.replace(marker, value)
    (ROOT / "index.html").write_text(html, encoding="utf-8")
    print(f"Built {ROOT / 'index.html'} ({len(html.encode()):,} bytes); {len(stages)} stages, 3 playable characters, 24 Tomori sprites + 32 penguin form sprites and all existing art embedded.")


if __name__ == "__main__":
    build()
