"""Verify five complete MewType atlases without weakening existing art checks."""
import base64
import hashlib
import io
import json
import sys
import unittest
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from build import MAX_OFFLINE_BYTES
from build_mewtype_assets import KEYS, POSE_NAMES, source_groups


class MewTypeOfflineTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / 'index.html').read_text(encoding='utf-8')
        cls.assets, _ = json.JSONDecoder().raw_decode(cls.html.split('window.MYGO_ASSETS=', 1)[1])

    def test_all_five_outfits_contain_54_distinct_actual_crops_and_no_transform_fallback(self):
        self.assertEqual(len(self.assets['characters']), 15)
        self.assertEqual(set(self.assets['mewtypeForms']), {str(identifier) for _, identifier in KEYS})
        seen = {art['atlas'] for forms in self.assets['mujicaForms'].values() for art in forms.values()}
        for key, identifier in KEYS:
            stub = self.assets['characters'][identifier]
            self.assertEqual((stub['id'], stub['key']), (identifier, key))
            self.assertEqual(set(stub), {'id', 'key', 'portrait'})
            self.assertTrue(stub['portrait'].startswith('data:image/webp;base64,'))
            forms = self.assets['mewtypeForms'][str(identifier)]
            self.assertEqual(set(forms), {'virtual'})
            art = forms['virtual']
            self.assertEqual([frame['name'] for frame in art['frames']], POSE_NAMES)
            self.assertNotIn(art['atlas'], seen)
            seen.add(art['atlas'])
            self.assertEqual(self.html.count(art['atlas']), 1)
            runtime = base64.b64decode(art['atlas'].split(',', 1)[1])
            self.assertEqual(runtime, (ROOT / f'assets/mewtype/{key}/virtual-runtime.webp').read_bytes())
            image = Image.open(io.BytesIO(runtime)).convert('RGBA')
            drawings = set()
            for frame in art['frames']:
                x, y, w, h = (frame[field] for field in ['x', 'y', 'w', 'h'])
                self.assertTrue(0 <= x < x + w <= image.width, (key, frame['name']))
                self.assertTrue(0 <= y < y + h <= image.height, (key, frame['name']))
                crop = image.crop((x, y, x + w, y + h))
                self.assertIsNotNone(crop.getchannel('A').getbbox())
                drawings.add(hashlib.sha256(crop.tobytes()).digest())
            self.assertEqual(len(drawings), 54, key)
        self.assertEqual(len(seen), 15)  # Ten old Mujica forms and five new outfits.

    def test_reviewed_source_manifests_and_current_module_are_present(self):
        for key, _ in KEYS:
            groups = source_groups(key)
            self.assertEqual([len(group['names']) for group in groups], [8] * 6 + [6])
            self.assertEqual((groups[-1]['columns'], groups[-1]['rows']), (3, 2))
            self.assertTrue(all((ROOT / 'assets' / group['file']).is_file() for group in groups))
        self.assertIn((ROOT / 'src/mewtype.js').read_text(encoding='utf-8'), self.html)
        self.assertLess((ROOT / 'index.html').stat().st_size, MAX_OFFLINE_BYTES)
        self.assertNotRegex(self.html, r'/\*__[A-Z_]+__\*/')


if __name__ == '__main__':
    unittest.main()
