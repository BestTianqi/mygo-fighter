"""Render the current source map layers in Chromium, without rebuilding the game.

Checks all shipped scenes, reduced-motion stability and unchanged solid geometry.
"""
import io
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'tests/artifacts'
sys.path.insert(0, str(ROOT / 'tools'))
from build_stage_assets import pack_stages

source = (ROOT / 'src/app.js').read_text(encoding='utf-8')
draw_source = source[source.index('  function drawStageAtmosphere('):source.index('  function fighterSprite(')]
report = {'scenes': [], 'errors': [], 'remote_requests': []}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel='msedge')
    page = browser.new_page(viewport={'width': 960, 'height': 540})
    page.on('pageerror', lambda error: report['errors'].append(str(error)))
    page.on('request', lambda request: report['remote_requests'].append(request.url) if request.url.startswith('http') else None)
    page.set_content('<style>body{margin:0;background:#101622}</style><canvas width="960" height="540"></canvas>')
    for module in ['controls', 'mujica', 'mewtype', 'engine']:
        page.add_script_tag(content=(ROOT / f'src/{module}.js').read_text(encoding='utf-8'))
    page.evaluate('assets => window.stageTestAssets = assets', pack_stages())
    page.evaluate('''async source => {
      // Keep the same raster backend while repeatedly reading image fingerprints.
      const ctx = document.querySelector('canvas').getContext('2d', { willReadFrequently: true });
      const assets = window.stageTestAssets, WORLD = MygoFighter.WORLD;
      const backgrounds = await Promise.all(assets.backgrounds.map(src => new Promise(resolve => {
        const image = new Image(); image.onload = () => resolve(image); image.src = src;
      })));
      let reducedMotion = false, visualTime = 0, battleArena = 0;
      const match = new MygoFighter.Match({ mode: 'practice' });
      const camera = { x: 480, y: 200, zoom: .574 };
      eval(source + `
        window.renderStageDetails = (index, reduced, time, zoom = .574) => {
          battleArena = index; reducedMotion = reduced; visualTime = time; camera.zoom = zoom;
          match.setTerrain(assets.stages[index].terrain);
          const before = JSON.stringify(match.options.terrain);
          const start = performance.now();
          drawBackground();
          ctx.save(); ctx.translate(480, 270); ctx.scale(camera.zoom, camera.zoom); ctx.translate(-camera.x, -camera.y);
          drawTerrain(); ctx.restore();
          const elapsed = performance.now() - start;
          const pixels = ctx.getImageData(0,0,960,540).data;
          let hash = 2166136261;
          for (let i = 0; i < pixels.length; i += 4) hash = Math.imul(hash ^ pixels[i] ^ pixels[i+1] << 8 ^ pixels[i+2] << 16, 16777619) >>> 0;
          return { hash, elapsed, geometryUnchanged: before === JSON.stringify(match.options.terrain) };
        };
      `);
    }''', draw_source)
    scenes = page.evaluate('stageTestAssets.stages.map(s => s.id)')
    sheet = Image.new('RGB', (960, 5 * 198), '#101622')
    labels = ImageDraw.Draw(sheet)
    fingerprints = []
    for index, stage in enumerate(scenes):
        normal = page.evaluate('i => renderStageDetails(i, false, 4200)', index)
        assert normal['geometryUnchanged'], stage
        fingerprints.append(normal['hash'])
        screenshot = Image.open(io.BytesIO(page.screenshot())).convert('RGB').resize((320, 180))
        x, y = index % 3 * 320, index // 3 * 198
        sheet.paste(screenshot, (x, y)); labels.text((x + 5, y + 182), stage, fill='white')
        still_a = page.evaluate('i => renderStageDetails(i, true, 0)', index)
        still_b = page.evaluate('i => renderStageDetails(i, true, 90000)', index)
        assert still_a['hash'] == still_b['hash'], f'{stage}: reduced motion still animates'
        wide = page.evaluate('i => renderStageDetails(i, false, 90000, .28)', index)
        assert wide['geometryUnchanged'], stage
        report['scenes'].append({'id': stage, 'render': 'pass', 'reduced_motion': 'static',
                                 'geometry': 'unchanged', 'draw_ms': round(normal['elapsed'], 2)})
    assert len(set(fingerprints)) == len(scenes)
    assert not report['errors'] and not report['remote_requests'], report
    sheet.save(ART / 'stage-detail-render-contact.png')
    (ART / 'stage-detail-render-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))
    browser.close()
