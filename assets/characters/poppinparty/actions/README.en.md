[简体中文](README.md) | **English** | [日本語](README.ja.md)

# Poppin'Party Action Sprites

Five characters, 16 key poses each, 80 in total: idle, walk, run, jump, guard, hit reaction, knockdown, entry, the first/second/third J stage, K, U/I/O/P. All were generated with the built-in image_gen from each character's approved portrait, with normal proportions and a unified Hanasakigawa uniform; the complete drawing record is in `action-prompts.json` and `action-generation.json` one level up.

Five same-named PNGs hold the original action atlases. There are also five single-pose additions that replace the entries with insufficient margins in the atlases: Arisa's entry, Kasumi's U/I, Tae's jump and Rimi's K; the other poses in the original atlases are still used.

`manifest.json` lists, per character, the source PNG, crop rectangle, silhouette, display scale and any needed mirroring for each action. You cannot crop directly on an even grid: some instruments or shoe tips cross the nominal cell lines of the generated image, and the silhouette excludes adjacent poses while keeping the complete figure. Kasumi's U is displayed mirrored to the action direction, and Rimi's U keeps the separately thrown chocolate cornet.

The source PNGs are not rewritten pixel by pixel. Running `python tools/build_poppinparty_actions.py` only analyzes the alpha channel and generates the crop and silhouette data, and needs Pillow, NumPy and OpenCV. Then run `node tools/build_poppinparty_drafts.mjs` to update the preview and character data.

`preview.js` uses Canvas to display these actions. `preview.html` one level up can select actions one by one, play the three J stages, and make U/I/O/P and the entry use their matching voices. After an action returns to idle, the voice still plays to the end at normal speed.

This is a key-pose asset pack and an action-switching demo; no complete continuous frame-by-frame animation was produced for each move. The official roster, CPU, online play and runtime asset packs have not imported this asset pack.
