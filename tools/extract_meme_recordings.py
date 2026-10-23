"""Regenerate reviewed excerpts from downloaded originals and their source JSON.

python tools/extract_meme_recordings.py SOURCE_DIRECTORY
The source directory is not needed to play or build the offline game.
"""
import argparse
import json
import subprocess
from pathlib import Path
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
CUTS = [
    ('anon', 'p', 'anon', .15, 2.65, '爱音唐笑（塔菲版）'),
    ('sakiko', 'p', 'sakiko', 33.1, 39.3, '我来成为神明'),
    ('sakiko', 'u', 'sakiko', 40.2, 42.25, '为了Ave Mujica'),
    ('sakiko', 'i', 'sakiko', 42.25, 44.25, '什么都可以利用'),
    ('sakiko', 'o', 'sakiko', 76.1, 78., '没有那个必要'),
    ('uika', 'p', 'uika-anime', 50.2, 54.9, 'Saki酱！Saki酱！'),
    ('uika', 'u', 'uika-anime', 46.5, 49.9, '想见Saki酱'),
    ('uika', 'i', 'uika-anime', 41.6, 44.5, '不是不是不是'),
    ('uika', 'o', 'uika-anime', 28.15, 29., '不是的'),
    ('arale', 'p', 'arale-meme', 0., 2.85, 'U咩哇帕瓦'),
    ('arale', 'u', 'arale-meme', 0., 1.45, '梦想即力量'),
    ('arale', 'i', 'arale-meme', 1.45, 2.9, 'U咩哇帕瓦'),
    ('arale', 'o', 'arale-meme', 3., 4.45, '梦想即力量'),
    ('miyako', 'p', 'miyako-anime', .1, 11.4, '临兵斗者皆阵列在前'),
    ('miyako', 'u', 'miyako-anime', .1, 2.8, '临兵斗者'),
    ('miyako', 'i', 'miyako-anime', 3.2, 5.5, '皆阵列在'),
    ('miyako', 'o', 'miyako-anime', 9., 11.4, '前！'),
    ('tomori', 'p', 'tomori', .25, 7.35, '一辈子乐队'),
    ('rana', 'p', 'rana', 34.85, 37., '有趣的女人'),
    ('nyamu', 'p', 'nyamu', .35, 3.75, '完美笑容'),
    ('nyamu', 'u', 'nyamu', .35, 1.75, '请看清楚'),
    ('nyamu', 'i', 'nyamu', 13.95, 16.65, '要发自内心笑'),
    ('nyamu', 'o', 'nyamu', 30.55, 32.35, '呐，Mortis'),
    ('mutsumi', 'p', 'mutsumi', 7.1, 15.2, '从来没觉得玩乐队开心过'),
    ('mutsumi', 'u', 'mutsumi', 7.1, 8.45, '我…'),
    ('mutsumi', 'i', 'mutsumi', 10.4, 13.15, '觉得开心'),
    ('mutsumi', 'o', 'mutsumi', 13.9, 15.2, '从来没有'),
]


def extract(source_dir):
    dest = ROOT / 'assets/meme-media/recordings'
    dest.mkdir(parents=True, exist_ok=True)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    records = []
    for key, slot, source, start, end, label in CUTS:
        filename = f'{key}-{slot}'
        audio = dest / f'{filename}.mp3'
        duration = end - start
        original = source_dir / f'{source}-source.mp4'
        metadata = json.loads((source_dir / f'{source}-source.json').read_text(encoding='utf-8'))
        if not 0 <= start < end <= metadata['duration']:
            raise ValueError(f'Invalid reviewed excerpt: {filename}')
        subprocess.run([ffmpeg, '-v', 'error', '-y', '-ss', str(start), '-i', str(original),
                        '-t', str(duration), '-vn', '-af',
                        f'loudnorm=I=-18:TP=-3:LRA=7,afade=t=in:d=0.012,afade=t=out:st={duration-.025:.3f}:d=0.025',
                        '-ar', '44100', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', str(audio)], check=True)
        record = {**metadata, 'character': key, 'slot': slot, 'label': label, 'start': start, 'end': end,
                  'duration': round(duration, 3), 'audio': audio.relative_to(ROOT / 'assets').as_posix(),
                  'speakerVerification': '原片画面、口型/字幕与上下文核对；ASR只辅助定位'}
        if slot == 'p':
            video = dest / f'{filename}.mp4'
            subprocess.run([ffmpeg, '-v', 'error', '-y', '-ss', str(start), '-i', str(original),
                            '-t', str(duration), '-an', '-vf',
                            'scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2',
                            '-r', '24', '-c:v', 'libx264', '-preset', 'slow', '-crf', '27',
                            '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(video)], check=True)
            record['video'] = video.relative_to(ROOT / 'assets').as_posix()
        records.append(record)
        print(filename, record['duration'], flush=True)
    (dest / 'sources-recordings.json').write_text(json.dumps({'clips': records}, ensure_ascii=False, indent=2), encoding='utf-8')
    return records


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source_directory', type=Path)
    args = parser.parse_args()
    extract(args.source_directory.resolve())
