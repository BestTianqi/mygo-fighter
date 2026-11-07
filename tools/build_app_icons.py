"""Build the game's icon set from Anon's reviewed face crop.

The browser tab, the installed web app and the README share one brand icon:
千早爱音 (Chihaya Anon) smiling, on the theme's ivory plate. Run this only when
the portrait face or the plate colour changes:

    python tools/build_app_icons.py

It writes frontend/public/icon-512.webp (also the README hero image),
icon-192.webp, favicon.png and apple-touch-icon.png. The first two use WebP,
the format the rest of the runtime media uses, to keep the web publishing
bundle under its 50 MB budget. The Apple touch icon stays a full-bleed PNG
because iOS applies its own rounded mask.
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
FACE = ROOT / 'assets/characters/mygo/portraits-v1/anon-normal-face.webp'
PUBLIC = ROOT / 'frontend/public'

# Same ivory as the previous "M" favicon, so the tab keeps its brand colour.
PLATE = (245, 240, 229, 255)
SUPERSAMPLE = 4
FACE_SCALE = 1.15
FACE_TOP = -0.045
CORNER_RADIUS = 0.225
WEBP_QUALITY = 92


def compose(size: int, rounded: bool) -> Image.Image:
    """Place the transparent face crop on the ivory plate at one icon size."""
    work = size * SUPERSAMPLE
    canvas = Image.new('RGBA', (work, work), PLATE)
    width = round(work * FACE_SCALE)
    with Image.open(FACE) as source:
        face = source.convert('RGBA').resize((width, width), Image.Resampling.LANCZOS)
    canvas.alpha_composite(face, ((work - width) // 2, round(work * FACE_TOP)))
    if rounded:
        mask = Image.new('L', (work, work), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            (0, 0, work - 1, work - 1),
            radius=round(work * CORNER_RADIUS),
            fill=255,
        )
        canvas.putalpha(mask)
    return canvas.resize((size, size), Image.Resampling.LANCZOS)


ROUNDED = (
    ('icon-512.webp', 512),
    ('icon-192.webp', 192),
)
for name, size in ROUNDED:
    compose(size, True).save(PUBLIC / name, 'WEBP', quality=WEBP_QUALITY, method=6)
    print(f'Wrote frontend/public/{name} ({size}x{size})')

compose(64, True).save(PUBLIC / 'favicon.png', optimize=True)
print('Wrote frontend/public/favicon.png (64x64)')

compose(180, False).save(PUBLIC / 'apple-touch-icon.png', optimize=True)
print('Wrote frontend/public/apple-touch-icon.png (180x180)')
