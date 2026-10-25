"""Pack reviewed recordings and component-extracted Uika crawling poses.

Only the small meme-media catalogs/artifacts are written by this module; the
main build imports pack_meme_assets() before exporting the runtime manifest.
"""
import base64
import hashlib
import json
import re
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
MEDIA = ASSETS / 'meme-media'
CHARACTERS = ['anon', 'soyo', 'tomori', 'rana', 'taki', 'umiri', 'sakiko',
              'uika', 'mutsumi', 'nyamu', 'arale', 'ritsu', 'miyako', 'yuno', 'nonoka', 'viola']
CATALOGS = ['recordings/sources-recordings.json', 'research-mygo/sources-mygo-extra.json',
            'research-mygo/sources-mygo-additional.json', 'research-mewtype/manifest.json',
            'revision-anon-tensora/sources-revision.json',
            'miyako-skill-voices/sources.json', 'viola-story/sources.json']
CRAWL_NAMES = ['crawl-windup', 'crawl-a', 'crawl-b', 'crawl-recover']


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8'))


def asset_path(value, catalog):
    """Resolve the three reviewed catalogs' existing path conventions."""
    path = Path(value)
    if path.is_absolute():
        resolved = path
    elif value.replace('\\', '/').startswith('assets/'):
        resolved = ROOT / path
    elif value.replace('\\', '/').startswith('meme-media/'):
        resolved = ASSETS / path
    else:
        resolved = catalog.parent / path
    if not resolved.is_file() or not resolved.stat().st_size:
        raise FileNotFoundError(f'missing recorded media: {resolved}')
    return resolved.relative_to(ROOT).as_posix()


def source_info(row, catalog):
    nested = row.get('source') if isinstance(row.get('source'), dict) else {}
    url = row.get('sourceURL') or row.get('url') or nested.get('url') or nested.get('source')
    if not url and isinstance(row.get('source'), str):
        url = row['source']
    bvid = row.get('bvid') or nested.get('bvid')
    if not bvid and url:
        match = re.search(r'BV[0-9A-Za-z]+', url)
        bvid = match.group() if match else None
    if not url and bvid:
        url = f'https://www.bilibili.com/video/{bvid}/'
    owner = nested.get('owner') or {}
    return dict(url=url, uploader=row.get('author') or row.get('uploader') or nested.get('author') or owner.get('name'),
                bvid=bvid, cid=row.get('cid') or nested.get('cid'), page=row.get('page') or nested.get('page', 1),
                title=row.get('title') or nested.get('title'), start=row['start'], end=row['end'],
                proof=row.get('speakerVerification') or row.get('evidence') or row.get('context'),
                catalog=catalog.relative_to(ROOT).as_posix())


def normalize_clip(row, catalog, identifier, slot, voice=None):
    clip = dict(voice=voice or f'meme_{identifier}_{slot}', label=row['label'], slot=slot,
                audio=asset_path(row['audio'], catalog), duration=round(row['end'] - row['start'], 3),
                source=source_info(row, catalog))
    if row.get('video'):
        clip['video'] = asset_path(row['video'], catalog)
    for field in ('spokenJapanese', 'transcript_ja', 'subtitle_zh'):
        if row.get(field):
            clip[field] = row[field]
    return clip


def build_catalog():
    """Normalize reviewed inputs, retaining deliberate form/attack aliases."""
    profiles = {str(i): dict(id=i, key=key, slots={}, variants={}) for i, key in enumerate(CHARACTERS)}
    for relative in CATALOGS:
        catalog = MEDIA / relative
        for row in read_json(catalog)['clips']:
            identifier = CHARACTERS.index(row['character'])
            slot = (row.get('slot') or row.get('key')).lower()
            profiles[str(identifier)]['slots'][slot] = normalize_clip(row, catalog, identifier, slot)
    profiles['4']['slots']['p']['label'] = '哈？哈？哈？'
    cry_catalog = MEDIA / 'anon-cry-soyo-control/sources.json'
    profiles['0']['variants']['anonCry'] = normalize_clip(read_json(cry_catalog)['cry'], cry_catalog, 0, 'cry', 'meme_0_cry')
    cutline_catalog = MEDIA / 'soyo-cutline/sources.json'
    profiles['1']['variants']['soyoCutline'] = normalize_clip(read_json(cutline_catalog)['cutline'], cutline_catalog, 1, 'i', 'meme_1_cutline')

    # Preserve the already integrated Haruhikage recording without embedding it twice.
    soyo_catalog = ASSETS / 'mygo/soyo/haruhikage/sources.json'
    soyo_source = read_json(soyo_catalog)
    selected = soyo_source['selectedSource']
    soyo_row = dict(label=soyo_source['superName'], audio='assets/mygo/soyo/haruhikage/soyo-haruhikage-voice.mp3',
                    video='assets/mygo/soyo/haruhikage/soyo-haruhikage-cutin.mp4', source=selected['url'],
                    author=selected['uploader'], start=selected['startSeconds'], end=selected['endSeconds'])
    soyo = normalize_clip(soyo_row, soyo_catalog, 1, 'p', 'soyoSuper')
    soyo.update(duration=2.8, voiceRef='soyoSuper', videoRef='soyoSuperVideo')
    soyo['source']['proof'] = 'Existing verified Haruhikage cut; legacy sidecar does not record cid.'
    profiles['1']['slots']['p'] = soyo

    for identifier, profile in profiles.items():
        profile['variants']['throw'] = profile['slots']['o']
        if 5 <= int(identifier) < 10:
            profile['slots']['h'] = profile['slots']['i']
    for move, slot in [('rikiRollBoost', 'u'), ('rikiRushBoost', 'u'), ('rikiOverheadBoost', 'u'),
                       ('rikiShockBoost', 'i'), ('rikiShockExtra', 'i'), ('rikiRiseBoost', 'i')]:
        profiles['4']['variants'][move] = profiles['4']['slots'][slot]
    penguin_catalog = MEDIA / 'recordings/sources-penguin-p.json'
    penguin_row = read_json(penguin_catalog)['clips'][0]
    penguin = normalize_clip(penguin_row, penguin_catalog, 2, 'p', 'meme_2_penguin_p')
    penguin.update(label='春日影·企鹅演唱')
    profiles['2']['variants']['penguinSuper'] = penguin
    revision_catalog = MEDIA / 'penguin-mortis/sources.json'
    revision = read_json(revision_catalog)
    profiles['8']['variants']['mujica_8_stage_super'] = normalize_clip(revision['mortisSuper'], revision_catalog, 8, 'p', 'meme_8_stage_p')
    tempo_catalog = MEDIA / 'combat-tempo/sources.json'
    profiles['0']['variants']['sonic'] = normalize_clip(read_json(tempo_catalog)['tgw'], tempo_catalog, 0, 'i', 'meme_0_tgw')
    toddler_catalog = MEDIA / 'mortis-toddler/sources.json'
    for row in read_json(toddler_catalog)['clips']:
        profiles['8']['variants'][row['move']] = normalize_clip(row, toddler_catalog, 8, 'u' if row['move'].endswith('toddler') else 'i', row['voice'])
    stage_voice_catalog = MEDIA / 'mortis-stage-voices/sources.json'
    for row in read_json(stage_voice_catalog)['clips']:
        profiles['8']['variants'][row['move']] = normalize_clip(row, stage_voice_catalog, 8, row['slot'], row['voice'])
    # Pair the selected scream with the exact same source interval on screen.
    mortis_super = profiles['8']['variants']['mujica_8_stage_super']
    scream = profiles['8']['variants']['mujica_8_stage_o']
    super_video = read_json(stage_voice_catalog)['superVideo']
    mortis_super['video'] = asset_path(super_video['video'], stage_voice_catalog)
    mortis_super['videoSource'] = source_info(super_video, stage_voice_catalog)
    mortis_super.update(label='Mortis·失控尖叫', audio=scream['audio'],
                        duration=scream['duration'], source=scream['source'])
    profiles['8']['variants']['stage_throw'] = profiles['8']['variants']['mujica_8_stage_o']
    customer_catalog = MEDIA / 'sakiko-customer-service/sources.json'
    row = read_json(customer_catalog)['clips'][0]
    profiles['6']['variants'][row['move']] = normalize_clip(row, customer_catalog, 6, 'u', row['voice'])
    sakiko_catalog = MEDIA / 'sakiko-requiem/sources.json'
    for row in read_json(sakiko_catalog)['clips']:
        profiles['6']['slots'][row['slot']] = normalize_clip(row, sakiko_catalog, 6, row['slot'], row['voice'])
    profiles['6']['variants']['throw'] = profiles['6']['slots']['o']
    arale_catalog = MEDIA / 'arale-story/sources.json'
    for row in read_json(arale_catalog)['clips']:
        profiles['10']['variants'][row['move']] = normalize_clip(row, arale_catalog, 10, row['slot'], row['voice'])
    profiles['10']['variants']['throw'] = dict(profiles['10']['variants']['mewtype_10_virtual_o'], label='行动起来·麦克风摔投')
    nonoka_catalog = MEDIA / 'nonoka-story/sources.json'
    for row in read_json(nonoka_catalog)['clips']:
        profiles['14']['variants'][row['move']] = normalize_clip(row, nonoka_catalog, 14, row['slot'], row['voice'])
    nonoka = profiles['14']['variants']
    nonoka['mewtype_14_virtual_wave'] = dict(nonoka['mewtype_14_virtual_u'], label='兔食者·咬咬波')
    nonoka['mewtype_14_virtual_comfort'] = dict(nonoka['mewtype_14_virtual_o'], label='我没事哦·元气护身')
    nonoka['mewtype_14_virtual_super'] = dict(nonoka['mewtype_14_virtual_i'],
        label='兔食者·不会放开由乃亲', slot='p', video='assets/meme-media/nonoka-story/nonoka-stay-cutin.mp4', videoRate=1)
    nonoka['throw'] = dict(nonoka['mewtype_14_virtual_u'], label='抱抱还是亲亲·抱击')
    yuno_catalog = MEDIA / 'yuno-story/sources.json'
    for row in read_json(yuno_catalog)['clips']:
        profiles['13']['variants'][row['move']] = normalize_clip(row, yuno_catalog, 13, row['slot'], row['voice'])
    yuno = profiles['13']['variants']
    yuno['mewtype_13_virtual_wave'] = dict(yuno['mewtype_13_virtual_u'], label='迈向世界·混音声波')
    yuno['mewtype_13_virtual_guard'] = dict(yuno['mewtype_13_virtual_o'], label='最棒的乐队·合奏屏障', slot='i')
    yuno['mewtype_13_virtual_super'] = dict(yuno['mewtype_13_virtual_o'],
        label='最高のバンド·世界へ', slot='p', video='assets/meme-media/yuno-story/yuno-band-cutin.mp4', videoRate=1)
    yuno['throw'] = dict(yuno['mewtype_13_virtual_i'], label='放开我·摔投')
    ritsu_catalog = MEDIA / 'ritsu-story/sources.json'
    for row in read_json(ritsu_catalog)['clips']:
        profiles['11']['variants'][row['move']] = normalize_clip(row, ritsu_catalog, 11, row['slot'], row['voice'])
    ritsu = profiles['11']['variants']
    ritsu['mewtype_11_virtual_wave'] = dict(ritsu['mewtype_11_virtual_o'], label='七分熟·炙烤弦波', slot='u')
    ritsu['mewtype_11_virtual_counter'] = dict(ritsu['mewtype_11_virtual_i'], label='请多关照·优等生防反·反击')
    ritsu['mewtype_11_virtual_super'].update(video='assets/meme-media/ritsu-story/ritsu-hungry-cutin.mp4', videoRate=1)
    ritsu['throw'] = dict(ritsu['mewtype_11_virtual_u'], label='两磅肉排·摔投')
    miyako_catalog = MEDIA / 'miyako-story/sources.json'
    for row in read_json(miyako_catalog)['clips']:
        profiles['12']['variants'][row['move']] = normalize_clip(row, miyako_catalog, 12, row['slot'], row['voice'])
    profiles['12']['variants']['throw'] = dict(profiles['12']['variants']['mewtype_12_virtual_u'], label='原稿交付·摔投')
    viola_catalog = MEDIA / 'viola-story/sources.json'
    for row in read_json(viola_catalog)['clips']:
        clip = normalize_clip(row, viola_catalog, 15, row['slot'], row['voice'])
        profiles['15']['slots'][row['slot']] = clip
        profiles['15']['variants'][row['move']] = dict(clip)
    profiles['15']['variants']['throw'] = dict(profiles['15']['slots']['o'], label='退场·摔投')
    # Stage-only Uika aliases keep the spoken phrase aligned with its action.
    for move, slot, label in [
        ('mujica_7_stage_u', 'i', '不是不是不是·三重否认'),
        ('mujica_7_stage_i', 'u', '想见Saki酱·逐星突进'),
        ('mujica_7_stage_o', 'o', 'Imprisoned·囚爱星笼'),
        ('mujica_7_stage_crescent', 'u', '同一片星空·弦月回响'),
    ]:
        profiles['7']['variants'][move] = dict(profiles['7']['slots'][slot], label=label)
    # Stage-only aliases reuse the verified Umiri recordings.
    for move, slot, label in [
        ('mujica_5_stage_u', 'u', '意欲何为·三连低鸣'),
        ('mujica_5_stage_i', 'i', '很遗憾·强制返场'),
        ('mujica_5_stage_o', 'o', '我吃不胖·零卡重摔'),
        ('mujica_5_stage_schedule', 'i', '排期已满·准点反拨'),
        ('mujica_5_stage_schedule_counter', 'i', '排期已满·准点反拨·反击'),
    ]:
        profiles['5']['variants'][move] = dict(profiles['5']['slots'][slot], label=label)
    # Reuse the verified Nyamu recordings; normal-form slots and the super video
    # keep their original entries. These labels describe the new stage actions.
    for move, slot, label in [
        ('mujica_9_stage_u', 'u', '素颜公开·摘下面具'),
        ('mujica_9_stage_i', 'i', '双利手·交叉飞棒'),
        ('mujica_9_stage_o', 'o', '我只有Ave Mujica了·绝境鼓点'),
        ('mujica_9_stage_smile', 'i', '完美笑容·营业反击'),
        ('mujica_9_stage_smile_counter', 'i', '完美笑容·营业反击·反击'),
    ]:
        profiles['9']['variants'][move] = dict(profiles['9']['slots'][slot], label=label)
    for profile in profiles.values():
        for clip in [*profile['slots'].values(), *profile['variants'].values()]:
            if clip['slot'] == 'p':
                clip['videoRate'] = 1
    old_catalog = ASSETS / 'audio/penguin-voices.json'
    old = read_json(old_catalog)
    labels = dict(penguinCry='糖哭', penguinHey='hey?', penguinCall='咕咕嘎嘎',
                  penguinKick='飞踢', penguinLaugh='唐笑')
    for row in old['clips']:
        move = row['move']
        merged = dict(penguin_row, **row)
        merged.update(audio=(ASSETS / 'audio' / row['file']).relative_to(ROOT).as_posix(), label=labels[move])
        merged.pop('video', None)
        clip = normalize_clip(merged, old_catalog, 2, move, move)
        clip['voiceRef'] = move
        profiles['2']['variants'][move] = clip
    profiles['2']['variants']['penguinCryWave'] = profiles['2']['variants']['penguinCry']
    profiles['2']['slots']['h'] = profiles['2']['variants']['penguinCall']
    catalog = dict(version=1, characters=profiles,
                   sourceCatalogs=[(MEDIA / name).relative_to(ROOT).as_posix() for name in CATALOGS] + [cry_catalog.relative_to(ROOT).as_posix(), cutline_catalog.relative_to(ROOT).as_posix(), revision_catalog.relative_to(ROOT).as_posix(), tempo_catalog.relative_to(ROOT).as_posix(), toddler_catalog.relative_to(ROOT).as_posix(), stage_voice_catalog.relative_to(ROOT).as_posix()],
                   notes=['Mujica normal/stage forms share recordings except the dedicated Mortis stage kit, transformation, throw and super.',
                          'Penguin variants use existing penguinVoices; ordinary Tomori keeps her own slots.',
                          'Soyo legacy cid is unknown and is preserved as null rather than fabricated.'])
    revision = MEDIA / 'revision-anon-tensora/sources-revision.json'
    catalog['sourceCatalogs'].append(customer_catalog.relative_to(ROOT).as_posix())
    catalog['sourceCatalogs'].append(sakiko_catalog.relative_to(ROOT).as_posix())
    catalog['sourceCatalogs'].append(arale_catalog.relative_to(ROOT).as_posix())
    catalog['sourceCatalogs'].append(nonoka_catalog.relative_to(ROOT).as_posix())
    catalog['sourceCatalogs'].append(yuno_catalog.relative_to(ROOT).as_posix())
    catalog['sourceCatalogs'].append(ritsu_catalog.relative_to(ROOT).as_posix())
    catalog['sourceCatalogs'].append(miyako_catalog.relative_to(ROOT).as_posix())
    catalog['summonCall'] = normalize_clip(read_json(revision)['summonCall'], revision, 1, 'summonCall', 'tensoraOhYeah')
    (MEDIA / 'manifest.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding='utf-8')
    return catalog


def extract_crawl_forms():
    """Separate complete connected figures, including only their 2px alpha fringe.

    Source bounding boxes overlap, so independently masked components are cropped
    rather than rectangular grid cells. No previously reviewed Mujica art changes.
    """
    folder = MEDIA / 'uika-crawl'
    source = folder / 'uika-crawl-sheet-raw-v1.png'
    image = Image.open(source).convert('RGBA')
    pixels = np.asarray(image)
    alpha = pixels[:, :, 3]
    labels, count = ndimage.label(alpha > 100)
    areas = np.bincount(labels.ravel())
    components = []
    for identifier in range(1, count + 1):
        if areas[identifier] <= 10000:
            continue
        ys, xs = np.nonzero(labels == identifier)
        components.append(dict(label=identifier, cx=float(xs.mean()), cy=float(ys.mean())))
    if len(components) != 8:
        raise ValueError(f'expected eight complete crawl figures, found {len(components)}')
    components.sort(key=lambda component: component['cy'])
    forms, proof_pieces = {}, {}
    for outfit, row in [('normal', components[:4]), ('stage', components[4:])]:
        pieces, frames = [], []
        for name, component in zip(CRAWL_NAMES, sorted(row, key=lambda component: component['cx'])):
            identifier = component['label']
            core = labels == identifier
            fringe = (alpha > 0) & ((labels == 0) | core)
            mask = ndimage.binary_dilation(core, iterations=2, mask=fringe)
            ys, xs = np.nonzero(mask)
            bounds = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
            rgba = pixels[bounds[1]:bounds[3], bounds[0]:bounds[2]].copy()
            rgba[~mask[bounds[1]:bounds[3], bounds[0]:bounds[2]]] = 0
            piece = Image.fromarray(rgba)
            height = round(min(160, max(130, 245 * piece.height / piece.width)), 2) if name in ('crawl-a', 'crawl-b') else 145 if name == 'crawl-windup' else 160
            frame = dict(name=name, w=piece.width, h=piece.height, height=height,
                         ax=round(piece.width / 2, 2), ay=piece.height,
                         sourceBounds=list(bounds), corePixels=int(areas[identifier]))
            piece.save(folder / f'{outfit}-{name}.webp', lossless=True)
            pieces.append(piece)
            frames.append(frame)
        cell_width = max(piece.width for piece in pieces) + 16
        cell_height = max(piece.height for piece in pieces) + 16
        atlas = Image.new('RGBA', (cell_width * 2, cell_height * 2))
        for index, (piece, frame) in enumerate(zip(pieces, frames)):
            x, y = 8 + index % 2 * cell_width, 8 + index // 2 * cell_height
            atlas.paste(piece, (x, y))
            frame.update(x=x, y=y)
        runtime = folder / f'{outfit}-crawl-runtime.webp'
        atlas.save(runtime, lossless=True)
        forms[outfit] = dict(atlas=runtime.relative_to(ROOT).as_posix(), frames=frames)
        proof_pieces[outfit] = pieces
    proof = Image.new('RGB', (1280, 720), '#d9d1c4')
    draw = ImageDraw.Draw(proof)
    for row, outfit in enumerate(('normal', 'stage')):
        for index, piece in enumerate(proof_pieces[outfit]):
            frame = forms[outfit]['frames'][index]
            preview = piece.copy()
            preview.thumbnail((302, 296), Image.Resampling.LANCZOS)
            left = index * 320 + (320 - preview.width) // 2
            top = row * 360 + 318 - preview.height
            proof.paste(preview, (left, top), preview)
            draw.text((index * 320 + 8, row * 360 + 330), f'{outfit} {frame["name"]} h={frame["height"]}', fill='#29232b')
    proof.save(folder / 'uika-crawl-proof.png')
    frames_catalog = dict(source=source.relative_to(ROOT).as_posix(),
                          sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
                          extraction='alpha>100 large components, independent masks, connected 2px fringe', forms=forms)
    (folder / 'crawl-frames.json').write_text(json.dumps(frames_catalog, ensure_ascii=False, indent=2), encoding='utf-8')
    return forms


def data_url(relative, mime):
    return f'data:{mime};base64,' + base64.b64encode((ROOT / relative).read_bytes()).decode('ascii')


def pack_meme_assets():
    catalog = build_catalog()
    profiles, voices, soyo_voices = {}, {}, {}

    def runtime_entry(clip):
        entry = dict(voice=clip['voice'], label=clip['label'], duration=clip['duration'])
        if clip.get('videoRate'):
            entry['videoRate'] = clip['videoRate']
        if not clip.get('voiceRef'):
            voices.setdefault(clip['voice'], data_url(clip['audio'], 'audio/mpeg'))
        elif clip['voice'] == 'soyoSuper':
            soyo_voices['soyoSuper'] = data_url(clip['audio'], 'audio/mpeg')
        if clip.get('videoRef'):
            entry['videoRef'] = clip['videoRef']
        elif clip.get('video'):
            entry['video'] = data_url(clip['video'], 'video/mp4')
        return entry

    for identifier, profile in catalog['characters'].items():
        profiles[identifier] = dict(slots={slot: runtime_entry(clip) for slot, clip in profile['slots'].items()},
                                    variants={move: runtime_entry(clip) for move, clip in profile['variants'].items()})
    crawl_forms = {outfit: dict(atlas=data_url(form['atlas'], 'image/webp'), frames=form['frames'])
                   for outfit, form in extract_crawl_forms().items()}
    summon_voices = {'tensoraOhYeah': data_url(catalog['summonCall']['audio'], 'audio/mpeg')}
    music = read_json(MEDIA / 'uika-imprisoned/sources.json')
    transform_music = {'uikaImprisoned': data_url(music['audio'], 'audio/mpeg')}
    from build_mask_assets import pack_mask_assets
    mask_forms = pack_mask_assets()
    return dict(memeSkills=profiles, memeVoices=voices, memeCrawlForms=crawl_forms, summonVoices=summon_voices,
                soyoVoices=soyo_voices, transformMusic=transform_music, mujicaMaskForms=mask_forms,
                uikaFinishArt=data_url('assets/meme-media/combat-tempo/uika-crawl-finish.webp', 'image/webp'))


if __name__ == '__main__':
    packed = pack_meme_assets()
    print(f'Packed {len(packed["memeSkills"])} characters, {len(packed["memeVoices"])} recorded voices and 8 crawl drawings.')
