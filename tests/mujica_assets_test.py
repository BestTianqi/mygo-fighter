"""Packing invariants for named Ave Mujica action drawings."""
import base64
import io
import json
import sys
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from build_mujica_assets import POSE_GROUPS, POSE_NAMES, extract_group, pack_pieces, validate_groups
import build_mujica_assets as packer


class MujicaAssetsTest(unittest.TestCase):
    def test_canonical_names_reject_missing_or_repeated_drawings(self):
        groups = [dict(file=f'g{i}.png', columns=4, rows=2, names=names[:])
                  for i, names in enumerate(POSE_GROUPS)]
        validate_groups(groups)
        groups[-1]['names'][-1] = 'idle'
        with self.assertRaisesRegex(ValueError, 'canonical'):
            validate_groups(groups)

    def test_grid_dimensions_are_explicit(self):
        groups = [dict(file=f'g{i}.png', columns=4, rows=2, names=names[:])
                  for i, names in enumerate(POSE_GROUPS)]
        groups[0]['columns'] = 2
        with self.assertRaisesRegex(ValueError, '4.*2'):
            validate_groups(groups)

    def test_runtime_preserves_world_geometry_and_transparent_gutters(self):
        standing = Image.new('RGBA', (300, 1000), (201, 110, 145, 255))
        crouch = Image.new('RGBA', (700, 600), (96, 142, 103, 255))
        result = pack_pieces([('idle', standing, 130), ('guard-crouch', crouch, 250)])
        atlas = Image.open(io.BytesIO(base64.b64decode(result['atlas'].split(',')[1])))
        for f, source, anchor, height in zip(result['frames'], [standing, crouch], [130, 250], [235, 155]):
            self.assertAlmostEqual(f['ax'] / f['w'], anchor / source.width, delta=.0001)
            self.assertEqual(f['ay'], f['h'])
            self.assertEqual(f['height'], height)
            self.assertLessEqual(f['h'], height * 2)
            self.assertEqual(atlas.getpixel((f['x'] - 2, f['y']))[3], 0)
        self.assertLess(atlas.width, 2 * (max(f['w'] for f in result['frames']) + 12))

    def test_ground_anchor_is_center_and_small_images_are_not_upscaled(self):
        result = pack_pieces([('knockdown-ground', Image.new('RGBA', (120, 40), 'red'), 3)])
        f = result['frames'][0]
        self.assertEqual((f['w'], f['h'], f['ax'], f['ay'], f['height']), (120, 40, 60, 40, 75))

    def test_duplicate_actual_pixels_cannot_supply_distinct_pose_names(self):
        image = Image.new('RGBA', (20, 40), 'red')
        with self.assertRaisesRegex(ValueError, 'duplicate drawing'):
            pack_pieces([(POSE_NAMES[0], image, 10), (POSE_NAMES[1], image.copy(), 10)])

    def test_connected_drawings_crossing_cell_boundaries_are_not_cropped(self):
        source = Image.new('RGBA', (1000, 600))
        for i in range(8):
            x, y = i % 4 * 250 + 180, i // 4 * 300 + 30
            source.paste((30 + i, 80, 120, 255), (x, y, x + 80, y + 100))
        # Last column stays inside the source; other figures cross grid lines.
        source.paste((0, 0, 0, 0), (980, 0, 1000, 600))
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'sheet.png'
            source.save(path)
            pieces = extract_group(path, dict(columns=4, rows=2, names=POSE_GROUPS[0]))
        self.assertEqual(len(pieces), 8)
        self.assertEqual(pieces[0][1].size, (80, 100))

    def test_source_edge_crop_is_rejected_in_final_mode(self):
        source = Image.new('RGBA', (1000, 600))
        source.paste('red', (0, 20, 50, 120))
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'sheet.png'
            source.save(path)
            with self.assertRaisesRegex(ValueError, 'source edge'):
                extract_group(path, dict(columns=4, rows=2, names=POSE_GROUPS[0]))

    def test_runtime_encoding_keeps_alpha_exact(self):
        source = Image.new('RGBA', (80, 160))
        source.putdata([(40 + x, 80, 120, (x + y) % 256) for y in range(160) for x in range(80)])
        result = pack_pieces([('idle', source, 40)])
        f = result['frames'][0]
        atlas = Image.open(io.BytesIO(base64.b64decode(result['atlas'].split(',')[1]))).convert('RGBA')
        crop = atlas.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']))
        self.assertEqual(crop.getchannel('A').tobytes(), source.getchannel('A').tobytes())

    def test_partial_preview_discovers_new_groups_but_respects_reviewed_versions(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            folder = root / 'assets/mujica/umiri'
            (folder / 'normal').mkdir(parents=True)
            for name in ('group-1-v1.png', 'group-1-v2.png', 'group-2-v2.png'):
                (folder / 'normal' / name).touch()
            group = dict(file='mujica/umiri/normal/group-1-v1.png', columns=4, rows=2, names=POSE_GROUPS[0])
            (folder / 'manifest.json').write_text(json.dumps(dict(key='umiri', id=5, forms=dict(normal=dict(groups=[group])))))
            with patch.object(packer, 'ROOT', root):
                groups = packer.source_groups('umiri', 'normal', partial=True)
            self.assertEqual([g['file'] for g in groups], ['mujica/umiri/normal/group-1-v1.png', 'mujica/umiri/normal/group-2-v2.png'])


if __name__ == '__main__':
    unittest.main()
