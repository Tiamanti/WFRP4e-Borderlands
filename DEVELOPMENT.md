# Development

How to build and test this module locally.

## First-time setup

```bash
npm install

cp foundry-path.example.js foundry-path.js
# edit foundry-path.js to point at <FoundryData>/Data/modules/wfrp4e-borderlands
```

`foundry-path.js` is gitignored — it tells the rollup config where to write the built module so Foundry picks it up.

## Watch mode (dev loop)

```bash
npm run build
```

Rollup watches `src/`, `module.json`, `languages/`, `styles/`, and `templates/` and re-syncs the bundle plus assets to the path returned by `foundry-path.js`. Reload Foundry to pick up the new bundle.

## Production release

```bash
npm run release
```

One-shot production bundle (no watch).

## Tests

Vitest, Node environment, Foundry globals stubbed in `tests/setup.mjs`.

```bash
npm test                                       # run all
npm run test:watch                             # watch mode
npx vitest run tests/generation/region.test.mjs # one file
```

## Project layout

```
src/
  wfrp4e-borderlands.mjs      # entry point: registers /borderlands
  commands/
    borderlands-command.mjs   # GM check, opens the wizard
  apps/
    borderlands-wizard.mjs    # ApplicationV2 wizard stepping through the 6 phases
  generation/
    region.mjs                # REGION_PHASES registry, region data shape, runPhase()
    geography.mjs              ruins.mjs              princes.mjs
    relationships.mjs          settlements.mjs        hazards.mjs
                               # one stub per SPECS.md process, to be filled in from
                               # the table data referenced there

templates/apps/               # Handlebars for the wizard
languages/en.json             # i18n
styles/wfrp4e-borderlands.css

tests/
  setup.mjs                   # global stubs for vitest unit tests
  generation/                 # unit tests, one file per concern

docs/
  SOURCE-MAP.md                # source file map, exports, data shape

SPECS.md                       # process summaries + table locations (source of truth)
Renegade Crowns.pdf            # source book — gitignored, copyrighted; obtain from publisher
```

## Filling in a generation phase

Each `src/generation/*.mjs` file currently throws `"not yet implemented"`. To implement one:

1. Read the relevant SPECS.md process section and its table page numbers (PDF page = book page + 2).
2. Pull the table contents from `Renegade Crowns.pdf` for just those pages — don't read the whole book.
3. Encode the table(s) as data (a `src/tables/*.mjs` module is a reasonable place for raw table rows) and implement the roll logic in the phase file.
4. Update `region.mjs`'s JSDoc / `createRegion()` shape if the phase's output fields change.
5. Add unit tests under `tests/generation/`.

## Further reading

- [`SPECS.md`](SPECS.md) — the Renegade Crowns process summaries and table locations
- [`docs/SOURCE-MAP.md`](docs/SOURCE-MAP.md) — source files, exports, data shape
- [`CLAUDE.md`](CLAUDE.md) — guidance for AI-assisted edits in this repo
