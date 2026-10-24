"""Pack dedicated KO illustrations while retaining existing runtime media."""
import json

from PIL import Image
from build import ROOT, data_url, export_assets

FOLDER = ROOT / 'assets/finish-art'
ART = {
    '0': 'anon-milk-dragon-v1.png',
    '2': 'tomori-penguin-v1.png',
    '12': 'miyako-super-background-v1.webp',
    '14': 'nonoka-anime-stay.webp',
}


def install_finish_art(assets):
    finishes = assets.setdefault('finishArts', {})
    for character, filename in ART.items():
        with Image.open(FOLDER / filename) as source:
            if character not in ('12', '14') and (source.mode != 'RGBA' or source.getextrema()[3][0] != 0):
                raise ValueError(f'{filename}: expected transparent illustration')
            image = source.copy()
        image.thumbnail((1000, 1200), Image.Resampling.LANCZOS)
        finishes[character] = data_url(image, quality=94)


if __name__ == '__main__':
    assets = json.loads((ROOT / 'frontend/public/assets.json').read_text(encoding='utf-8'))
    install_finish_art(assets)
    export_assets(assets)
