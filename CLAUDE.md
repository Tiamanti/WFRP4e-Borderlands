# CLAUDE.md

Module: WFRP4e Borderlands region generator (Renegade Crowns). Single ESM bundle (`src/wfrp4e-borderlands.mjs`).

## Commands

```bash
npm run build    # rollup --watch → foundry-path.js target
npm run release  # production bundle
npm test         # vitest unit tests (Node, stubs in tests/setup.mjs)
```

## Status

All six SPECS.md phases are implemented and committed. Ancient Ruins through Settlements are
manually verified in a live Foundry world; Hazards, the 4 settings, and the redesigned
region-aware Geography phase (below) are implemented and committed but not yet confirmed
working in-game — check before relying on them. Hex grid support specifically (Default Grid
Shape setting) is implemented and unit-tested but has **never been run against a live Foundry
world at all** — check that first if you're about to rely on it. See `docs/DECISIONS.md` for
the "why" behind every non-obvious call below, and `PLAN.md` for the full narrative if
`docs/DECISIONS.md` isn't enough detail.

| Phase | Tables | Trigger | Foundry output |
|---|---|---|---|
| 1. Geography | 1-1, 1-2 | Generic one-shot `runPhase` | Scene (Global Illumination on, square or hex grid per the Default Grid Shape setting) painted with one `Drawing` per grid cell — terrain clustered by type (Swamps/Mountains on the border, Hills hugging Mountains), rivers/cliffs as freehand `Drawing` polygons, Special Features overwriting terrain per their own placement rule |
| 2. Ancient Ruins | 1-3..1-8 | Generic one-shot `runPhase` | One page per ruin in `"<Map Name> - Ancient Ruins"`; a scene `Note` per ruin deep-links to its page |
| 3. Princes | 1-3, 2-1..2-11 | Generic one-shot `runPhase` | `npc` Actors (linked Career/Skill/Talent Items, resolved against the required `wfrp4e-core` compendiums) in a shared `"<Map Name>"` Actor folder |
| 4. Relationships | 2-12..2-22 | Generic one-shot `runPhase` | One page **per prince** in `"<Map Name> - Relationships"`; mutual natures (Alliance/Rivalry/War) on both pages, one-directional natures only on the feeling prince's page |
| 5. Settlements | 3-1..3-7 | Generic one-shot `runPhase` | One page per prince plus one for the uncontrolled area in `"<Map Name> - Settlements"`, sorted largest-population-first; no scene placement |
| 6. Hazards | 4-1..4-12 | GM-chosen lair count (Few/Moderate/Many, `DialogV2`) before the generic one-shot `runPhase` | One page **per lair** (no owner to key by) in `"<Map Name> - Hazards"`; no scene placement |

See `SPECS.md` for the rules process and table page references, and `DEVELOPMENT.md`'s
"Extending the module" section for the conventions to follow when changing any of this.

## Settings

4 world-scope settings (`src/settings.mjs`, registered `Hooks.once("init")`): **Default Map
Size** (`defaultMapSize`, String "WxH", default `"20x20"` — `/borderlands`'s fallback when no
`mapSize=WxH` arg is given). **Ban Large Geography Regions** (`banLargeRegions`, Boolean,
default `false` — rerolls Table 1-1 results of 81-99 on maps under 500 squares, 91-99 on
500+, without bumping the running bonus). **Default Grid Shape** (`defaultGridShape`, String
`"square"`/`"hex"` with a `choices` dropdown, default `"square"` — hex is pointy-top, odd-row
offset only (Foundry's `HEXODDR`); read once by `generateGeography` on a region's first
Geography run, then stored on `region.geography.gridShape` so a re-run keeps its original
shape even if the setting changes later — see `docs/DECISIONS.md`'s "Hex grid support").
**Generate Names** (`generateNames`, Boolean, default `true` — names every settlement using
Appendix I's naming tables (`tables/names.mjs`), biased 50% toward the owning prince's
race-mapped cultural style, 10% each toward the other 5; the uncontrolled area's settlements
bias toward Flavourful, the "native" style. Princes deliberately do **not** get a generated
personal name — left to the GM, per direction).

## Invariants

- `SPECS.md` is the source of truth for process order and table locations; `Renegade
  Crowns.pdf` is the copyrighted source book (gitignored — do not commit it).
- When reading the PDF, jump to specific table pages rather than reading the whole
  document — table descriptions usually continue onto the adjacent page. Always cross-check
  a dense table with `pdftotext -table`, not just `-layout` — see `docs/DECISIONS.md`'s
  "Table transcription" entry for why.
- Region data is a single plain object (`createRegion()` in `region.mjs`) with one field
  per phase; each `generate*` function receives the region built so far and returns only
  the fields it produced. `runPhase` merges the result back in.
- Foundry min v13; uses ApplicationV2 API (see `src/apps/borderlands-wizard.mjs`).
- Every phase's roll logic (`generation/<phase>.mjs`) is pure (`Roll` only) and unit-tested;
  anything touching a real Foundry document lives in a sibling `*-scene/-journal/-actor/
  -chat.mjs` file and isn't unit-tested. Don't mix the two in one file.

## Known Limitations

- `module.json`'s `relationships.requires: wfrp4e-core` makes the **entire module** require
  the Core Rulebook content module to activate, even though only the Princes phase actually
  needs its compendiums. Flagged during Princes' build, never revisited — worth changing to
  `recommends` (or scoping the requirement some other way) if it becomes a real activation
  blocker for a user who doesn't own `wfrp4e-core`.

## Entry point dispatch

`src/wfrp4e-borderlands.mjs` → `Hooks.once("init")` calls `settings.mjs#registerSettings`;
`Hooks.once("setup")` registers `/borderlands` via `game.wfrp4e.commands.add` →
`commands/borderlands-command.mjs#handleBorderlandsCommand` (GM check) → opens
`apps/borderlands-wizard.mjs#BorderlandsWizard`.

## Docs

| File | Contents |
|------|----------|
| `SPECS.md` | Process summaries + table page locations (source of truth) |
| `docs/SOURCE-MAP.md` | All src files, exports, region data shape |
| `docs/DECISIONS.md` | Scannable list of every non-obvious/locked-in design decision |
| `PLAN.md` | Full chronological design log, phase by phase (the detailed "why") |
| `DEVELOPMENT.md` | Build/test workflow, project layout, conventions for extending the module |
