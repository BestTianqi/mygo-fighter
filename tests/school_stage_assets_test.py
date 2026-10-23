"""Verify downloaded game artwork provenance and the delivered offline stage pack."""
import hashlib
import json
import sys
import unittest
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))


class SchoolStageAssetsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.scenes = json.loads((ROOT / 'assets/stages.json').read_text(encoding='utf-8'))
        cls.catalog = json.loads((ROOT / 'assets/stages/campus/sources.json').read_text(encoding='utf-8'))
        html = (ROOT / 'index.html').read_text(encoding='utf-8')
        cls.assets, _ = json.JSONDecoder().raw_decode(html.split('window.MYGO_ASSETS=', 1)[1])

    def test_original_downloads_match_the_recorded_sources(self):
        self.assertEqual(len(self.catalog['sources']), 9)
        for row in self.catalog['sources']:
            path = ROOT / row['file']
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), row['sha256'], row['id'])
            with Image.open(path) as im:
                self.assertEqual(list(im.size), row['size'])
                self.assertGreaterEqual(min(im.size), 720)
            self.assertTrue(row['url'].startswith('https://bestdori.com/assets/jp/bg/'))

    def test_delivered_scenes_include_all_geometry_and_local_images(self):
        self.assertEqual(len(self.assets['stages']), len(self.scenes))
        self.assertEqual(len(self.assets['backgrounds']), len(self.scenes))
        for row, packed, background in zip(self.scenes, self.assets['stages'], self.assets['backgrounds']):
            self.assertEqual(row['id'], packed['id'])
            self.assertEqual(row['terrain'], packed['terrain'])
            self.assertEqual(row.get('layout', '多层平台'), packed['layout'])
            self.assertTrue(background.startswith('data:image/webp;base64,'))
            self.assertTrue(packed['thumbnail'].startswith('data:image/webp;base64,'))
        self.assertEqual(len(set(self.assets['backgrounds'])), len(self.scenes))


if __name__ == '__main__':
    unittest.main()
