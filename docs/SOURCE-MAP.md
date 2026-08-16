# Source Map

## Entry point

`src/wfrp4e-borderlands.mjs` — registers the `/borderlands` command (`Hooks.once("setup")`).

## src/commands/

| File | Exports | Purpose |
|------|---------|---------|
| `borderlands-command.mjs` | `handleBorderlandsCommand` | GM check, parses `/borderlands [sceneName] [mapSize=WxH]` args, opens `BorderlandsWizard` |

## src/apps/

| File | Exports | Purpose |
|------|---------|---------|
| `borderlands-wizard.mjs` | `BorderlandsWizard` (default) | ApplicationV2 wizard stepping through the six phases in `REGION_PHASES`; special-cases Geography to open `GeographyRoller` instead of the generic `runPhase` flow |
| `geography-roller.mjs` | `GeographyRoller` (default) | Interactive Table 1-1/1-2 roller — rolls, paints the result onto the Geography Scene, tracks running bonus/grid-full state (PLAN.md §5) |

## src/generation/

Orchestration and one module per SPECS.md process. Princes, Relationships, Settlements
and Hazards still throw `"not yet implemented"` — see `SPECS.md` → Table locations when
filling each in. Geography and Ancient Ruins are implemented (PLAN.md).

| File | Exports | SPECS.md process |
|------|---------|-------------------|
| `region.mjs` | `REGION_PHASES`, `createRegion`, `runPhase`, `isPhaseDone` | phase registry + region data shape; `isPhaseDone` centralizes each phase's "has this produced anything yet" check for the wizard's checklist |
| `geography.mjs` | `rollGeographyStep`, `rollSpecialFeature`, `generateGeography` | GEOGRAPHY PROCESS rolls (Tables 1-1, 1-2). `generateGeography` just throws, pointing at `GeographyRoller` — geography is an interactive loop, not a one-shot `runPhase` call |
| `geography-grid.mjs` | `createGrid`, `claimNextCells`, `isGridFull` | Pure grid-cell placement math (radiating fill from top-left), no Foundry dependency |
| `geography-scene.mjs` | `createGeographyScene`, `placeCellLabels` | Foundry `Scene`/`Drawing` creation (zero scene padding, per-terrain `Drawing` fill color from `FEATURE_COLORS`) — isolated from the pure logic above so that stays unit-testable |
| `geography-chat.mjs` | `postGeographySummary` | Posts the roll log to chat (same "Label — N squares (total)" / "River (total)" lines as the roller window) as a GM-only ("selfroll") message when the GM clicks End Phase |
| `geography-journal.mjs` | `createGeographyJournal`, `collectFeatureDescriptions` | Creates "`<Map Name>` - Geography" (one page, one paragraph per unique terrain/river/special feature rolled, using its book description) when the GM clicks End Phase |
| `journal-folder.mjs` | `getOrCreateJournalFolder` | Creates/reuses the shared "`<Map Name>`" JournalEntry folder every phase's journals get filed into (`region.journalFolderId`) |
| `map-size.mjs` | `parseMapSize`, `DEFAULT_MAP_SIZE` | Parses the `/borderlands` command's `mapSize=WxH` arg, defaulting to 20x20 |
| `ruins.mjs` | `generateAncientRuins`, `rollAncientRuins`, `rollOriginalPurpose`, `rollSuggestedAge`, `pickRandomCell` | ANCIENT RUINS PROCESS rolls (Tables 1-3..1-8). `generateAncientRuins` is the `runPhase`-compatible orchestrator (throws if Geography hasn't created a scene yet); the rest are pure and unit-tested |
| `ruins-scene.mjs` | `createRuinsJournal`, `placeRuinNotes` | Creates/appends to "`<Map Name>` - Ancient Ruins" (one page per ruin) and pins a scene `Note` per ruin, deep-linked to its page — isolated from the pure logic above so that stays unit-testable |
| `ruins-chat.mjs` | `postRuinsSummary` | Posts the newly-generated ruins (type/menace/purpose/reason/age/cell per ruin) to chat as a GM-only ("selfroll") message |
| `princes.mjs` | `generatePrinces` | PRINCE GENERATION SUMMARY (Tables 1-3, 2-1..2-11) |
| `relationships.mjs` | `generateRelationships` | RELATIONS GENERATION SUMMARY (Tables 2-12..2-22) |
| `settlements.mjs` | `generateSettlements` | COMMUNITIES SUMMARY (Tables 3-1, 3-2) |
| `hazards.mjs` | `generateHazards` | HAZARDS SUMMARY (Tables 4-1..4-12) |

## src/tables/

| File | Exports | Purpose |
|------|---------|---------|
| `geography.mjs` | `GEOGRAPHY_TABLE`, `SPECIAL_FEATURES_TABLE`, `TERRAIN_DESCRIPTIONS`, `VEGETATION_DESCRIPTIONS`, `FEATURE_COLORS` | Table 1-1 / 1-2 data, transcribed from the PDF (`pdftotext -table`) and cross-checked against the book's own row pattern; `FEATURE_COLORS` maps each terrain/special-feature name to its Drawing fill color |
| `ruins.mjs` | `lookupBand`, `RUIN_COUNT_TABLE`, `RUIN_TYPE_TABLE`, `ANCIENT_MENACES_TABLE`, `ORIGINAL_PURPOSE_TABLE`, `REASON_FOR_RUINS_TABLE`, `AGE_OF_RUINS_TABLE`, `RUIN_TYPE_DESCRIPTIONS`, `MENACE_DESCRIPTIONS`, `PURPOSE_DESCRIPTIONS`, `REASON_DESCRIPTIONS` | Tables 1-3..1-8 data (band-range tables, not dense 1-100 arrays); every column of the 1-5/1-7 matrices sums to exactly 100, confirming the transcription |

## templates/

- `apps/borderlands-wizard.hbs` — phase list with a "Roll" button per phase.
- `apps/geography-roller.hbs` — running bonus/status, roll log, Roll Next / End Phase buttons.

Ancient Ruins has no template of its own — its journal pages are built as static HTML
strings in `ruins-scene.mjs` (written once at creation time, never re-rendered).

## Data model

`createRegion()` returns:

```js
{
    journalFolderId: null,
    geography: { sceneId: null, sceneName: "Borderlands", mapSize: { width: 20, height: 20 }, journalId: null, log: [], stoppedReason: null },
    ruins: { journalId: null, entries: [] },
    princes: [],
    relationships: [],
    settlements: [],
    hazards: [],
}
```

`createRegion({ sceneName, mapSize })` accepts overrides — this is how the `/borderlands`
command's optional `sceneName`/`mapSize=WxH` args reach the generated Scene.
`region.geography.log` accumulates one entry per roll (`{ roll, bonus, total, type, ...,
cells }`, `cells` being the grid squares that roll claimed — `[]` for rivers, which are
logged only and never painted onto the Scene). `region.geography.sceneId` points at the
`Scene` document `GeographyRoller` creates on the first roll. Each new roll's cells radiate
outward from the current top-left *available* square (not the fixed corner), so every
feature grows as its own blob from the map's frontier — see `geography-grid.mjs`.
`region.journalFolderId` and `region.geography.journalId` are set when End Phase creates
the shared "`<Map Name>`" folder and the "`<Map Name>` - Geography" JournalEntry inside it.

`region.ruins.entries` accumulates one object per ruin (`{ type, menace, purpose, reason,
age, cell }` — `purpose` is an array, length 2 only for Oddity ruins) each time Ancient
Ruins runs; `region.ruins.journalId` points at the shared "`<Map Name>` - Ancient Ruins"
JournalEntry, reused (new pages appended) on repeat runs rather than recreated.

For the remaining four phases: each `generate*` function receives the region built so far
(so later phases can react to earlier results — e.g. relationships need `region.princes`)
and returns the fields it produced; `runPhase` merges the result back into the region
object in place.
