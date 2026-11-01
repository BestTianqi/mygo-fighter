# Asset directory and call map

Start here when changing artwork, voices, videos or their game bindings. Sources live in this directory; the runtime manifest is `frontend/public/assets.json`.

## Folder ownership

| Folder                                   | Responsibility                                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `characters/mygo/<character>/`           | MyGO source sheets, action selections, frame maps and packed source atlases                      |
| `characters/mygo/tomori/voices/`         | Penguin voice clips and `penguin-voices.json` timing/source catalog                              |
| `characters/mygo/soyo/haruhikage/`       | Soyo's super voice, cutin video, finish still and attribution                                    |
| `characters/mygo/jab-actions.json`       | Shared light-chain selections for Anon, Soyo and Tomori                                          |
| `characters/mujica/<character>/`         | Normal/stage action sheets and per-character manifests                                           |
| `characters/mujica/mask-transformation/` | Shared mask transformation artwork                                                               |
| `characters/mewtype/<character>/`        | Virtual-form sheets, action manifests and Viola artwork                                          |
| `characters/*/portraits-v*/`             | Reviewed portrait sources, face crops and crop metadata                                          |
| `characters/poppinparty/`                | Offline character drafts, portraits, key poses and voices; not registered as playable characters |
| `meme-media/<feature>/`                  | Cross-character skill recordings, cutins, extracted poses and provenance                         |
| `finish-art/`                            | KO art and `v2/` ultimate art, voice/video sources and catalogs                                  |
| `stages/`                                | Backgrounds and `stages.json` geometry, including campus attribution                             |
| `fonts/`                                 | Local UI fonts and licensing; imported directly by `frontend/src/styles.css`                     |
| `reference/`                             | Shared visual references and face revision guide                                                 |
| `notes/`                                 | Historical design and implementation notes; not runtime configuration                            |

Character filenames retain their prefixes so exports remain identifiable. `riki` is Taki's artwork key (立希); the runtime roster uses `taki`. Earlier source revisions are retained because selected poses and reviewed proportions can still depend on them.

## How sources reach the game

```text
assets/ source files + selection/provenance catalogs
  -> tools/build.py and specialized packers
  -> frontend/public/assets.json: semantic keys -> /media/<content hash>.<ext>
  -> frontend/src/assets/loadAssets.ts: resolve deployment base + hydrate band forms
  -> frontend/src/assets/bandArt.ts and GamePage runtime/components
```

The manifest is the runtime binding authority. Game code selects semantic entries such as `penguinVoices.penguinKick`, never a hand-written content hash or a path into this source folder. Fonts are the direct CSS import exception. The shared combat kernel and Scala backend do not read source artwork; `tools/build.py` also exports the stage terrain catalog to `scripts/stages.json`.

| Source group                   | Packing entry points under `tools/`                                                                  | Runtime manifest keys                                                                                                                                                 | Game consumers under `frontend/src/`                                                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MyGO action sheets             | `build.py`; source atlas updates: `build_riki_assets.py`, `build_rana_assets.py`                     | `characters`, `anonNormals`, `anonActions`, `soyoActions`, `tomoriActions`, `penguin`, `jabActions`, `milkDragon`, `soyoTensora`, `ranaParfaitActions`, `ranaParfait` | `assets/bandArt.ts`, `pages/GamePage/runtime/rendering/`                                                                                                  |
| Mujica/MewType actions         | `build_mujica_assets.py`, `build_mewtype_assets.py`, `build_viola_assets.py`, `build_mask_assets.py` | `mujicaForms`, `mewtypeForms`, `mujicaMaskForms`                                                                                                                      | `assets/bandArt.ts`, `pages/GamePage/runtime/rendering/battleScene/`                                                                                      |
| Portraits and face crops       | `build_mygo_portraits.py`, `build_portrait_assets.py`, `build_mewtype_portraits.py`                  | `mygoPortraits`, `mujicaPortraits`, `mewtypePortraits`, `characters.*.portrait`                                                                                       | `assets/bandArt.ts`, `pages/GamePage/components/CharacterPortraitPreview.tsx`, `pages/GamePage/runtime/rendering/drawEntrances.ts`                        |
| Skill recordings and cutins    | `build_meme_assets.py`; penguin and Haruhikage also wired by `build.py`                              | `memeSkills`, `memeVoices`, `penguinVoices`, `soyoVoices`, `summonVoices`, `transformMusic`, `memeCrawlForms`, `sakikoCustomerActions`, `soyoSuperVideo`              | `pages/GamePage/runtime/audio/AudioDirector.ts`, `pages/GamePage/runtime/rendering/`, `pages/GamePage/components/BattlePanel/UltimateBackgroundVideo.tsx` |
| Finish presentation            | `build_finish_assets.py`, `build_finish_videos.py`                                                   | `finishArts`, `ultimateFinishes`, `finishVoices`, `soyoFinishArt`, `uikaFinishArt`                                                                                    | `pages/GamePage/components/BattlePanel/FinishOverlay.tsx`, `pages/GamePage/runtime/audio/AudioDirector.ts`                                                |
| Stage backgrounds and geometry | `build_stage_assets.py` via `build.py`                                                               | `backgrounds`, `stages`                                                                                                                                               | `pages/GamePage/runtime/rendering/createStageRenderer.ts`, character selection                                                                            |

## Find a file or binding

From the repository root:

```sh
npm run assets:find -- penguin
npm run assets:find -- mujicaForms.6
npm run assets:find -- ultimateFinishes
```

The command searches source filenames and runtime manifest paths, printing the actual deployed media filename for each matching binding. It also accepts a media hash. Results are independent searches, not a claim that a source file is byte-identical to its cropped or packed export. Numeric manifest keys are zero-based roster IDs; use `frontend/src/game/data/roster.ts` for identity and `assets/bandArt.ts` for band/form selection.

## Path rules and updating assets

- Action catalog `file`, `overrides` and `sourceFiles` entries are relative to `assets/`: for example `characters/mygo/anon/anon-extra-mobility-v1.png`.
- Stage `file` entries are repository-relative: `assets/stages/...`.
- Recording catalogs retain their documented repository-relative or catalog-relative conventions. Check the owning packer's resolver before editing these paths.
- Runtime `/media/` URLs are relative to the deployed application base; `loadAssets.ts` handles the project subpath.
- `review.proof` entries in MewType manifests are assets-relative paths into `../output/artwork/`. Optional review files, contact sheets and screenshots belong in ignored `output/`.

After editing sources, run the appropriate source packer where needed, then `python3 tools/build.py` to export. Targeted portrait/finish scripts can update the existing manifest; see [the artwork workflow](../docs/ARTWORK.md). Ordinary application builds do not repack artwork or require Python dependencies.

Run `npm run check` and `npm run build` after changing bindings. Asset checks verify runtime content hashes, source action groups across bands, penguin voice paths and stage sources. Keep provenance and original media when moving sources; update catalog paths, packers, draft references and this call map together.
