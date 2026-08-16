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
  wfrp4e-borderlands.mjs      # entry point: registers settings (init) + /borderlands (setup)
  settings.mjs                # game.settings.register() — default map size, ban large
                               # regions, generate names
  commands/
    borderlands-command.mjs   # GM check, parses /borderlands args, opens the wizard
  apps/
    borderlands-wizard.mjs    # ApplicationV2 wizard stepping through the 6 phases
    geography-roller.mjs      # Geography's own interactive roll-and-paint dialog
    lair-style-dialog.mjs     # Hazards' GM-chosen Few/Moderate/Many prompt
  generation/
    region.mjs                # REGION_PHASES registry, region data shape, runPhase()
    geography.mjs  geography-grid.mjs  geography-scene.mjs
    geography-journal.mjs  geography-chat.mjs
    ruins.mjs  ruins-scene.mjs  ruins-chat.mjs
    princes.mjs  princes-actor.mjs  princes-chat.mjs
    relationships.mjs  relationships-journal.mjs  relationships-chat.mjs
    settlements.mjs  settlements-journal.mjs  settlements-chat.mjs
    hazards.mjs  hazards-journal.mjs  hazards-chat.mjs
    names.mjs                 # Appendix I place names, consumed by settlements.mjs
    journal-folder.mjs        # shared per-region JournalEntry folder
    map-size.mjs              # "WxH" parsing shared by the command and the setting
                               # Each phase splits into a *pure* file (rolls only, `Roll`
                               # is the only dependency, fully unit-tested) and one or more
                               # *-scene/-journal/-actor/-chat.mjs Foundry-effects files
                               # (Scene/JournalEntry/Actor/ChatMessage creation — not unit
                               # tested, see "Extending the module" below)
  tables/
    geography.mjs  ruins.mjs  princes.mjs  relationships.mjs
    settlements.mjs  hazards.mjs  names.mjs  race-conversion.mjs
                               # raw table data (band arrays + description dictionaries),
                               # one file per phase plus names.mjs (Appendix I)

templates/apps/               # Handlebars for the wizard + GeographyRoller
languages/en.json             # i18n
styles/wfrp4e-borderlands.css

tests/
  setup.mjs                   # global stubs for vitest unit tests, incl. a controllable Roll
  tables/                     # table-data coverage tests (band completeness, descriptions)
  generation/                 # roll-logic unit tests, one file per phase/concern

docs/
  SOURCE-MAP.md                # exhaustive source file map: every file, its exports, purpose
  DECISIONS.md                 # scannable list of every non-obvious/locked-in design call

SPECS.md                       # process summaries + table page locations (source of truth)
PLAN.md                        # full chronological design log, one section per phase — the
                               # detailed "why", written as each phase was built
Renegade Crowns.pdf            # source book — gitignored, copyrighted; obtain from publisher
Conversion_Rules.pdf           # 2e->4e WFRP conversion reference (Princes only) — also gitignored
```

## Extending the module

All six phases are implemented — most future work here is a bugfix, a house rule, a new
setting, or richer output for an existing phase, not a from-scratch phase build. A few
conventions carry across the whole codebase, worth knowing before changing anything:

- **Pure roll logic is separated from Foundry side effects.** Every `generation/<phase>.mjs`
  file's roll functions (`roll*`, `generate*`) only ever call `new Roll(formula).evaluate()`
  — no `game.*`/`Scene`/`JournalEntry`/`Actor` references — so they run and get unit-tested
  under plain Node with `tests/setup.mjs`'s stubbed `Roll`. Anything that touches a real
  Foundry document lives in a sibling `*-scene.mjs`/`*-journal.mjs`/`*-actor.mjs`/`*-chat.mjs`
  file instead, and is *not* unit tested (verified by hand in a live Foundry world instead).
  Keep new work on the correct side of that split.
- **A `game.settings` value is read once, at its single Foundry-side call site, and passed
  down as a plain parameter** into the pure functions below it (see `settings.mjs` and how
  `banLargeRegions`/`generateNames`/GM-chosen Hazards style all flow this way) — never call
  `game.settings.get`/`game.wfrp4e` from inside a pure roll function, or its tests will need
  a Foundry stub they don't currently have.
- **Table transcription: always double-check with `pdftotext -table`, not just `-layout`.**
  Several of this book's dense tables have rows that wrap onto a second line in `-layout`
  mode, silently shifting every entry below them by one band — this has bitten every phase
  at least once (see `docs/DECISIONS.md`'s "Table transcription" entries for the specific
  tables it hit). Cross-check a table's band widths sum to exactly 100 (or 10, for a 1d10
  table) as a mechanical sanity check before trusting a transcription.
- **`tests/setup.mjs`'s stubbed `Roll` ignores the formula string entirely** — `new
  Roll(anything).evaluate()` just returns the next value off `globalThis.__rollQueue` as
  `.total`. Queue the *final intended total*, not a "die value" you expect the stub to
  multiply or add to anything.
- For a brand new setting: register it in `settings.mjs`, read it at the one call site that
  needs it, thread it down as a parameter, add the `BORDERLANDS.Settings.*` i18n keys in
  `languages/en.json`.
- For a table/mechanic change (house rule or a genuine transcription fix): edit the relevant
  `tables/*.mjs` band array directly and leave an inline comment distinguishing "the book
  actually says X, changed to Y per direction" from "the book says Y, X was a transcription
  error" — future readers need to know which one it is before "fixing" it back.

See `docs/DECISIONS.md` for the accumulated judgment calls already made (so you don't
re-litigate one by accident), and `PLAN.md` if you need the full narrative behind one.

## Further reading

- [`SPECS.md`](SPECS.md) — the Renegade Crowns process summaries and table locations
- [`docs/SOURCE-MAP.md`](docs/SOURCE-MAP.md) — source files, exports, data shape
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — condensed reference of every locked-in design decision
- [`PLAN.md`](PLAN.md) — full chronological design log, phase by phase
- [`CLAUDE.md`](CLAUDE.md) — guidance for AI-assisted edits in this repo
