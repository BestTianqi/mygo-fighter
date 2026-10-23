"""Publish the reviewed offline game as a cacheable static GitHub Pages site."""
import base64
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def build(output=None):
    output = Path(output or ROOT / '_site')
    media = output / 'media'
    media.mkdir(parents=True, exist_ok=True)
    html = (ROOT / 'index.html').read_text('utf-8')
    if html.startswith('version https://git-lfs.github.com'):
        raise RuntimeError('Download the complete game first: git lfs pull')
    marker = 'window.MYGO_ASSETS='
    start = html.index(marker)
    assets, length = json.JSONDecoder().raw_decode(html[start + len(marker):])
    files = set()
    extensions = {'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg',
                  'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'video/mp4': 'mp4'}

    def externalize(value):
        if isinstance(value, dict):
            return {key: externalize(item) for key, item in value.items()}
        if isinstance(value, list):
            return [externalize(item) for item in value]
        if isinstance(value, str) and value.startswith('data:') and ';base64,' in value:
            header, encoded = value.split(',', 1)
            extension = extensions[header[5:].split(';')[0]]
            data = base64.b64decode(encoded, validate=True)
            name = hashlib.sha256(data).hexdigest() + '.' + extension
            if name not in files:
                (media / name).write_bytes(data)
                files.add(name)
            return 'media/' + name
        return value

    assets = externalize(assets)
    end = start + len(marker) + length
    html = html[:start] + 'window.MYGO_HOSTED=true;' + html[end + 1:]
    html = html.replace('<script>window.MYGO_HOSTED=true;</script>', '<script src="assets.js"></script>')
    # Pages is static hosting; its menu must not call the LAN server's /api endpoints.
    hosted = '''
const lanButton=document.getElementById('menu-lan');
lanButton.removeAttribute('data-menu-ready');lanButton.disabled=true;
lanButton.title='局域网联机请下载游戏并运行启动文件';
lanButton.textContent='局域网联机 · 需本地启动';
'''
    (output / 'assets.js').write_text('window.MYGO_HOSTED=true;window.MYGO_ASSETS=' + json.dumps(assets, ensure_ascii=False, separators=(',', ':')) + ';' + hosted, 'utf-8')
    (output / 'index.html').write_text(html, 'utf-8')
    (output / '.nojekyll').touch()
    print(f'Pages: {len(files)} deduplicated media files; HTML {len(html.encode()):,} bytes; total {sum(p.stat().st_size for p in output.rglob("*") if p.is_file()):,} bytes')
    return output


if __name__ == '__main__':
    build()
