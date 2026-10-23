"""The five virtual outfits require 54 real, named drawings each."""
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
import build_mewtype_assets as packer


class MewTypeAssetsTest(unittest.TestCase):
    def groups(self):
        return [dict(file=f'mewtype/arale/virtual/group-{i + 1}-v1.png', columns=4 if i < 6 else 3,
                     rows=2, names=names[:]) for i, names in enumerate(packer.POSE_GROUPS)]

    def test_exactly_54_canonical_drawings_without_transformation_poses(self):
        self.assertEqual(len(packer.POSE_NAMES), 54)
        self.assertEqual([len(names) for names in packer.POSE_GROUPS], [8] * 6 + [6])
        self.assertFalse(any(name.startswith('transform-') for name in packer.POSE_NAMES))
        packer.validate_groups(self.groups())

    def test_last_sheet_must_have_three_columns_and_six_drawings(self):
        groups = self.groups()
        groups[-1]['columns'] = 4
        with self.assertRaisesRegex(ValueError, '3.*2'):
            packer.validate_groups(groups)
        groups = self.groups()
        groups[-1]['names'][-1] = 'idle'
        with self.assertRaisesRegex(ValueError, '54.*canonical'):
            packer.validate_groups(groups)

    def test_six_actual_figures_extract_from_the_last_sheet_without_substitution(self):
        source = Image.new('RGBA', (900, 500))
        for i in range(6):
            x, y = i % 3 * 300 + 80, i // 3 * 250 + 50
            source.paste((40 + i * 20, 100, 160, 255), (x, y, x + 90, y + 140))
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'six.png'
            source.save(path)
            pieces = packer.extract_group(path, self.groups()[-1])
        self.assertEqual([name for name, _, _ in pieces], packer.POSE_GROUPS[-1])
        self.assertTrue(all(sprite.size == (90, 140) for _, sprite, _ in pieces))

    def test_missing_manifest_never_creates_a_final_character(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(packer, 'ROOT', Path(directory)):
            with self.assertRaisesRegex(FileNotFoundError, 'manifest'):
                packer.source_groups('arale')

    def test_manifest_selected_versions_win_over_unreviewed_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            folder = root / 'assets/mewtype/arale'
            (folder / 'virtual').mkdir(parents=True)
            for filename in ['group-1-v1.png', 'group-1-v2.png', 'group-7-v2.png']:
                (folder / 'virtual' / filename).touch()
            manifest = dict(key='arale', id=10, name='仲町阿拉蕾', forms=dict(virtual=dict(groups=self.groups()[:1])))
            (folder / 'manifest.json').write_text(json.dumps(manifest), encoding='utf-8')
            with patch.object(packer, 'ROOT', root):
                groups = packer.source_groups('arale', partial=True)
            self.assertTrue(groups[0]['file'].endswith('group-1-v1.png'))
            self.assertTrue(groups[1]['file'].endswith('group-7-v2.png'))
            self.assertEqual((groups[1]['columns'], groups[1]['rows']), (3, 2))


if __name__ == '__main__':
    unittest.main()
