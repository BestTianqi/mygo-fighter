"""Create isolated, full-resolution WebP publishing assets (requires Pillow).

Run after regenerating frontend/public assets. Originals and frame coordinates
are preserved. Production builds verify hashes before using these derivatives.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib
import io
import json

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "frontend/public"
DEST = ROOT / "assets/optimized-web"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def references(value, key=""):
    if isinstance(value, dict):
        for name, child in value.items():
            yield from references(child, name)
    elif isinstance(value, list):
        for child in value:
            yield from references(child, key)
    elif isinstance(value, str) and value.endswith(".webp"):
        yield value, key


def optimize(item):
    url, quality = item
    source = (PUBLIC / url.lstrip("/")).read_bytes()
    with Image.open(io.BytesIO(source)) as original:
        image = original.convert("RGBA")
    # Quantize sub-visible alpha noise to 17 levels. Preserve exact fully clear
    # and opaque pixels; the maximum edge opacity error is 8/255.
    image.putalpha(image.getchannel("A").point(lambda a: min(255, round(a / 16) * 16)))
    buffer = io.BytesIO()
    image.save(buffer, "WEBP", quality=quality, method=4, alpha_quality=100)
    compressed = buffer.getvalue()
    if len(compressed) >= len(source):
        return None
    with Image.open(io.BytesIO(compressed)) as decoded:
        assert decoded.size == image.size
        assert decoded.convert("RGBA").getchannel("A").tobytes() == image.getchannel("A").tobytes()
    sha = digest(compressed)
    filename = sha[:20] + ".webp"
    (DEST / "media" / filename).write_bytes(compressed)
    print(f"{url}: {len(source):,} -> {len(compressed):,}", flush=True)
    return {"source": url, "output": "/media/" + filename,
            "sourceSha256": digest(source), "sha256": sha,
            "sourceBytes": len(source), "bytes": len(compressed),
            "width": image.width, "height": image.height, "quality": quality}


def main():
    manifest = json.loads((PUBLIC / "assets.json").read_text("utf8"))
    choices = {}
    for url, key in references(manifest):
        if url.startswith("/media/"):
            quality = 74 if key == "atlas" else 94
            choices[url] = min(quality, choices.get(url, quality))
    (DEST / "media").mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=4) as pool:
        entries = [row for row in pool.map(optimize, sorted(choices.items())) if row]
    result = {"version": 1, "entries": entries}
    (DEST / "manifest.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", "utf8")
    keep = {Path(row["output"]).name for row in entries}
    for file in (DEST / "media").glob("*.webp"):
        if file.name not in keep:
            file.unlink()
    saved = sum(row["sourceBytes"] - row["bytes"] for row in entries)
    print(f"Isolated {len(entries)} images; saved {saved:,} bytes. Full resolution; alpha error <= 8/255.")


if __name__ == "__main__":
    main()
