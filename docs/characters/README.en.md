[简体中文](README.md) | **English** | [日本語](README.ja.md)

# New character template

This is character design material for the assistant to read. Once it has been filled in, the assistant wires the character, actions, skills and media into the game following the existing architecture.

A prepared set of character material: [the five Poppin'Party members](poppinparty.en.md) (not wired into the game yet).

## The simplest way to use it

Say this directly:

> Add a new character from the new-character template: "character name", from "work title". You design the rest of the skills.

You can also prepare the file first, then say:

> Read docs/characters/角色标识.json and add the new character from the material inside.

The invocable skill name is `$mygo-add-character`; its in-project entry point is `.agents/skills/mygo-add-character/SKILL.md`. When only reading is requested, the assistant reports the material and the open items first; when the addition is explicitly requested, it goes on to implement it.

## Create, read, check

From the repository root:

```powershell
npm run character:new -- new-character --name "新角色名" --work "作品名"
npm run character:read -- new-character
npm run character:check -- new-character
```

The first command creates `docs/characters/new-character.json` from [character.template.json](character.template.json); an existing file is kept. `--out` selects another output path, and `--band` takes an existing code group or the name of a group you are about to add.

`read` accepts a character key or a JSON file path and prints the complete material, missing items, the live roster, the next available number and band integration hints. Reading an unfinished draft still produces a report; `check` fails when material is missing or conflicting.

The tools only create and read material. The material status `ready-for-design` means it can be handed to the assistant for design and integration; it does not mean the character is playable yet. A new character needs no hand-written numeric ID; one is assigned during implementation from the latest registry.

## What to fill in

You only need to settle `identity.name` (the character name), `identity.work` (the work title; for an original character fill in “原创”), and `identity.key` (a unique ASCII identifier). When the file is generated with the create command, the key is filled in automatically.

| Section          | Contents                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| `identity`       | Name, work, band, personality, signature colour and source-work setting                           |
| `design`         | Battle role, skill theme, references and explicit limits                                          |
| `forms`          | Each form's look, light attack, heavy attack, blink, U/I/O/P skills, entrance and finish sequence |
| `transformation` | Whether there is an H transformation, the two forms, cost, duration and multipliers               |
| `media`          | Paths, sources, speakers and clip ranges of images, voices and videos                             |
| `notes`          | Other requirements or story beats you want to keep                                                |

With `design.allowAutoDesign: true`, blank skills and media descriptions are designed by the assistant; a value still to be decided uses `null`. Set to `false`, each form's U/I/O/P must state the skill name and its actual effect.

`identity.group` is the group name players see, and `identity.codeBand` is the code module (default `auto`, decided by the assistant). The two can differ, for example characters displayed under different band names inside the same code module.

### Light attacks and skills

- J: `attacks.J.chain` describes the first, second and third hit separately; do not repeat the same action three times.
- K: `attacks.K.description` describes the heavy attack or kick; its hit range follows the shared rules.
- L: reuse the current resonance cost, distance and afterimage blink.
- U/I/O: the three basic skills; `type` can be `projectile`, `melee`, `area`, `summon`, `heal`, `shield`, `counter`, `movement` or `custom`.
- P: the super; `totalDamage` is the total damage of all hits and `hits` is the number of hits. For example `totalDamage: 50, hits: 9` means nine hits for 50 in total.
- `startupMs`, `recoveryMs` and `cooldownMs` are startup, recovery and cooldown in milliseconds; the assistant maps the concrete runtime fields to the skill mechanics.
- Backward+U/I/O default to a projectile, a charged projectile and a lobbed throw respectively; write the character's own version in `backwardSkills`.
- H: used for transformation only; pause and restart use the on-screen buttons.

A skill description must state what it hits, its direction, range, height difference, damage or buff, duration and effects. A multi-hit skill is budgeted as one skill's resonance. Skill speed and the playback speed of the source video/voice are configured separately; media keeps its original speed.

### Adding a transformation

Copy a form object in `forms`, give the second form a unique `key` (for example `stage`), and fill in its outfit, skills, entrance and ultimate art separately. Then set:

```json
{
  "enabled": true,
  "key": "H",
  "from": "normal",
  "to": "stage",
  "cost": 50,
  "durationMs": 20000,
  "damageMultiplier": 1.2,
  "speedMultiplier": 1.1,
  "description": "写变身动作、气场和爆气效果"
}
```

This is a sample `transformation` entry; it has to go back into the complete material file. Both forms must actually exist. When no transformation is requested, keep `enabled: false`.

### Media and voices

Image references can go in `portraitReference`, `artReference` or `design.references`. One voice entry in `media` can be written as:

```json
{
  "key": "finish-voice",
  "kind": "voice",
  "localPath": "",
  "sourceUrl": "",
  "speaker": "角色本人",
  "line": "填写真实台词",
  "startSeconds": null,
  "endSeconds": null,
  "notes": "待查找或填写原片片段"
}
```

Then set `forms[].ultimateFinish.voiceKey` to `finish-voice`. Other skills and entrances reference `media` keys the same way. A voice key must have a matching media record; a web URL or a local file path is material, not a command to run.

Portraits use the source work's 2D face and normal build, with clearly different outfits between forms; the ultimate art extends the matching portrait onto a widescreen background. Actions must cover at least idle, move, jump, guard, hit, knockdown, the three-hit J chain, K and U/I/O/P, and transforming characters also need the H transition. Image source files go in `assets/`, and packed runtime files go in `frontend/public/`.

## Integration points for the assistant

The material is design input, not a runtime configuration to import directly. For integration points and the verification workflow, see [BANDS.md](../BANDS.en.md) and the in-project skill.

- Read the current registry first and preserve existing character IDs and published move keys; bump the frontend/backend protocol in step when the roster changes.
- The ID ranges of an existing band must stay contiguous. A non-final group cannot take a new ID appended directly; choose a compatible registration plan instead of silently reordering old characters.
- `normal` in the template is the default material form name; when integrating into an existing module, map it to the form that module actually uses (for example the `virtual` form MewType uses).
- Integrate character select, CPU, the skill table, 1v1, 3v3, 联机 (online play), preloading, entrances, ultimate finishes and sound effects, then run the existing checks.

This template itself registers no placeholder character. Temporary verification scripts and screenshots go under the ignored `output/`.
