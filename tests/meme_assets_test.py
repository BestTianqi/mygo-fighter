"""Recorded media coverage and component-aware Uika crawl extraction."""
import base64
import hashlib
import importlib.util
import io
import json
import unittest
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


class MemeAssetsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        module_path = ROOT / 'tools/build_meme_assets.py'
        assert module_path.is_file(), 'the recorded meme asset packer is missing'
        spec = importlib.util.spec_from_file_location('build_meme_assets', module_path)
        cls.module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.module)
        cls.packed = cls.module.pack_meme_assets()
        cls.catalog = json.loads((ROOT / 'assets/meme-media/manifest.json').read_text(encoding='utf-8'))

    def test_all_fifteen_characters_have_real_uio_and_video_supers(self):
        self.assertEqual(set(self.packed['memeSkills']), {str(i) for i in range(15)})
        for identifier, profile in self.packed['memeSkills'].items():
            with self.subTest(character=identifier):
                self.assertTrue({'u', 'i', 'o', 'p'} <= profile['slots'].keys())
                for slot in 'uiop':
                    entry = profile['slots'][slot]
                    self.assertTrue(entry['voice'])
                    self.assertTrue(entry['label'])
                    source = self.catalog['characters'][identifier]['slots'][slot]
                    for field in ('audio', 'video') if slot == 'p' else ('audio',):
                        path = ROOT / source[field]
                        self.assertTrue(path.is_file(), path)
                        self.assertGreater(path.stat().st_size, 500)
                    self.assertTrue(source['source']['url'].startswith('https://'))
                    self.assertTrue(source['source']['bvid'].startswith('BV'))
                    self.assertTrue(source['source']['uploader'])
                    self.assertEqual(source['source']['page'], 1)
                    self.assertGreater(source['source']['end'], source['source']['start'])
                super_entry = profile['slots']['p']
                self.assertGreater(super_entry['duration'], 0)
                if identifier == '1':
                    self.assertEqual(super_entry['voice'], 'soyoSuper')
                    self.assertEqual(super_entry['videoRef'], 'soyoSuperVideo')
                    self.assertNotIn('soyoSuper', self.packed['memeVoices'])
                else:
                    self.assertTrue(super_entry['video'].startswith('data:video/mp4;base64,'))

    def test_all_super_videos_and_audio_remain_at_original_speed(self):
        for profile in self.catalog['characters'].values():
            for clip in [*profile['slots'].values(), *profile['variants'].values()]:
                if clip['slot'] != 'p':
                    continue
                self.assertNotIn('tempo', clip)
                self.assertEqual(clip['videoRate'], 1)
                expected_duration = 2.8 if clip['voice'] == 'soyoSuper' else clip['source']['end']-clip['source']['start']
                self.assertAlmostEqual(clip['duration'], expected_duration, places=3)
                voices = self.packed['soyoVoices'] if clip['voice'] == 'soyoSuper' else self.packed['memeVoices']
                self.assertEqual(base64.b64decode(voices[clip['voice']].split(',', 1)[1]), (ROOT / clip['audio']).read_bytes())

    def test_required_quotes_and_distinct_character_recordings(self):
        profiles = self.packed['memeSkills']
        for identifier, phrase in [('10', 'U咩哇帕瓦'), ('11', '杂鱼优等生'), ('12', '临兵斗者皆阵列在前')]:
            self.assertIn(phrase, profiles[identifier]['slots']['p']['label'])
        character_hashes = []
        for identifier in map(str, range(15)):
            hashes = set()
            for slot in 'uio':
                clip = self.catalog['characters'][identifier]['slots'][slot]
                hashes.add(hashlib.sha256((ROOT / clip['audio']).read_bytes()).hexdigest())
                voice = profiles[identifier]['slots'][slot]['voice']
                self.assertTrue(self.packed['memeVoices'][voice].startswith('data:audio/mpeg;base64,'))
            self.assertGreaterEqual(len(hashes), 2, identifier)
            character_hashes.append(hashes)
        for i, hashes in enumerate(character_hashes):
            for other in character_hashes[:i]:
                self.assertFalse(hashes & other, 'different characters must not share a substituted voice')

    def test_penguin_and_boost_variants_use_their_own_existing_recordings(self):
        native = self.packed['memeSkills']['2']
        self.assertTrue(native['slots']['u']['voice'].startswith('meme_2_'))
        self.assertEqual(native['variants']['penguinCry']['voice'], 'penguinCry')
        self.assertTrue(native['variants']['penguinSuper']['video'].startswith('data:video/mp4;base64,'))
        for voice in ('penguinCry', 'penguinHey', 'penguinCall', 'penguinKick', 'penguinLaugh'):
            self.assertNotIn(voice, self.packed['memeVoices'])
        riki = self.packed['memeSkills']['4']
        for move, slot in [('rikiRollBoost', 'u'), ('rikiRushBoost', 'u'), ('rikiOverheadBoost', 'u'), ('rikiShockBoost', 'i'), ('rikiShockExtra', 'i'), ('rikiRiseBoost', 'i')]:
            self.assertEqual(riki['variants'][move]['voice'], riki['slots'][slot]['voice'])
        for identifier in map(str, range(5, 10)):
            self.assertEqual(self.packed['memeSkills'][identifier]['slots']['h']['voice'], self.packed['memeSkills'][identifier]['slots']['i']['voice'])

    def test_mortis_stage_skill_voices_are_owned_recordings_and_preserve_normal_form(self):
        profile = self.packed['memeSkills']['8']
        clips = self.catalog['characters']['8']
        for slot in 'uio':
            stage = profile['variants']['mujica_8_stage_' + slot]
            self.assertEqual(stage['voice'], 'meme_8_stage_' + slot)
            self.assertNotEqual(stage['voice'], profile['slots'][slot]['voice'])
            self.assertTrue(profile['slots'][slot]['voice'].startswith('meme_8_'))
        self.assertEqual(profile['variants']['stage_mujicaTransform']['voice'], 'meme_8_stage_h')
        self.assertEqual(profile['variants']['stage_throw']['voice'], 'meme_8_stage_o')
        for row in json.loads((ROOT/'assets/meme-media/mortis-stage-voices/sources.json').read_text('utf-8'))['clips']:
            self.assertEqual(hashlib.sha256((ROOT/row['audio']).read_bytes()).hexdigest(), row['sha256'])
            self.assertEqual(base64.b64decode(self.packed['memeVoices'][row['voice']].split(',',1)[1]), (ROOT/row['audio']).read_bytes())
        self.assertEqual(profile['variants']['mujica_8_stage_toddler']['voice'], 'meme_8_toddler')
        self.assertEqual(profile['variants']['mujica_8_stage_burger']['voice'], 'meme_8_burger')
        self.assertEqual(profile['variants']['mujica_8_stage_super']['videoRate'], 1)

    def test_crawl_has_four_complete_distinct_poses_in_each_outfit(self):
        forms = self.packed['memeCrawlForms']
        self.assertEqual(set(forms), {'normal', 'stage'})
        outfit_hashes = []
        for outfit, packed in forms.items():
            image = Image.open(io.BytesIO(base64.b64decode(packed['atlas'].split(',', 1)[1]))).convert('RGBA')
            self.assertEqual([f['name'] for f in packed['frames']], ['crawl-windup', 'crawl-a', 'crawl-b', 'crawl-recover'])
            hashes = set()
            for frame in packed['frames']:
                self.assertGreaterEqual(frame['height'], 130)
                self.assertLessEqual(frame['height'], 160)
                piece = image.crop((frame['x'], frame['y'], frame['x'] + frame['w'], frame['y'] + frame['h']))
                self.assertIsNotNone(piece.getbbox())
                self.assertGreater(sum(a > 100 for a in piece.getchannel('A').getdata()), 10000)
                hashes.add(hashlib.sha256(piece.tobytes()).hexdigest())
                if frame['name'] in ('crawl-a', 'crawl-b'):
                    world_width = frame['w'] / frame['h'] * frame['height']
                    self.assertGreaterEqual(world_width, 220)
                    self.assertLessEqual(world_width, 270)
            self.assertEqual(len(hashes), 4)
            outfit_hashes.append(hashes)
        self.assertFalse(outfit_hashes[0] & outfit_hashes[1])


if __name__ == '__main__':
    unittest.main()
