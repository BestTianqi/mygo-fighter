"""The revised voices must be original recordings and present offline."""
import base64
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from build_meme_assets import build_catalog, pack_meme_assets


class SummonRevisionAssetsTest(unittest.TestCase):
    def test_anon_uses_her_own_anime_laugh_and_matching_video(self):
        entry = build_catalog()['characters']['0']['slots']['p']
        self.assertEqual(entry['label'], '千早爱音唐笑')
        self.assertNotEqual(entry['source']['bvid'], 'BV1z3YCecE21')
        self.assertEqual(Path(entry['audio']).name, 'anon-original-laugh.mp3')
        self.assertEqual(Path(entry['video']).name, 'anon-original-laugh.mp4')
        self.assertLessEqual(entry['duration'], 2.6)

    def test_original_ohyeah_is_in_a_separate_summon_voice_bank(self):
        packed = pack_meme_assets()
        value = packed.get('summonVoices', {}).get('tensoraOhYeah')
        self.assertIsNotNone(value, 'summon recording must be embedded separately from the owner voice')
        original = ROOT / 'assets/meme-media/revision-anon-tensora/tensora-ohyeah.mp3'
        self.assertEqual(base64.b64decode(value.split(',', 1)[1]), original.read_bytes())
        source = build_catalog()['summonCall']
        self.assertEqual(source['source']['bvid'], 'BV1WA9kBfEbx')
        self.assertEqual(source['duration'], .97)

    def test_delivered_html_excludes_the_superseded_taffy_recording(self):
        html = (ROOT / 'index.html').read_text(encoding='utf-8')
        for name in ['anon-p.mp3', 'anon-p.mp4']:
            old = ROOT / 'assets/meme-media/recordings' / name
            self.assertFalse(base64.b64encode(old.read_bytes()).decode() in html, f'Superseded Taffy {name} is still embedded')


if __name__ == '__main__':
    unittest.main()
