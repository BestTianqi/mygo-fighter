# Artwork workflow

`frontend/public/assets.json` is the runtime manifest. Its `/media/...` references point to content-addressed files in `frontend/public/media/`. These files are served directly; no application code embeds base64 media.

The original drawings, source sheets, metadata and attribution are retained under `assets/`. Some historical provenance notes refer to old generated previews and screenshot paths. Those references describe the earlier artwork process; the current application and checks are documented in the root README.

See the [source asset catalog](../assets/README.md) for folder ownership and path conventions. MyGO action sheets and metadata live under `assets/mygo/<character>/`; stage geometry lives beside its backgrounds in `assets/stages/stages.json`. Historical design notes are collected under `assets/notes/`.

Normal application development only needs `npm ci` and `npm run build`. It does not require Python or image-processing packages.

To regenerate runtime artwork after changing source sheets:

```sh
python3 -m pip install -r requirements.txt
python3 tools/build.py
npm run build
```

The optional Python workflow crops, anchors and packs the source artwork, then writes the media files, manifest and server terrain catalog. The character packers write atlases and frame maps; the obsolete HTML preview steps have been removed because their templates are absent.

`python tools/build_riki_assets.py` rebuilds Taki's selected atlas and frame map before a full export when her action sources change. `python tools/build_rana_assets.py` packs Rana's selected poses. `python tools/build_mujica_assets.py --character umiri --form normal` and `python tools/build_mewtype_assets.py --character arale` pack individual forms. These commands update source atlases; run `python tools/build.py` to export them into the runtime manifest.

Run `node scripts/check-assets.mjs` to check content hashes, manifest references and MyGO/stage source paths without regenerating artwork. Moving a source file also requires updating its action catalog and packer paths; runtime `/media/` names depend on content rather than source location.

## MyGO portrait updates

The five reviewed normal-proportion MyGO drawings live under `assets/mygo/portraits-v1/`. Each transparent `*-source-v1.png` supplies a full-body portrait, a square face crop and a grounded idle frame, matching the Mujica portrait workflow. `crops.json` records the reviewed face framing relative to the tightly cropped figure. Existing attack, movement and transformation sheets remain separate.

After updating these sources, regenerate only the MyGO portraits with:

```sh
python tools/build_mygo_portraits.py
node scripts/check-assets.mjs
```

The exporter preserves every existing referenced runtime file, adds content-addressed portrait files and retires only generated media no longer referenced by the manifest. The regular full artwork build also includes these portraits. Menu, selection preview and ordinary finish portraits use the character portrait; selection cards and HUD use the explicit face crop. Soyo's and Uika's video finish stills remain in place.

MewType follows the same workflow under `assets/mewtype/portraits-v1/`, using each character's initial virtual outfit. Run `python tools/build_mewtype_portraits.py` to update those five portraits, square face crops and idle atlases. Existing movement and attack sheets remain independently authored assets.
