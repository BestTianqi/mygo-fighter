"""Export reviewed original-game voice clips for the unregistered Poppin'Party pack."""
import argparse
import json
import subprocess
from pathlib import Path

import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "assets/poppinparty/voices"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, default=ROOT / "output/poppinparty")
    args = parser.parse_args()
    manifest = json.loads((DEST / "sources.json").read_text(encoding="utf-8"))
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    for clip in manifest["clips"]:
        source = args.source_dir / (clip["bvid"] + ".mp4")
        if not source.is_file():
            raise FileNotFoundError(f"Missing reviewed source: {source}")
        duration = clip["endSeconds"] - clip["startSeconds"]
        target = DEST / clip["file"]
        subprocess.run([
            ffmpeg, "-v", "error", "-y", "-ss", str(clip["startSeconds"]),
            "-i", str(source), "-t", str(duration), "-vn", "-ac", "1", "-ar", "44100",
            "-af", f"loudnorm=I=-18:TP=-1.5:LRA=9,afade=t=in:d=0.008,afade=t=out:st={duration - .02}:d=0.02",
            "-codec:a", "libmp3lame", "-b:a", "80k", "-map_metadata", "-1", str(target),
        ], check=True)
    print(f"Exported {len(manifest['clips'])} original-speed voice clips to {DEST}")


if __name__ == "__main__":
    main()
