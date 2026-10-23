# Artwork workflow

`frontend/public/assets.json` is the runtime manifest. Its `/media/...` references point to content-addressed files in `frontend/public/media/`. These files are served directly; no application code embeds base64 media.

The original drawings, source sheets, metadata and attribution are retained under `assets/`. Some historical provenance notes refer to old generated previews and screenshot paths. Those references describe the earlier artwork process; the current application and checks are documented in the root README.

Normal application development only needs `npm ci` and `npm run build`. It does not require Python or image-processing packages.

To regenerate runtime artwork after changing source sheets:

```sh
python3 -m pip install -r requirements.txt
python3 tools/build.py
npm run build
```

The optional Python workflow crops, anchors and packs the source artwork, then writes the media files, manifest and server terrain catalog. It does not restore the removed embedded game HTML or Node server. Dedicated character-preview templates live under `tools/templates/` and their generated HTML outputs are ignored.

Run `node scripts/check-assets.mjs` to check content hashes and manifest references without regenerating artwork.
