"""Export silent finish backgrounds from the same reviewed segments as the voices."""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]


def build(source_dir):
    folder = ROOT / 'assets/finish-art/v2'
    voices = json.loads((folder / 'sources-voices.json').read_text(encoding='utf-8-sig'))
    destination = folder / 'videos'
    destination.mkdir(parents=True, exist_ok=True)
    clips = []
    for voice in voices:
        source = source_dir / (voice['bvid'] + '.mp4')
        output = destination / (voice['characterName'] + '.mp4')
        duration = voice['sourceEnd'] - voice['sourceStart']
        # Match any silence padded onto the reviewed audio by holding its final frame.
        padding = max(0, voice['duration'] - duration)
        filters = ('scale=640:360:force_original_aspect_ratio=decrease,'
                   'pad=640:360:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24,'
                   f'tpad=stop_mode=clone:stop_duration={padding:.3f}')
        subprocess.run([
            imageio_ffmpeg.get_ffmpeg_exe(), '-v', 'error', '-y',
            '-ss', str(voice['sourceStart']), '-t', str(duration), '-i', str(source),
            '-an', '-vf', filters, '-t', str(voice['duration']),
            '-c:v', 'libx264', '-preset', 'medium', '-crf', '28',
            '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(output),
        ], check=True)
        clips.append({
            'character': voice['character'], 'voice': voice['key'],
            'sourceUrl': voice['sourceUrl'], 'sourceStart': voice['sourceStart'],
            'sourceEnd': voice['sourceEnd'], 'durationMs': round(voice['duration'] * 1000),
            'output': output.relative_to(ROOT).as_posix(), 'bytes': output.stat().st_size,
            'sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
            'processing': 'Original speed, no audio track; 640x360 H.264, 24 fps. '
                          'Any padded voice silence holds the final video frame. Blur is applied at runtime.',
        })
    (folder / 'sources-videos.json').write_text(
        json.dumps(clips, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f"Exported {len(clips)} silent finish videos, {sum(c['bytes'] for c in clips)} bytes")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path, default=ROOT / 'output/finish-art-v2/voices')
    build(parser.parse_args().source_dir)
