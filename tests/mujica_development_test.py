"""The development build reuses real legacy media and gates unfinished art."""
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from build_mujica_development import development_page, parse_legacy_assets


class MujicaDevelopmentTest(unittest.TestCase):
    def test_legacy_decoder_stops_after_json_without_changing_media_strings(self):
        assets = dict(characters=[dict(atlas='data:image/webp;base64,a;b') for _ in range(5)], soyoSuperVideo='data:video/mp4;base64,ABC')
        html = '<script>window.MYGO_ASSETS=' + json.dumps(assets) + ';</script><script>other();</script>'
        self.assertEqual(parse_legacy_assets(html), assets)

    def test_incomplete_characters_are_disabled_and_cannot_start_a_match(self):
        html = '<select>' + ''.join(f'<option value="{i}">角色{i}</option>' for i in range(10)) + '</select><script>async function start(){if (!loaded || starting) return;}</script>'
        result = development_page(html, [6])
        for identifier in [5, 7, 8, 9]:
            self.assertIn(f'<option value="{identifier}" disabled>', result)
        self.assertIn('<option value="6">', result)
        self.assertIn('<option value="0">', result)
        self.assertIn('selectedCharacters().some(id => id >= 5 && ![6].includes(id))', result)


if __name__ == '__main__':
    unittest.main()
