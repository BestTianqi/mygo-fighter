"""Regenerate game artwork and export the cacheable React media manifest.

Build dependencies: Pillow, numpy, scipy (optional artwork workflow only).
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


def export_assets(assets):
    """Write cacheable, content-addressed assets for the React application."""
    import hashlib
    output = ROOT / 'frontend/public'
    media = output / 'media'
    media.mkdir(parents=True, exist_ok=True)
    emitted = set()
    def externalize(value):
        if isinstance(value, dict):
            return {key: externalize(item) for key, item in value.items()}
        if isinstance(value, list):
            return [externalize(item) for item in value]
        if isinstance(value, str) and value.startswith('/media/'):
            emitted.add(value.removeprefix('/media/'))
            return value
        if isinstance(value, str) and value.startswith('data:'):
            header, encoded = value.split(',', 1)
            payload = base64.b64decode(encoded)
            suffix = {'image/webp': 'webp', 'image/png': 'png', 'audio/mpeg': 'mp3', 'video/mp4': 'mp4'}[header[5:].split(';')[0]]
            filename = hashlib.sha256(payload).hexdigest()[:20] + '.' + suffix
            emitted.add(filename)
            (media / filename).write_bytes(payload)
            return '/media/' + filename
        return value
    manifest = externalize(assets)
    # Only retire generated content-addressed files, never unrelated source artwork.
    import re
    for old in media.iterdir():
        if re.fullmatch(r'[0-9a-f]{20}\.(webp|png|mp3|mp4)', old.name) and old.name not in emitted:
            old.unlink()
    (output / 'assets.json').write_text(json.dumps(manifest, separators=(',', ':')), encoding='utf-8')
    (ROOT / 'scripts/stages.json').write_text(json.dumps([{'terrain': stage['terrain']} for stage in assets['stages']], separators=(',', ':')), encoding='utf-8')
    print(f"Exported {len(assets['characters'])} characters and {len(assets['stages'])} stages to {output}")


def game_atlas(source, frames, columns):
    # Keep the high-resolution originals and previews. Gameplay needs about
    # 180 screen pixels per standing body, so two pixels per world unit leave
    # ample detail while avoiding first-use rasterization of 10-22 MP sheets.
    pieces = []
    for frame in frames:
        logical_height = frame.get('height', 235 * frame['h'] / frames[0]['h'])
        height = min(frame['h'], round(logical_height * 2))
        ratio = height / frame['h']
        piece = source.crop((frame['x'], frame['y'], frame['x'] + frame['w'], frame['y'] + frame['h']))
        width = round(frame['w'] * ratio)
        if ratio < 1:
            piece = piece.resize((width, height), Image.Resampling.LANCZOS)
        pieces.append((piece, frame, ratio))
    cell_w = max(p.width for p, _, _ in pieces) + 12
    cell_h = max(p.height for p, _, _ in pieces) + 12
    atlas = Image.new('RGBA', (cell_w * columns, cell_h * ((len(pieces) + columns - 1) // columns)))
    packed = []
    for i, (piece, original, ratio) in enumerate(pieces):
        x, y = i % columns * cell_w + 6, i // columns * cell_h + 6
        atlas.paste(piece, (x, y))
        packed.append({**original, 'x': x, 'y': y, 'w': piece.width, 'h': piece.height,
                       'ax': round(original['ax'] * piece.width / original['w'], 2),
                       'ay': round(original['ay'] * ratio, 2)})
    return dict(atlas=data_url(atlas, lossless=True), frames=packed)


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
    return {**game_atlas(atlas, frames, 4), 'portrait': data_url(sprites[0][0], lossless=True)}


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
    return game_atlas(atlas, frames, columns)


def build():
    from build_mujica_assets import pack_all
    from build_mewtype_assets import pack_all as pack_mewtype, validate_sources as validate_mewtype
    # A final game must have every real pose. Fail before rebuilding legacy art
    # when any reviewed Mujica source is still missing.
    validate_mewtype()
    mewtype_forms, mewtype_characters = pack_mewtype()
    mujica_forms, mujica_characters = pack_all()
    characters = [frames_from_sheet(name) for name in ["anon", "soyo"]]
    from build_stage_assets import pack_stages
    stage_assets = pack_stages()
    backgrounds, stages = stage_assets['backgrounds'], stage_assets['stages']
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
    rana_groups = json.loads((ROOT / 'assets/rana-actions.json').read_text(encoding='utf-8'))
    rana = extra_frames([(g['file'], 2, 2, g['heights']) for g in rana_groups], 'rana', 8)
    for frame, name in zip(rana['frames'], [name for g in rana_groups for name in g['names']]):
        frame['name'] = name
        if name == 'knockdown-ground': frame['ax'] = round(frame['w'] / 2, 2)
    rana_frames = {f['name']: f for f in rana['frames']}
    idle, _ = figures_from_sheet(ROOT / 'assets/rana-presence-v1.png', 2, 2)[0]
    idle.save(ROOT / 'assets/rana-idle.png')
    base_names = ['idle', 'walk-contact', 'walk-pass', 'guard-crouch', 'normal-windup', 'standing-light', 'normal-recover',
                  'normal-windup', 'solo-release', 'normal-recover', 'jump-rise', 'jump-fall', 'hit-high', 'knockdown-fall', 'victory', 'knockdown-ground']
    characters.append(dict(atlas=rana['atlas'], frames=[rana_frames[n] for n in base_names], actionFrames=rana['frames'], portrait=data_url(idle, lossless=True)))
    riki_frames = json.loads((ROOT / 'assets/riki-frames.json').read_text(encoding='utf-8'))
    riki = game_atlas(Image.open(ROOT / 'assets/riki-runtime.webp').convert('RGBA'), riki_frames, 8)
    riki_by_name = {f['name']: f for f in riki['frames']}
    base_names = ['idle', 'walk-contact', 'walk-pass', 'guard-crouch', 'normal-windup', 'standing-light', 'normal-recover',
                  'normal-windup', 'eight-beat-release', 'normal-recover', 'jump-rise', 'jump-fall', 'hit-high', 'knockdown-fall', 'victory', 'knockdown-ground']
    characters.append(dict(atlas=riki['atlas'], frames=[riki_by_name[n] for n in base_names], actionFrames=riki['frames'],
                           portrait=data_url(Image.open(ROOT / 'assets/riki-idle.png'), lossless=True)))
    parfait_actions = extra_frames([('rana-parfait-throw-v2.png', 2, 2, [235] * 4)], 'rana-parfait-actions', 4)
    for frame, name in zip(parfait_actions['frames'], ['parfait-ready', 'parfait-windup', 'parfait-release', 'parfait-recover']):
        frame['name'] = name
    parfait_sprite, _ = figures_from_sheet(ROOT / 'assets/rana-matcha-parfait-v1.png', 1, 1)[0]
    parfait_sprite.thumbnail((256, 384), Image.Resampling.LANCZOS)
    parfait_sprite.save(ROOT / 'assets/rana-parfait-projectile.webp', lossless=True, method=6)
    penguin_groups = json.loads((ROOT / 'assets/tomori-penguin-actions.json').read_text(encoding='utf-8'))
    penguin = extra_frames([(g['file'], 2, 2, g['heights']) for g in penguin_groups], 'tomori-penguin', 4)
    for frame, name in zip(penguin['frames'], [name for g in penguin_groups for name in g['names']]):
        frame['name'] = name
        if name == 'knockdown-ground': frame['ax'] = round(frame['w'] / 2, 2)
    characters.extend(mujica_characters)
    characters.extend(mewtype_characters)
    assets = dict(characters=characters, mujicaForms=mujica_forms, mewtypeForms=mewtype_forms, backgrounds=backgrounds, stages=stages, anonNormals=normals, milkDragon=dragon, anonActions=actions, soyoActions=soyo_actions, soyoTensora=tensora, tomoriActions=tomori_actions, penguin=penguin)
    from build_meme_assets import pack_meme_assets
    assets.update(pack_meme_assets())
    assets['ranaParfaitActions'] = parfait_actions
    assets['ranaParfait'] = dict(src=data_url(parfait_sprite, lossless=True), height=84)
    voice_folder = ROOT / 'assets/audio'
    voice_manifest = json.loads((voice_folder / 'penguin-voices.json').read_text(encoding='utf-8'))
    assets['penguinVoices'] = {clip['move']: 'data:audio/mpeg;base64,' + base64.b64encode((voice_folder / clip['file']).read_bytes()).decode()
                             for clip in voice_manifest['clips']}
    soyo_folder = ROOT / 'assets/soyo-haruhikage'
    assets.setdefault('soyoVoices', {'soyoSuper': 'data:audio/mpeg;base64,' + base64.b64encode((soyo_folder / 'soyo-haruhikage-voice.mp3').read_bytes()).decode()})
    assets['soyoSuperVideo'] = 'data:video/mp4;base64,' + base64.b64encode((soyo_folder / 'soyo-haruhikage-cutin.mp4').read_bytes()).decode()
    assets['soyoFinishArt'] = 'data:image/webp;base64,' + base64.b64encode((soyo_folder / 'soyo-haruhikage-finish.webp').read_bytes()).decode()
    assets['jabActions'] = []
    for group in json.loads((ROOT / 'assets/jab-actions.json').read_text(encoding='utf-8')):
        art = extra_frames([(group['file'], 2, 3, group['heights'])], ['anon', 'soyo', 'tomori'][group['character']] + '-jab', 3)
        for frame, name in zip(art['frames'], ['jab-2-windup', 'jab-2-impact', 'jab-2-recover', 'jab-3-windup', 'jab-3-impact', 'jab-3-recover']):
            frame['name'] = name
        assets['jabActions'].append(art)
    from build_portrait_assets import install_portraits
    install_portraits(assets)
    from build_mygo_portraits import install_mygo_portraits
    install_mygo_portraits(assets)
    from build_mewtype_portraits import install_mewtype_portraits
    install_mewtype_portraits(assets)
    from build_finish_assets import install_finish_art
    install_finish_art(assets)
    export_assets(assets)


if __name__ == "__main__":
    build()
