"""Keep all ten Mujica forms intact inside the complete fifteen-person game."""
import base64
import hashlib
import io
import json
import re
import sys
import unittest
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from build_mujica_assets import POSE_NAMES
from build import MAX_OFFLINE_BYTES


class MujicaOfflineTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / 'index.html').read_text(encoding='utf-8')
        marker = 'window.MYGO_ASSETS='
        start = cls.html.index(marker) + len(marker)
        cls.assets, _ = json.JSONDecoder().raw_decode(cls.html[start:])

    def test_all_ten_real_forms_are_embedded_once_with_complete_named_drawings(self):
        self.assertEqual(len(self.assets['characters']), 15)
        self.assertEqual(set(self.assets['mujicaForms']), {'5','6','7','8','9'})
        atlases = set()
        for identifier, forms in self.assets['mujicaForms'].items():
            self.assertEqual(set(forms), {'normal','stage'})
            self.assertNotIn('atlas', self.assets['characters'][int(identifier)])
            for form, art in forms.items():
                self.assertEqual([f['name'] for f in art['frames']], POSE_NAMES)
                self.assertTrue(art['atlas'].startswith('data:image/webp;base64,'))
                self.assertEqual(self.html.count(art['atlas']), 1)
                atlases.add(hashlib.sha256(art['atlas'].encode()).hexdigest())
                image = Image.open(io.BytesIO(base64.b64decode(art['atlas'].split(',')[1]))).convert('RGBA')
                drawings = set()
                for frame in art['frames']:
                    x,y,w,h = (frame[k] for k in ['x','y','w','h'])
                    self.assertTrue(0 <= x < x+w <= image.width, (identifier,form,frame['name']))
                    self.assertTrue(0 <= y < y+h <= image.height, (identifier,form,frame['name']))
                    crop=image.crop((x,y,x+w,y+h))
                    self.assertIsNotNone(crop.getchannel('A').getbbox())
                    drawings.add(hashlib.sha256(crop.tobytes()).digest())
                self.assertEqual(len(drawings), 56, (identifier,form))
        self.assertEqual(len(atlases), 10)

    def test_runtime_matches_current_sources_and_has_no_unresolved_build_markers(self):
        for name in ['mujica.js','mewtype.js','controls.js','engine.js','animation.js','camera.js','voice.js','app.js','style.css']:
            self.assertTrue((ROOT/'src'/name).read_text(encoding='utf-8') in self.html, name)
        self.assertNotRegex(self.html, r'/\*__[A-Z]+__\*/')
        self.assertNotRegex(self.html, r'(?:src|href)=[\"\']https?://')
        self.assertLess((ROOT / 'index.html').stat().st_size, MAX_OFFLINE_BYTES)

    def test_existing_recorded_media_is_still_inside_the_offline_file(self):
        self.assertTrue(self.assets['soyoSuperVideo'].startswith('data:video/mp4;base64,'))
        self.assertTrue(self.assets['soyoVoices']['soyoSuper'].startswith('data:audio/mpeg;base64,'))
        self.assertEqual(len(self.assets['penguinVoices']), 5)
        self.assertTrue(all(src.startswith('data:audio/mpeg;base64,') for src in self.assets['penguinVoices'].values()))


if __name__ == '__main__':
    unittest.main()
