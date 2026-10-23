import base64
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from build_meme_assets import build_catalog, pack_meme_assets


class CryControlAssetsTest(unittest.TestCase):
    def test_cry_variant_has_its_own_original_recording(self):
        catalog = build_catalog()
        cry = catalog['characters']['0']['variants'].get('anonCry')
        self.assertIsNotNone(cry, 'new cry must not reuse the TGW or laugh recording')
        self.assertEqual(cry['voice'], 'meme_0_cry')
        self.assertEqual(cry['duration'], 1.8)
        self.assertEqual(cry['source']['bvid'], 'BV1WGS3YMEZz')
        self.assertIn('立石凛', cry['source']['proof'])
        self.assertNotEqual(cry['audio'], catalog['characters']['0']['slots']['p']['audio'])

    def test_runtime_packs_the_actual_reviewed_cry_bytes(self):
        packed = pack_meme_assets()
        voice = packed['memeVoices'].get('meme_0_cry')
        self.assertIsNotNone(voice)
        self.assertEqual(base64.b64decode(voice.split(',', 1)[1]), (ROOT / 'assets/meme-media/anon-cry-soyo-control/anon-cry.mp3').read_bytes())


if __name__ == '__main__':
    unittest.main()
