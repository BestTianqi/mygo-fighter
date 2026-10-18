"""Cut the five original video sounds. Usage: python tools/extract_penguin_voices.py SOURCE.mp4

Requires imageio-ffmpeg, used only when regenerating the audio assets.
"""
import argparse
import json
import subprocess
from pathlib import Path
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source', type=Path)
args = parser.parse_args()
folder = ROOT / 'assets/audio'
manifest = json.loads((folder / 'penguin-voices.json').read_text(encoding='utf-8'))
for clip in manifest['clips']:
    duration = clip['end'] - clip['start']
    filters = f'loudnorm=I=-18:TP=-3:LRA=7,afade=t=in:d=0.012,afade=t=out:st={duration-.04:.3f}:d=0.04'
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-hide_banner', '-loglevel', 'error', '-y',
        '-ss', str(clip['start']), '-i', str(args.source.resolve()), '-t', str(duration),
        '-vn', '-af', filters, '-ar', '44100', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k',
        str(folder / clip['file'])], check=True)
    print(f"{clip['move']}: {duration:.2f}s -> {clip['file']}")
