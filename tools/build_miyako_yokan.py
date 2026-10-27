"""Export Miyako's reviewed giant-yokan line and install only this skill's media."""
import argparse
import base64
import hashlib
import json
import subprocess
from pathlib import Path

from build import ROOT, export_assets
from build_meme_assets import build_catalog

FOLDER = ROOT / 'assets/meme-media/miyako-yokan'


def build(source_video=None):
    source = json.loads((FOLDER / 'sources.json').read_text(encoding='utf-8'))
    row = source['clips'][0]
    audio = FOLDER / row['audio']
    if source_video:
        import imageio_ffmpeg
        duration = row['end'] - row['start']
        subprocess.run([
            imageio_ffmpeg.get_ffmpeg_exe(), '-v', 'error', '-y',
            '-ss', str(row['start']), '-i', str(source_video), '-t', str(duration),
            '-vn', '-af', f'loudnorm=I=-18:TP=-2:LRA=7,afade=t=in:d=0.008,afade=t=out:st={duration-0.02}:d=0.02',
            '-ar', '44100', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', str(audio),
        ], check=True)
    payload = audio.read_bytes()
    row['sha256'] = hashlib.sha256(payload).hexdigest()
    (FOLDER / 'sources.json').write_text(json.dumps(source, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    catalog = build_catalog()
    clip = catalog['characters']['12']['variants'][row['move']]
    assets = json.loads((ROOT / 'frontend/public/assets.json').read_text(encoding='utf-8'))
    assets['memeSkills']['12']['variants'][row['move']] = {
        'voice': clip['voice'], 'label': clip['label'], 'duration': clip['duration'],
    }
    assets['memeVoices'][clip['voice']] = 'data:audio/mpeg;base64,' + base64.b64encode(payload).decode()
    export_assets(assets)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-video', type=Path)
    build(parser.parse_args().source_video)
