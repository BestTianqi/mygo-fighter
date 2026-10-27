# Source asset catalog

This folder contains editable artwork, packed source atlases, original recordings and provenance. The game loads `frontend/public/assets.json` and `frontend/public/media/`; it does not load this folder directly.

| Folder                                                                 | Contents                                                                       |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `mygo/anon/`, `mygo/soyo/`, `mygo/tomori/`, `mygo/rana/`, `mygo/riki/` | Each character's source sheets, action catalogs, frame maps and packed atlases |
| `mygo/soyo/haruhikage/`                                                | Soyo's super recording, video, finish still and source attribution             |
| `mygo/jab-actions.json`                                                | Shared light-chain sheet selection for Anon, Soyo and Tomori                   |
| `mygo/portraits-v1/`                                                   | Reviewed MyGO portrait sources and face-crop metadata                          |
| `mujica/`                                                              | Per-character normal/stage sheets, masks, portraits and catalogs               |
| `mewtype/`                                                             | Per-character virtual sheets, portraits and catalogs                           |
| `stages/`                                                              | Stage backgrounds, `stages.json` geometry catalog and campus provenance        |
| `audio/`                                                               | Tomori's penguin voice clips and their timing catalog                          |
| `meme-media/`                                                          | Recorded skill voices, cutins, extracted poses and provenance by feature       |
| `finish-art/`                                                          | Dedicated KO illustrations                                                     |
| `reference/`                                                           | Character references and the face revision guide                               |
| `notes/`                                                               | Historical art direction, character designs and implementation notes           |

Versioned sheets are retained: older drawings can supply pose heights or document reviewed revisions. Filenames keep the character prefix so exported files remain identifiable. `riki` is the artwork key for Taki (立希).

Generated review contact sheets and partial packs live under the ignored `output/artwork/` directory. Full artwork builds use the reviewed source sheets and final catalogs rather than these previews.

Action catalog `file` and `overrides` values are relative to `assets/`, including their band and character directories. Stage `file` values are relative to the repository root. Recording catalogs retain their documented repository-relative or catalog-relative conventions.

Use `npm run check` to verify runtime hashes and the MyGO/stage source references. For packing commands and runtime export, see [the artwork workflow](../docs/ARTWORK.md). Generated verification reports and screenshots belong under the ignored `output/` directory.
