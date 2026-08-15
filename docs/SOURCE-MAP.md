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
| `borderlands-wizard.mjs` | `BorderlandsWizard` (default) | ApplicationV2 wizard stepping through the six phases in `REGION_PHASES` |

## src/generation/

Orchestration and one module per SPECS.md process. All generator functions currently
throw `"not yet implemented"` — they're wired into the wizard but need their table data
(see `SPECS.md` → Table locations) filled in.

| File | Exports | SPECS.md process |
|------|---------|-------------------|
| `region.mjs` | `REGION_PHASES`, `createRegion`, `runPhase` | phase registry + region data shape |
| `geography.mjs` | `generateGeography` | GEOGRAPHY PROCESS (Tables 1-1, 1-2) |
| `ruins.mjs` | `generateAncientRuins` | ANCIENT RUINS PROCESS (Tables 1-3..1-8) |
| `princes.mjs` | `generatePrinces` | PRINCE GENERATION SUMMARY (Tables 1-3, 2-1..2-11) |
| `relationships.mjs` | `generateRelationships` | RELATIONS GENERATION SUMMARY (Tables 2-12..2-22) |
| `settlements.mjs` | `generateSettlements` | COMMUNITIES SUMMARY (Tables 3-1, 3-2) |
| `hazards.mjs` | `generateHazards` | HAZARDS SUMMARY (Tables 4-1..4-12) |

## templates/

`apps/borderlands-wizard.hbs` — phase list with a "Roll" button per phase.

## Data model

`createRegion()` returns:

```js
{
    geography: { features: [], rivers: [] },
    ruins: [],
    princes: [],
    relationships: [],
    settlements: [],
    hazards: [],
}
```

Each `generate*` function receives the region built so far (so later phases can react to
earlier results — e.g. relationships need `region.princes`) and returns the fields it
produced; `runPhase` merges the result back into the region object in place.
