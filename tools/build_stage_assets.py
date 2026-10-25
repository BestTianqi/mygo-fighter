"""Pack local stage artwork and its playable geometry for the runtime media manifest."""
import base64
import io
import json
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]


def image_url(image, quality):
    buffer = io.BytesIO()
    image.save(buffer, format='WEBP', quality=quality, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buffer.getvalue()).decode()


def pack_stages():
    backgrounds, stages = [], []
    for entry in json.loads((ROOT / 'assets/stages/stages.json').read_text(encoding='utf-8')):
        with Image.open(ROOT / entry['file']) as source:
            bg = ImageOps.fit(source.convert('RGB'), (1600, 900), method=Image.Resampling.LANCZOS,
                              centering=tuple(entry.get('focalPoint', [.5, .5])))
        backgrounds.append(image_url(bg, 88))
        thumbnail = bg.resize((320, 180), Image.Resampling.LANCZOS)
        stages.append(dict(id=entry['id'], name=entry['name'], thumbnail=image_url(thumbnail, 78),
                           terrain=entry['terrain'], category=entry.get('category', '其他'),
                           layout=entry.get('layout', '多层平台'), ambience=entry.get('ambience', 'sparkles')))
    return dict(backgrounds=backgrounds, stages=stages)
