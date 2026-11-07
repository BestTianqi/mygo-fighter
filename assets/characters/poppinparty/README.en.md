[简体中文](README.md) | **English** | [日本語](README.ja.md)

# Poppin'Party Asset Pack (Not Yet Integrated)

Standalone portraits and skill definitions for all five members, **not added to the game yet**.

- `portraits/`: five 1024×1536 transparent PNGs with the original 2D faces, normal proportions and the Hanasakigawa school uniform; Kasumi's red star-shaped guitar, Tae's blue guitar, Rimi's pink bass, Saaya's two drumsticks and Arisa's key-press gesture.
- `references/official-uniform-lineup.jpg`: reference image from the [official uniform visual news](https://gamebiz.jp/news/366083). The characters are, from left to right, Rimi, Saaya, Kasumi, Arisa and Tae.
- `prompts.json`: the original prompts, reference sources and generation modes of the built-in image_gen.
- `actions/`: 16 separate key action poses per character, 80 in total; the crop rectangles, silhouettes and display scales are in `manifest.json`, see [action notes](actions/README.en.md) for details.
- `action-prompts.json`, `action-generation.json`: action sheet prompts, references and re-draw records, all using the built-in image_gen.
- `voices/`: 30 clips of official game audio with source, speaker, original line and cut time. Each member has 6 clips for entry, U/I/O/P and finish, see [voice notes](voices/README.en.md) for details.
- `skills.json`: 55 moves plus 1 internal counter wave, with effects, hitboxes, timing, damage and action notes; no official numeric IDs.
- `preview.html`: double-click to see the portraits and skill table, switch actions, play the three J stages and audition the 30 voice clips; needs no server and does not load the official game.

Skill code: `frontend/src/game/bands/poppinparty/draftMoves.ts`. The factory accepts the five IDs that will be officially assigned later and only returns data, with no auto-registration side effects; it is not imported by `bands/index.ts`. Do not treat the temporary IDs used by the exporter as official IDs.

Re-export: run `node tools/build_poppinparty_drafts.mjs` in the project root. This updates the five character JSON files and the offline preview, and does not update the official asset manifest.

The skills are validated against the shared combat kernel: 110 releases in both directions, covering insufficient energy, basic combo scaling, counters and whiffed waves, shields and their expiry, telegraphed dodges, the two facing directions and super armor. The 30 voice clips were verified for decoding, duration, skill reference, normal-speed playback and exclusive auditioning. The 80 key actions were checked for complete crops and adjacent afterimages, and the three-stage light attack switching and skill voices were verified. The shared kernel was not modified. Full continuous frame-by-frame animation, combat effect rendering and the super background art are still to be made, and this does not claim the pack is playable yet.
