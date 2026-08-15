# CLAUDE.md

Module: WFRP4e Borderlands region generator (Renegade Crowns). Single ESM bundle (`src/wfrp4e-borderlands.mjs`).

## Commands

```bash
npm run build    # rollup --watch → foundry-path.js target
npm run release  # production bundle
npm test         # vitest unit tests (Node, stubs in tests/setup.mjs)
```

## Status

Scaffold stage: build tooling, `/borderlands` command, `BorderlandsWizard` app, and the
six-phase pipeline (`src/generation/region.mjs`) are wired up. Each phase generator
(`geography.mjs`, `ruins.mjs`, `princes.mjs`, `relationships.mjs`, `settlements.mjs`,
`hazards.mjs`) currently throws `"not yet implemented"` — the table rolls themselves are
not yet built. See `SPECS.md` for the rules process and table page references, and
`DEVELOPMENT.md`'s "Filling in a generation phase" section for the workflow.

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
