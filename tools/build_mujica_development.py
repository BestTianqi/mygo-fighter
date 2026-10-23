"""Build an isolated development game from real, complete two-form artwork.

Keeps index.html untouched. Existing media is decoded directly from that file;
unfinished Mujica characters remain visible in the lineup but cannot fight.
Usage: python tools/build_mujica_development.py [--require-character sakiko]
"""
import argparse
import json

from PIL import Image

from build import data_url, render_page
from build_mujica_assets import DISPLAY_NAMES, KEYS, ROOT, extract_group, pack_form, source_groups


def parse_legacy_assets(html):
    marker = 'window.MYGO_ASSETS='
    start = html.index(marker) + len(marker)
    assets, _ = json.JSONDecoder().raw_decode(html[start:])
    if len(assets.get('characters', [])) < 5:
        raise ValueError('the original offline game must contain all five legacy characters')
    return assets


def development_page(html, available):
    for identifier in range(5, 10):
        if identifier not in available:
            html = html.replace(f'<option value="{identifier}">', f'<option value="{identifier}" disabled>')
    guard = 'if (!loaded || starting) return;'
    if html.count(guard) != 1:
        raise ValueError('development match gate no longer matches app.js; inspect before publishing the development page')
    html = html.replace(guard, 'if (!loaded || starting || selectedCharacters().some(id => id >= 5 && !' + json.dumps(available) + '.includes(id))) return;')
    return html


def complete_characters():
    available = []
    for key, identifier in KEYS:
        try:
            for form in ('normal', 'stage'):
                groups = source_groups(key, form)
                if not all((ROOT / 'assets' / group['file']).is_file() for group in groups):
                    raise ValueError('source sheets still pending')
        except (ValueError, FileNotFoundError, KeyError):
            continue
        available.append((key, identifier))
    return available


def build(required_character='sakiko'):
    assets = parse_legacy_assets((ROOT / 'index.html').read_text(encoding='utf-8'))
    assets['characters'] = assets['characters'][:5]
    # Menu portraits must also be actual drawings for all five people. No old
    # character or alternate form can substitute for a missing person's art.
    for key, identifier in KEYS:
        groups = source_groups(key, 'normal', partial=True)
        idle_group = next((group for group in groups if group['names'][0] == 'idle'), None)
        if idle_group is None:
            raise ValueError(f'{key}: first normal sheet is required for the five-person development menu')
        idle = extract_group(ROOT / 'assets' / idle_group['file'], idle_group)[0][1]
        idle.thumbnail((380, 520), Image.Resampling.LANCZOS)
        assets['characters'].append(dict(id=identifier, key=key, portrait=data_url(idle, lossless=True)))
    complete = complete_characters()
    if required_character not in [key for key, _ in complete]:
        raise ValueError(f'{required_character}: both reviewed 56-frame forms are required before building the development game')
    assets['mujicaForms'] = {identifier: {form: pack_form(key, form) for form in ('normal', 'stage')}
                             for key, identifier in complete}
    html = development_page(render_page(assets), [identifier for _, identifier in complete])
    names = '、'.join(DISPLAY_NAMES[key] for key, _ in complete)
    notice = '<span id="development-notice" role="status" title="可用新角色：' + names + '（双形态完整）；其余角色制作中。正式游戏入口未覆盖。" style="position:absolute;top:8px;right:12px;z-index:2;pointer-events:none;color:#f0c8d5;font-size:10px">开发预览 · ' + names + '</span>'
    html = html.replace('<div class="menu-content">', notice + '<div class="menu-content">', 1)
    html = html.replace('<title>MyGO!!!!! 格斗</title>', '<title>Ave Mujica · 开发预览</title>')
    target = ROOT / 'mujica-development.html'
    target.write_text(html, encoding='utf-8')
    print(f'Built {target.name}: {len(html.encode("utf-8")):,} bytes; complete new characters: {names}; index.html untouched', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--require-character', choices=[key for key, _ in KEYS], default='sakiko')
    build(parser.parse_args().require_character)
