# Source Map

## Entry point

`src/wfrp4e-borderlands.mjs` — registers the `/borderlands` command (`Hooks.once("setup")`).

## src/commands/

| File | Exports | Purpose |
|------|---------|---------|
| `borderlands-command.mjs` | `handleBorderlandsCommand` | GM check, opens `BorderlandsWizard` |

## src/apps/

| File | Exports | Purpose |
|------|---------|---------|
| `borderlands-wizard.mjs` | `BorderlandsWizard` (default) | ApplicationV2 wizard stepping through the six phases in `REGION_PHASES`; special-cases Geography to open `GeographyRoller` instead of the generic `runPhase` flow |
| `geography-roller.mjs` | `GeographyRoller` (default) | Interactive Table 1-1/1-2 roller — rolls, paints the result onto the Geography Scene, tracks running bonus/grid-full state (PLAN.md §5) |

## src/generation/

Orchestration and one module per SPECS.md process. Ruins, Princes, Relationships,
Settlements and Hazards still throw `"not yet implemented"` — see `SPECS.md` → Table
locations when filling each in. Geography is implemented (PLAN.md).

| File | Exports | SPECS.md process |
|------|---------|-------------------|
| `region.mjs` | `REGION_PHASES`, `createRegion`, `runPhase` | phase registry + region data shape |
| `geography.mjs` | `rollGeographyStep`, `rollSpecialFeature`, `generateGeography` | GEOGRAPHY PROCESS rolls (Tables 1-1, 1-2). `generateGeography` just throws, pointing at `GeographyRoller` — geography is an interactive loop, not a one-shot `runPhase` call |
| `geography-grid.mjs` | `createGrid`, `claimNextCells`, `isGridFull` | Pure grid-cell placement math (radiating fill from top-left), no Foundry dependency |
| `geography-scene.mjs` | `createGeographyScene`, `placeCellLabels` | Foundry `Scene`/`Drawing` creation — isolated from the pure logic above so that stays unit-testable |
| `ruins.mjs` | `generateAncientRuins` | ANCIENT RUINS PROCESS (Tables 1-3..1-8) |
| `princes.mjs` | `generatePrinces` | PRINCE GENERATION SUMMARY (Tables 1-3, 2-1..2-11) |
| `relationships.mjs` | `generateRelationships` | RELATIONS GENERATION SUMMARY (Tables 2-12..2-22) |
| `settlements.mjs` | `generateSettlements` | COMMUNITIES SUMMARY (Tables 3-1, 3-2) |
| `hazards.mjs` | `generateHazards` | HAZARDS SUMMARY (Tables 4-1..4-12) |

## src/tables/

| File | Exports | Purpose |
|------|---------|---------|
| `geography.mjs` | `GEOGRAPHY_TABLE`, `SPECIAL_FEATURES_TABLE`, `TERRAIN_DESCRIPTIONS`, `VEGETATION_DESCRIPTIONS` | Table 1-1 / 1-2 data, transcribed from the PDF (`pdftotext -table`) and cross-checked against the book's own row pattern |

## templates/

- `apps/borderlands-wizard.hbs` — phase list with a "Roll" button per phase.
- `apps/geography-roller.hbs` — running bonus/status, roll log, Roll Next / End Phase buttons.

## Data model

`createRegion()` returns:

```js
{
    geography: { sceneId: null, mapSize: { width: 20, height: 20 }, log: [], stoppedReason: null },
    ruins: [],
    princes: [],
    relationships: [],
    settlements: [],
    hazards: [],
}
```

`region.geography.log` accumulates one entry per roll (`{ roll, bonus, total, type, ...,
cells }`, `cells` being the grid squares that roll claimed — `[]` for rivers, which are
logged only and never painted onto the Scene). `region.geography.sceneId` points at the
`Scene` document `GeographyRoller` creates on the first roll.

For the other five phases: each `generate*` function receives the region built so far (so
later phases can react to earlier results — e.g. relationships need `region.princes`) and
returns the fields it produced; `runPhase` merges the result back into the region object
in place.
