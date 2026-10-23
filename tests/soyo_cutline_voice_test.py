import base64
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from build_meme_assets import build_catalog, pack_meme_assets


class SoyoCutlineVoiceTest(unittest.TestCase):
    def test_cutline_uses_the_clothes_scene_instead_of_the_base_I_voice(self):
        soyo = build_catalog()['characters']['1']
        clip = soyo['variants'].get('soyoCutline')
        self.assertIsNotNone(clip, 'cutline needs its own recording of the cut clothes scene')
        self.assertEqual(clip['voice'], 'meme_1_cutline')
        self.assertEqual(clip['source']['bvid'], 'BV19p4y1K7Lz')
        self.assertEqual(clip['source']['cid'], 1245707311)
        self.assertIn('衣服', clip['label'])
        self.assertNotEqual(clip['audio'], soyo['slots']['i']['audio'])
        self.assertAlmostEqual(clip['duration'], 3.55)

    def test_recording_bytes_are_packed_and_delivered_offline(self):
        packed = pack_meme_assets()
        soyo = packed['memeSkills']['1']
        clip = soyo['variants'].get('soyoCutline')
        self.assertIsNotNone(clip)
        voice = packed['memeVoices'][clip['voice']]
        path = ROOT / 'assets/meme-media/soyo-cutline/soyo-cutline.mp3'
        self.assertEqual(base64.b64decode(voice.split(',', 1)[1]), path.read_bytes())
        html = (ROOT / 'index.html').read_text(encoding='utf-8')
        assets, _ = json.JSONDecoder().raw_decode(html.split('window.MYGO_ASSETS=', 1)[1])
        self.assertEqual(assets['memeSkills']['1']['variants'].get('soyoCutline'), clip)
        self.assertTrue(assets['memeVoices'].get(clip['voice']) == voice, 'outdated offline cutline recording')


if __name__ == '__main__':
    unittest.main()
