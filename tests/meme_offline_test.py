"""The delivered HTML must contain the reviewed media and current runtime."""
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from build_meme_assets import pack_meme_assets


class MemeOfflineTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / 'index.html').read_text(encoding='utf-8')
        cls.assets, _ = json.JSONDecoder().raw_decode(cls.html.split('window.MYGO_ASSETS=', 1)[1])

    def test_embedded_recordings_movies_and_crawl_match_the_reviewed_files(self):
        for key, expected in pack_meme_assets().items():
            # Avoid dumping a 110 MB document if a stale deliverable is found.
            self.assertTrue(self.assets.get(key) == expected, f'Outdated embedded {key}')
        self.assertEqual(len(self.assets['memeSkills']), 15)
        self.assertEqual(len(self.assets['memeVoices']), 71)

    def test_latest_playback_and_combat_code_is_embedded(self):
        for name in ['meme-media.js', 'voice.js', 'controls.js', 'engine.js', 'animation.js', 'selection.js', 'app.js', 'style.css']:
            self.assertTrue((ROOT / 'src' / name).read_text(encoding='utf-8') in self.html, f'Outdated embedded {name}')
        self.assertNotRegex(self.html, r'/\*__[A-Z_]+__\*/')


if __name__ == '__main__':
    unittest.main()
