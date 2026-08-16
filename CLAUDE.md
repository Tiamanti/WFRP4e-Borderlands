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
(`src/generation/region.mjs`) are wired up. **Geography, Ancient Ruins, and Princes are
implemented** (see `PLAN.md` for all three designs). Geography: Table 1-1/1-2 rolls,
radiating grid placement, Scene/Drawing painting via the interactive `GeographyRoller`
dialog. Ancient Ruins: Table 1-3..1-8 rolls via the generic one-shot `runPhase` flow, ruins
placed as scene `Note`s deep-linked to pages in a shared "`<Map Name>` - Ancient Ruins"
JournalEntry. Princes: Tables 1-3, 2-1..2-11 rolls via the generic one-shot `runPhase`
flow, `npc` Actors with linked Career/Skill/Talent Items (resolved against the required
`wfrp4e-core` module's compendiums) filed into a shared "`<Map Name>`" Actor folder —
**implemented but not yet manually verified in a live Foundry world** (no local install to
test compendium resolution against), see PLAN.md's Princes section for open questions.
The remaining three phase generators (`relationships.mjs`, `settlements.mjs`,
`hazards.mjs`) still throw `"not yet implemented"`. See `SPECS.md` for the rules process
and table page references, and `DEVELOPMENT.md`'s "Filling in a generation phase" section
for the workflow — each remaining phase gets its own `PLAN.md`-style design pass before
it's built, the same way Geography, Ancient Ruins, and Princes did.

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
