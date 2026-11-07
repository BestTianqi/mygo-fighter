[简体中文](poppinparty.md) | **English** | [日本語](poppinparty.ja.md)

# Poppin'Party character data

Status: **standalone portraits and skill packs for all five members are made, but the band is not integrated into the game yet**. This is material awaiting integration, not a released playable band.

[Open the portrait and skill preview](../../assets/characters/poppinparty/preview.html) (opens directly in a browser).

| Character | Key      | Instrument      | Data                       |
| --------- | -------- | --------------- | -------------------------- |
| Kasumi    | `kasumi` | vocals / guitar | [kasumi.json](kasumi.json) |
| Tae       | `tae`    | guitar          | [tae.json](tae.json)       |
| Rimi      | `rimi`   | bass            | [rimi.json](rimi.json)     |
| Saaya     | `saaya`  | drums           | [saaya.json](saaya.json)   |
| Arisa     | `arisa`  | keyboard        | [arisa.json](arisa.json)   |

Character identities follow the [official member profiles](https://anime.bang-dream.com/bandorichan/character/poppinparty/). The five portraits were each generated with the built-in image_gen from the [official uniform visual reference](https://gamebiz.jp/news/366083), keeping normal proportions, each character's hairstyle and eye colour, and a shared uniform. Source images, transparent PNGs and the full prompts are stored in `assets/characters/poppinparty/`.

Skill definitions live in `frontend/src/game/bands/poppinparty/draftMoves.ts`; its factory only returns move data and does not touch the global registry. The set contains 55 moves plus Saaya's 1 internal counter wave, 56 definitions in total. It is validated offline against the shared combat kernel; the official roster does not import this module.

| Character | U                    | I                                 | O                                 | P (50 damage on a full hit)       |
| --------- | -------------------- | --------------------------------- | --------------------------------- | --------------------------------- |
| Kasumi    | star pick            | two-stage chasing-star dash       | three star rings around her       | five-stage star heartbeat         |
| Tae       | twin pluck wave      | three-note slide                  | rabbit-ear scale launch           | five forward chord waves          |
| Rimi      | chocolate roll toss  | two-stage low muted strings       | stomping heavy pluck knockdown    | five-stage low-end rings          |
| Saaya     | twin-stick drum beat | guard counter, weak wave on whiff | 30 shield lasting 3 seconds       | six drum quakes around her        |
| Arisa     | forward key wave     | telegraphed falling keys          | surrounding key curtain knockback | five falling keys in a fixed area |

The three J hits deal 5/6/8 base damage at range 200; K deals 13 base damage at range 240; back plus U/I/O are all waves or throws. Normal multi-hit moves follow the existing combo scaling; P ignores combo scaling but is still affected by guard, shields and damage reduction. Every move follows the super armour and resonance rules.

## How to read the data

Run these from the project root, for example:

```powershell
npm run character:read -- kasumi
npm run character:check -- kasumi
```

Replace the key with the one in the table for another character. You can also simply tell the assistant: "Read Poppin'Party's Kasumi data, make the portraits first and do not add her to the game yet."

The five files use the existing template and all set `identity.codeBand` to `poppinparty`. The band is not registered, no numeric IDs are assigned, and the selection, CPU, 3v3, online roster and runtime assets are unchanged. The `ready-for-design` value the reader prints only means the data format is usable. `node tools/build_poppinparty_drafts.mjs` regenerates the data values and the offline preview from the skill definitions.

## Further work

Standalone portraits, skill definitions, action notes for the three-hit light chain and the entrance, and 30 official game voice clips (6 per member) are done. They can be auditioned on the preview page; full sources and trim times are in the [voice data](../../assets/characters/poppinparty/voices/sources.json). Keep `transformation.enabled: false` until a transformation is explicitly needed.

Action sheets are done too: 16 key poses per member, 80 in total, covering movement, guard, hit reactions, the entrance, the three-hit light chain, the heavy attack and U/I/O/P. The preview page can switch poses, play the three J hits and demonstrate them with the matching skill voice; a finished action does not cut off the full line. Source images and crop lists are in the [action notes](../../assets/characters/poppinparty/actions/README.en.md). Full continuous frame-by-frame animation, super background art and the integration of actions and effects into real battles are still to be made.

**Integration happens only after the user explicitly asks to add the band to the game.** When it does, assign IDs from the latest registry, keep the existing character numbering, and follow the [new character template notes](README.en.md) to complete local and online verification.
