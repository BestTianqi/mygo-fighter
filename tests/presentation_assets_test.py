"""Reviewed portrait/phone assets must actually ship with the offline entry point."""
import base64
import hashlib
import io
import json
import unittest
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


class PresentationAssetsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / 'index.html').read_text('utf-8')
        cls.assets, _ = json.JSONDecoder().raw_decode(cls.html.split('window.MYGO_ASSETS=', 1)[1])

    def test_ten_distinct_complete_transparent_portraits_with_face_crops(self):
        portraits = self.assets['mujicaPortraits']
        self.assertEqual(set(portraits), set(map(str, range(5, 10))))
        hashes = set()
        for identifier, forms in portraits.items():
            for form, art in forms.items():
                raw = base64.b64decode(art['portrait'].split(',')[1])
                hashes.add(hashlib.sha256(raw).hexdigest())
                im = Image.open(io.BytesIO(raw)).convert('RGBA')
                self.assertGreater(im.height, 600)
                self.assertEqual(im.getchannel('A').getextrema(), (0, 255))
                face = Image.open(io.BytesIO(base64.b64decode(art['face'].split(',')[1])))
                self.assertEqual(face.size, (320, 320))
                f = art['idle']['frames'][0]
                self.assertEqual(f['height'], 235)
                self.assertEqual(f['ay'], f['h'])
                self.assertGreater(f['ax'], 0)
                self.assertLess(f['ax'], f['w'])
            self.assertEqual(self.assets['characters'][int(identifier)]['portrait'], forms['normal']['portrait'])
        self.assertEqual(len(hashes), 10)

    def test_customer_has_three_authored_poses_and_its_reviewed_recording(self):
        art = self.assets['sakikoCustomerActions']
        im = Image.open(io.BytesIO(base64.b64decode(art['atlas'].split(',')[1])))
        hashes = set()
        self.assertEqual([f['name'] for f in art['frames']], ['customer-windup', 'customer-impact', 'customer-recover'])
        for f in art['frames']:
            crop = im.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']))
            self.assertGreater(sum(a > 100 for a in crop.getchannel('A').getdata()), 10000)
            hashes.add(hashlib.sha256(crop.tobytes()).hexdigest())
        self.assertEqual(len(hashes), 3)
        entry = self.assets['memeSkills']['6']['variants']['mujica_6_normal_customer']
        self.assertEqual(entry['voice'], 'meme_6_customer')
        raw = base64.b64decode(self.assets['memeVoices'][entry['voice']].split(',')[1])
        manifest = json.loads((ROOT / 'assets/meme-media/sakiko-customer-service/sources.json').read_text('utf-8'))['clips'][0]
        self.assertEqual(hashlib.sha256(raw).hexdigest(), manifest['sha256'])
        self.assertEqual(raw, (ROOT / manifest['audio']).read_bytes())

    def test_current_ui_and_rendering_code_is_in_the_playable_file(self):
        for name in ['page.html', 'presentation.css', 'selection.js', 'animation.js', 'app.js', 'mujica.js']:
            if name == 'page.html':
                self.assertIn('id="overlay-reselect"', self.html)
            else:
                self.assertTrue((ROOT / 'src' / name).read_text('utf-8') in self.html, name)
        self.assertLess(len(self.html.encode('utf-8')), 128 * 1024 * 1024)


if __name__ == '__main__':
    unittest.main()
