# Bands

For the reusable character intake template and read/create commands, see
[新角色模板](characters/README.md). The callable workflow is
`.agents/skills/mygo-add-character/SKILL.md`.

A **band** is one roster group with its own characters, moves, forms and play
style. MyGO, Mujica and MewType are all bands; no band is the "default" that the
engine special-cases. The combat kernel, UI and server derive every band
decision from the registry in `frontend/src/game/bands/`.

## Layout

```
frontend/src/game/bands/
  index.ts               registry: BANDS, bandFor(id), CHARACTERS
  contract.ts            Band type + defineBand() defaults + validation
  validation.ts          validateBands(), validateCatalog()
  shared/                moves every band may use, shared passes
    universalMoves.ts    throw (registered once, exempt from ownership)
    scale.ts             shared movement scaling
    skill.ts             unified U/I/O skill resolution
    command.ts           scheme-band light/heavy command mapping
    derivedSupers.ts     numbers shared between two bands' supers
  mygo/
    index.ts             defineBand({...}) — the band facade
    roster.ts            CHARACTERS
    forms.ts             SCHEMES, penguin scheme, prefix/chain helpers
    moves.ts             authored moves, in registration order
    normalMoves.ts, skillMoves.ts, rangedMoves.ts,
    penguinMoves.ts, ranaMoves.ts, rikiMoves.ts, chains.ts
    movesFor.ts          move-list rules (filters + display overrides)
    tune.ts              post-balance overrides
    ability.ts           command table, cancel rules, start effects, CPU AI
  mujica/, mewtype/      the same shape, less special behaviour
```

`data/` keeps only cross-band assembly: `roster.ts` (flat list + shared speed /
jump scaling), `createMoveCatalog.ts` (pass order), `listMoves.ts` (dispatch),
`moves/balance.ts` (shared tuning pass).

## The Band contract

`defineBand(spec)` fills every default, so a band with no special mechanics
declares only `id`, `characters` and `moves`. The returned `Band` exposes:

| Field | Meaning |
| --- | --- |
| `id`, `label`, `characters`, `moves`, `forms` | identity and data |
| `unified` | play with the U/I/O skill scheme instead of a command table |
| `formFor`, `prefixFor`, `normalFor` | form and move-key naming |
| `schemeFor`, `extraBindings` | controls list and in-game command list |
| `movesFor(all, character, penguin)` | the move list shown for a fighter |
| `owns(f, move, name)` | move legality for this band |
| `profileFor(f)` | the `Character` profile, including form variants |
| `stanceLocked(f)`, `cancelDepth(f)` | stance restrictions and cancel budget |
| `command(match, f, requested, input)` | button → move name |
| `skill(f, input, pressed, airborne)` | extra unified-mode skill |
| `airCancel`, `extraCancel` | cancel exceptions |
| `beforeStart(match, f, name)` | upgrade a move before it starts (beat boost) |
| `onStart(match, f, move, name, ground)` | per-move startup physics |
| `ai(match, side, input)` | band CPU tactics |
| `tune(moves)` | post-balance move overrides |
| `transform` | optional staged form (`move`, `duration`, `energy`, multipliers) |
| `presentation` | optional asset section hints for the UI |

Defaults: single form `"base"`, keys `<band>_<id>_<form>_<slot>` (or the band's
`prefixFor`), ownership by `ownerCharacter`/universal moves, `stanceLocked` true,
cancel depth 4, no command/ai/tune/transform.

## Adding a band

1. **Create the folder** `frontend/src/game/bands/<id>/`. Add `roster.ts` with
   consecutive explicit `id`s. Ids must stay contiguous across the whole
   registry (the current roster ends at 15, so a new band starts at 16).
2. **Add moves.** Author `Record<string, Move>` with unique keys, using
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
