"""Pack local stage artwork and its playable geometry for the runtime media manifest."""
import base64
import io
import json
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]

# Traces are measured on a 960 x 540 copy of the packaged image. Emit the
# image rectangle and physics coordinates together so they share one projection.
ART_SCALE = 3
ART_LEFT = 480 - 480 * ART_SCALE


def trace_stage(entry):
    trace = entry['surfaces']
    floor_y = trace['floorY']
    bounds = dict(left=ART_LEFT, top=438 - floor_y * ART_SCALE,
                  width=960 * ART_SCALE, height=540 * ART_SCALE)
    terrain = dict(entry['terrain'])
    terrain['ground'] = [dict(x=ART_LEFT + x * ART_SCALE, y=(floor_y - y) * ART_SCALE)
                         for x, y in trace.get('ground', [])]
    terrain['platforms'] = [dict(left=ART_LEFT + left * ART_SCALE, right=ART_LEFT + right * ART_SCALE,
                                 height=(floor_y - y) * ART_SCALE)
                            for left, right, y in trace.get('ledges', [])]
    return bounds, terrain


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
        bounds, terrain = trace_stage(entry)
        stages.append(dict(id=entry['id'], name=entry['name'], thumbnail=image_url(thumbnail, 78),
                           artBounds=bounds, terrain=terrain, category=entry.get('category', '其他'),
                           layout=entry.get('layout', '多层平台'), ambience=entry.get('ambience', 'sparkles')))
    return dict(backgrounds=backgrounds, stages=stages)
