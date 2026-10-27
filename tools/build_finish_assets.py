"""Pack dedicated KO illustrations while retaining existing runtime media."""
import json
import base64

from PIL import Image
from build import ROOT, data_url, export_assets

FOLDER = ROOT / 'assets/finish-art'
ART = {
    '0': 'anon-milk-dragon-v1.png',
    '2': 'tomori-penguin-v1.png',
    '3': 'rana-anime-ending.webp',
    '4': 'taki-anime-composer.webp',
    '10': 'arale-anime-dream.webp',
    '11': 'ritsu-anime-hungry.webp',
    '12': 'miyako-super-background-v1.webp',
    '13': 'yuno-anime-band.webp',
    '14': 'nonoka-anime-stay.webp',
    '15': 'viola-anime-ignition.webp',
}

ULTIMATE_ART = {
    '0': {'normal': 'anon-dragon'},
    '1': {'normal': 'soyo-normal'},
    '2': {'normal': 'tomori-penguin', 'penguin': 'tomori-penguin'},
    '3': {'normal': 'rana-normal'},
    '4': {'normal': 'riki-normal'},
    **{str(character): {form: f'{key}-{form}' for form in ('normal', 'stage')}
       for character, key in ((5, 'umiri'), (6, 'sakiko'), (7, 'uika'),
                              (8, 'mutsumi'), (9, 'nyamu'))},
    **{str(character): {'normal': f'{key}-virtual'}
       for character, key in ((10, 'arale'), (11, 'ritsu'), (12, 'miyako'),
                              (13, 'yuno'), (14, 'nonoka'), (15, 'viola'))},
}


def install_ultimate_finishes(assets):
    folder = FOLDER / 'v2'
    voices = json.loads((folder / 'sources-voices.json').read_text(encoding='utf-8-sig'))
    by_character = {str(voice['character']): voice for voice in voices}
    assets['finishVoices'] = {
        voice['key']: 'data:audio/mpeg;base64,' + base64.b64encode(
            (ROOT / voice['output']).read_bytes()).decode()
        for voice in voices
    }
    scenes = {}
    packed = {}
    for character, forms in ULTIMATE_ART.items():
        scenes[character] = {}
        for form, stem in forms.items():
            if stem not in packed:
                with Image.open(folder / f'{stem}.png') as source:
                    if source.width / source.height < 1.6:
                        raise ValueError(f'{stem}: expected wide illustration')
                    image = source.convert('RGB')
                image.thumbnail((1600, 900), Image.Resampling.LANCZOS)
                packed[stem] = data_url(image, quality=91)
            voice = by_character.get(character)
            scenes[character][form] = {
                'art': packed[stem],
                **({'voice': voice['key'], 'line': voice['line']} if voice else {}),
            }
    assets['ultimateFinishes'] = scenes


def install_finish_art(assets):
    finishes = assets.setdefault('finishArts', {})
    for character, filename in ART.items():
        with Image.open(FOLDER / filename) as source:
            if character not in ('3', '4', '10', '11', '12', '13', '14', '15') and (source.mode != 'RGBA' or source.getextrema()[3][0] != 0):
                raise ValueError(f'{filename}: expected transparent illustration')
            image = source.copy()
        image.thumbnail((1000, 1200), Image.Resampling.LANCZOS)
        finishes[character] = data_url(image, quality=94)
    install_ultimate_finishes(assets)


if __name__ == '__main__':
    assets = json.loads((ROOT / 'frontend/public/assets.json').read_text(encoding='utf-8'))
    # Targeted v2 updates retain the exact existing ordinary-KO media bytes.
    install_ultimate_finishes(assets)
    export_assets(assets)
