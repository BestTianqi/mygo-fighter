# Bands

For the reusable character intake template and read/create commands, see
[新角色模板](characters/README.md). The callable workflow is
`.agents/skills/mygo-add-character/SKILL.md`.

A **band** is one roster group with its own characters, moves, forms and play
style. MyGO, Mujica and MewType are all bands; no band is the "default" that the
engine special-cases. The combat kernel, UI and server derive every band
decision from the registry in `frontend/src/game/bands/`.

## Layout

```text
frontend/src/game/bands/
  index.ts                       registry: BANDS, bandFor(id), CHARACTERS
  contract.ts                    defineBand() defaults
  validation.ts                  validateBands(), validateCatalog()
  shared/                        cross-band commands, derived moves and templates
    superPulses.ts               common pulse spacing, without character choices
  <band>/
    index.ts                     defineBand({...})
    roster.ts, forms.ts           roster and form-selection rules
    moves.ts                     catalog assembly and registration order
    characters/
      <character-key>/
        <form>.ts                this character/form's authored move definitions
    shared/                      reusable normal, projectile and registrar templates
    ability.ts, tune.ts           band behavior and post-balance tuning
```

The same ownership rule applies to every registered character. MyGO's Anon,
Soyo, Tomori, Rana and Riki use `characters/<key>/base.ts`; Tomori's transformed
moves live beside her base moves in `characters/tomori/penguin.ts`. Mujica has
`normal.ts` and `stage.ts` for each character. MewType has `virtual.ts` for each
character, including Viola. Character modules own their authored normal names,
skills, supers, wave variants, back-skill sources and MyGO jab-chain choices.
Shared templates contain the construction logic reused by those modules.

A band's `moves.ts` assembles the forms in the shipped registration order.
Normals, skills, supers and derived moves may require separate passes; grouping
source files by character must not change catalog insertion order or command-list
row order. MyGO's `chains.ts` likewise assembles character-owned chain choices
around the shared scaling pass. Character forms may import their own other forms
or shared templates; they must not reach into another character's implementation.
The frontend ownership check enforces that boundary.

`data/` keeps only cross-band assembly: `roster.ts` (flat list and shared speed /
jump scaling), `createMoveCatalog.ts` (pass order), `listMoves.ts` (dispatch),
`moves/scale.ts` (shared movement scaling) and `moves/balance.ts` (shared tuning).
The `poppinparty/draftMoves.ts` authoring factory remains unregistered and does
not make those characters playable.

## The Band contract

`defineBand(spec)` fills every default, so a band with no special mechanics
declares only `id`, `characters` and `moves`. The returned `Band` exposes:

| Field                                         | Meaning                                                          |
| --------------------------------------------- | ---------------------------------------------------------------- |
| `id`, `label`, `characters`, `moves`, `forms` | identity and data                                                |
| `unified`                                     | play with the U/I/O skill scheme instead of a command table      |
| `formFor`, `prefixFor`, `normalFor`           | form and move-key naming                                         |
| `schemeFor`, `extraBindings`                  | controls list and in-game command list                           |
| `movesFor(all, character, penguin)`           | the move list shown for a fighter                                |
| `owns(f, move, name)`                         | move legality for this band                                      |
| `profileFor(f)`                               | the `Character` profile, including form variants                 |
| `stanceLocked(f)`, `cancelDepth(f)`           | stance restrictions and cancel budget                            |
| `command(match, f, requested, input)`         | button → move name                                               |
| `skill(f, input, pressed, airborne)`          | extra unified-mode skill                                         |
| `airCancel`, `extraCancel`                    | cancel exceptions                                                |
| `beforeStart(match, f, name)`                 | upgrade a move before it starts (beat boost)                     |
| `onStart(match, f, move, name, ground)`       | per-move startup physics                                         |
| `ai(match, side, input)`                      | band CPU tactics                                                 |
| `tune(moves)`                                 | post-balance move overrides                                      |
| `transform`                                   | optional staged form (`move`, `duration`, `energy`, multipliers) |
| `presentation`                                | optional asset section hints for the UI                          |

Defaults: single form `"base"`, keys `<band>_<id>_<form>_<slot>` (or the band's
`prefixFor`), ownership by `ownerCharacter`/universal moves, `stanceLocked` true,
cancel depth 4, no command/ai/tune/transform.

## Adding a band

1. **Create the folder** `frontend/src/game/bands/<id>/`. Add `roster.ts` with
   consecutive explicit `id`s. Ids must stay contiguous across the whole
   registry (the current roster ends at 15, so a new band starts at 16).
2. **Add moves.** Put authored values in `characters/<key>/<form>.ts` and reusable
   construction logic in the band's `shared/`. Assemble the resulting
   `Record<string, Move>` in `moves.ts` with unique keys, using
   `<band>_<id>_<form>_<slot>` for a new band's standard scheme.
   Keys cross the LAN boundary, so never rename a shipped key
   without a protocol bump. Give each move `ownerCharacter` and, if the band has
   more than one form, `form`.
3. **Add `index.ts`** and call `defineBand`:

   ```ts
   import { defineBand } from "../contract";
   import { MOVES } from "./moves";
   import { CHARACTERS } from "./roster";

   export const BAND = defineBand({
     id: "newband",
     label: "NEW BAND",
     characters: CHARACTERS,
     moves: MOVES,
     forms: ["base"],
   });
   ```

   Only add hooks the band actually needs (`schemeFor`, `command`, `ai`,
   `transform`, `tune`, …). A band that declares several forms must also pass
   `formFor`.

4. **Register it** in `frontend/src/game/bands/index.ts`:

   ```ts
   import { BAND as newband } from "./newband";
   const REGISTERED: Band[] = [mygo, mujica, newband];
   ```

   Registration order does not matter: `validateBands` sorts by character id.

5. **Add artwork** to the runtime manifest and `scripts/check-assets.mjs` data:
   characters/stages counts are read from the kernel registry now, so no count
   literal has to be edited. Update `frontend/src/game/objects/BandId.ts`
   (`BandId` union and `BAND_LABEL`).
6. **Test**: `npm run check` (typecheck + assets + kernel contract test),
   `npm run build`, then the LAN smoke routine in `docs/LAN.md`.

Adding a band must not require edits to `match/`, `controls.ts`, `combatData.ts`
or any other band's folder. If a shared file needs a band id, the contract is
missing a capability — add it to `Band`/`defineBand` instead.

## Invariants

- Character ids cover `0..N-1` with no gaps; each band's ids are consecutive and
  sorted by `defineBand`.
- Move keys are globally unique; the catalog refuses duplicate keys at startup.
- Registration order is part of the combat rules. `createMoveCatalog` runs:
  band moves in id order → shared jabs → shared scaling → chains → balance →
  band `tune` passes → catalog validation.
- A base band's `formFor` must stay constant, and its moves must not declare a
  `form`, otherwise penguin mode cannot start its normals.
- `Match`, `Fighter` and snapshot fields are wire-visible. Do not add or rename
  fields without a protocol bump.
- The protocol version lives in `frontend/src/game/networkProtocol.ts` and
  `GameProtocol.Version` (Scala); `scripts/check-protocol.mjs` keeps them equal.
  Roster changes are a protocol change.
- Roster-driven server limits are emitted to
  `backend/src/main/resources/roster.json` by `scripts/build-simulation.mjs`.

## Verification

```bash
npm run check          # typecheck, assets, band contract
npm run build          # kernel bundle, simulation.js, roster.json
npm run check:backend  # Scala compile + scalafmt
```
