# Web publishing assets

`frontend/public/` remains the original runtime material used by development and
`npm run check`. Source artwork stays under `assets/`.

Generate the smaller publishing images with:

```sh
python tools/optimize_web_assets.py
```

Commit the generated `assets/optimized-web/manifest.json` and its `media/` files.
The manifest records original and optimized SHA-256 hashes, sizes, dimensions,
and quality. Only images replaced by smaller versions appear in it.

The generator keeps full image resolution, using WebP quality 74 for atlases and
94 for other images, with encoding method 4. Alpha uses 17 levels: fully transparent
and opaque pixels remain exact; intermediate opacity changes by at most 8/255.
This reduces image fidelity slightly without changing sprite geometry.

`npm run build` and `npm run build:pages` validate those hashes, copy original
public files into ignored `output/web-public/`, replace the selected images, and
rewrite all nested `assets.json` references to their new content-hashed URLs.
Audio, video, dimensions, frame coordinates, and original files are preserved.
Vite uses this prepared directory for production and original public files for
development. Use the npm build commands so preparation runs before Vite.

After changing original media or asset references, rerun the optimization command.
A stale or missing replacement fails the build with that instruction. Each frontend
build also rejects a final `frontend/dist/` larger than **50,000,000 bytes**,
including scripts, styles, HTML, and all media. Existing simulation and backend
build steps remain unchanged.
