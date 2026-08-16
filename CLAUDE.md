# CLAUDE.md

Module: WFRP4e Borderlands region generator (Renegade Crowns). Single ESM bundle (`src/wfrp4e-borderlands.mjs`).

## Commands

```bash
npm run build    # rollup --watch → foundry-path.js target
npm run release  # production bundle
npm test         # vitest unit tests (Node, stubs in tests/setup.mjs)
```

## Status

Build tooling, `/borderlands` command, `BorderlandsWizard` app, and the six-phase pipeline
(`src/generation/region.mjs`) are wired up. **All six phases are implemented. Geography,
Ancient Ruins, Princes, Relationships, and Settlements are manually verified in a live
Foundry world; Hazards is implemented but not yet manually verified** (see `PLAN.md` for all
six designs). Geography:
Table 1-1/1-2 rolls, radiating grid placement, Scene/Drawing painting via the interactive
`GeographyRoller` dialog. Ancient Ruins: Table 1-3..1-8 rolls via the generic one-shot
`runPhase` flow, ruins placed as scene `Note`s deep-linked to pages in a shared "`<Map
Name>` - Ancient Ruins" JournalEntry. Princes: Tables 1-3, 2-1..2-11 rolls via the generic
one-shot `runPhase` flow, `npc` Actors with linked Career/Skill/Talent Items (resolved
against the required `wfrp4e-core` module's compendiums) filed into a shared "`<Map
Name>`" Actor folder. Relationships: Tables 2-12..2-22 rolls via the generic one-shot
`runPhase` flow, two relationships per prince (randomly paired, repeats allowed) written up
into a shared "`<Map Name>` - Relationships" JournalEntry — one page **per prince**, mutual
natures (Alliance/Rivalry/War) on both princes' pages, one-directional natures on only the
feeling prince's page. Settlements: Tables 3-1..3-7 rolls via the generic one-shot
`runPhase` flow, one town (if rolled)/villages/homesteads per prince's principality plus
once more for the uncontrolled area, written into a shared "`<Map Name>` - Settlements"
JournalEntry — one page per prince plus one for the uncontrolled area, no scene placement at
all (placement preference included as text instead — the module has no record of which grid
cells belong to which principality). Hazards: Tables 4-1..4-12 rolls, GM-chosen lair count
(Few/Moderate/Many, prompted via a `DialogV2` before the generic one-shot `runPhase` flow
runs), one of four branches per lair (Chaos/Greenskin/Monster/Undead — Undead's Dead Lords
auto-generate a full Prince-style personality), written into a shared "`<Map Name>` -
Hazards" JournalEntry — one page per lair (no owner to key by, unlike Relationships/
Settlements), no scene placement at all (placement preference included as text instead, same
as Settlements). See `SPECS.md` for the rules process and table page references, and
`DEVELOPMENT.md`'s "Filling in a generation phase" section for the workflow.

## Settings

3 world-scope settings (`src/settings.mjs`, registered `Hooks.once("init")`): **Default Map
Size** (`defaultMapSize`, String "WxH", default `"20x20"` — `/borderlands`'s fallback when no
`mapSize=WxH` arg is given). **Ban Large Geography Regions** (`banLargeRegions`, Boolean,
default `false` — rerolls Table 1-1 results of 81-99 on maps under 500 squares, 91-99 on
500+, without bumping the running bonus). **Generate Names** (`generateNames`, Boolean,
default `true` — names every settlement using Appendix I's naming tables
(`tables/names.mjs`), biased 50% toward the owning prince's race-mapped cultural style, 10%
each toward the other 5; the uncontrolled area's settlements bias toward Flavourful, the
"native" style. Princes deliberately do **not** get a generated personal name — left to the
GM, per direction).

## Invariants

- `SPECS.md` is the source of truth for process order and table locations; `Renegade
  Crowns.pdf` is the copyrighted source book (gitignored — do not commit it).
- When reading the PDF, jump to specific table pages rather than reading the whole
  document — table descriptions usually continue onto the adjacent page.
- Region data is a single plain object (`createRegion()` in `region.mjs`) with one field
  per phase; each `generate*` function receives the region built so far and returns only
  the fields it produced. `runPhase` merges the result back in.
- Foundry min v13; uses ApplicationV2 API (see `src/apps/borderlands-wizard.mjs`).

## Entry point dispatch

`src/wfrp4e-borderlands.mjs` → `Hooks.once("setup")` registers `/borderlands` via
`game.wfrp4e.commands.add` → `commands/borderlands-command.mjs#handleBorderlandsCommand`
(GM check) → opens `apps/borderlands-wizard.mjs#BorderlandsWizard`.

## Docs

| File | Contents |
|------|----------|
| `SPECS.md` | Process summaries + table page locations (source of truth) |
| `docs/SOURCE-MAP.md` | All src files, exports, region data shape |
