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

Orchestration and one module per SPECS.md process. Settlements and Hazards still throw
`"not yet implemented"` — see `SPECS.md` → Table locations when filling each in. Geography,
Ancient Ruins, Princes, and Relationships are implemented (PLAN.md).

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
| `princes.mjs` | `generatePrinces`, `rollPrinces`, `convertCharacteristics` | PRINCE GENERATION SUMMARY (Tables 1-3, 2-1..2-11). `rollPrinces`/`convertCharacteristics` are pure and unit-tested; `generatePrinces` is the `runPhase`-compatible orchestrator — doesn't require a Geography scene (princes aren't placed on it, unlike Ruins) |
| `princes-actor.mjs` | `getOrCreateActorFolder`, `createPrinceActor` | Creates the `npc` Actor per prince — linked Career/Skill/Talent Items resolved via wfrp4e's own `game.wfrp4e.utility.findExactName`/`findBaseName` (searches every compendium pack tagged with that item type, not just `wfrp4e-core`'s — this is what finds "Basic" skills like Stealth/Ride, which ship in the wfrp4e system's own pack), plus wfrp4e's standard Basic Skills set (`allBasicSkills()`, deduped against the prince's own resolved skills) so the NPC is easy to run at the table, filed into a shared "`<Map Name>`" Actor folder; `Actor.create(..., { skipItems: true })` suppresses wfrp4e's own "Add Basic Skills?" prompt, which would otherwise offer an undeduped copy of the same set — Foundry-side effects, not unit-tested per the Geography/Ruins precedent |
| `princes-chat.mjs` | `postPrincesSummary` | Posts the newly-generated princes (type/race/career/goal/principle/style/courtiers/principality per prince) to chat as a GM-only ("selfroll") message |
| `relationships.mjs` | `generateRelationships`, `rollRelationships`, `rollSingleRelationship`, `rollRelationshipCause`, `pickRandomPartner` | RELATIONS GENERATION SUMMARY (Tables 2-12..2-22). Two relationships per prince, each against an independently-chosen random other prince (self excluded, repeats allowed). `generateRelationships` is the `runPhase`-compatible orchestrator (throws if fewer than 2 princes exist); the rest are pure and unit-tested |
| `relationships-journal.mjs` | `createRelationshipsJournal` | Creates/updates "`<Map Name>` - Relationships" — one page **per prince** (not per relationship), each relationship rendered as a subsection naming the *other* prince. Alliance/Rivalry/War are mutual and appear on both princes' pages; every other nature is one prince's feeling *about* the other and appears only on the feeling prince's page, not their target's (`MUTUAL_RELATIONS`, `tables/relationships.mjs`). Pages are keyed by a `princeId` flag so a re-run rebuilds a prince's page in place instead of duplicating it — isolated from the pure logic above so that stays unit-testable |
| `relationships-chat.mjs` | `postRelationshipsSummary` | Posts the newly-generated relationships (nature/length/cause per pair) to chat as a GM-only ("selfroll") message |
| `settlements.mjs` | `generateSettlements` | COMMUNITIES SUMMARY (Tables 3-1, 3-2) |
| `hazards.mjs` | `generateHazards` | HAZARDS SUMMARY (Tables 4-1..4-12) |

## src/tables/

| File | Exports | Purpose |
|------|---------|---------|
| `geography.mjs` | `GEOGRAPHY_TABLE`, `SPECIAL_FEATURES_TABLE`, `TERRAIN_DESCRIPTIONS`, `VEGETATION_DESCRIPTIONS`, `FEATURE_COLORS` | Table 1-1 / 1-2 data, transcribed from the PDF (`pdftotext -table`) and cross-checked against the book's own row pattern; `FEATURE_COLORS` maps each terrain/special-feature name to its Drawing fill color |
| `ruins.mjs` | `lookupBand`, `RUIN_COUNT_TABLE`, `RUIN_TYPE_TABLE`, `ANCIENT_MENACES_TABLE`, `ORIGINAL_PURPOSE_TABLE`, `REASON_FOR_RUINS_TABLE`, `AGE_OF_RUINS_TABLE`, `RUIN_TYPE_DESCRIPTIONS`, `MENACE_DESCRIPTIONS`, `PURPOSE_DESCRIPTIONS`, `REASON_DESCRIPTIONS` | Tables 1-3..1-8 data (band-range tables, not dense 1-100 arrays); every column of the 1-5/1-7 matrices sums to exactly 100, confirming the transcription |
| `princes.mjs` | `PRINCE_TYPE_TABLE`, `PRINCE_TYPES`, `RACE_TABLE`, `isImpossibleRaceType`, `CAREER_STAGE_LEVEL_TABLE`, `CAREER_STAGE_PROGRESS_TABLE`, `GOAL_TABLE`, `PRINCIPLES_TABLE`, `STYLE_TABLE`, `SECRETS_TABLE`, `QUIRKS_TABLE`, `COURTIERS_TABLE`, `TITLE_TABLE` | Tables 2-1..2-11 data. `PRINCE_TYPES`' 7 example statblocks are hand-converted to 4e once here (career/skills/talents already 4e names) using `Conversion_Rules.pdf` as a one-time reference — see PLAN.md for why this isn't a runtime lookup. `TITLE_TABLE`'s bands were corrected from a `-layout` row-shift misprint, confirmed with `-table` mode |
| `race-conversion.mjs` | `NEW_CHARACTERISTIC_DICE` | Just the Initiative/Dexterity generation dice (2e has neither) — race conversion is otherwise unused: princes are NPCs, and race stays narrative flavor rather than adjusting characteristics, per direction |
| `relationships.mjs` | `DIPLOMATIC_RELATIONS_TABLE`, `RELATION_DESCRIPTIONS`, `MUTUAL_RELATIONS`, `LENGTH_OF_RELATIONS_TABLE`, `ALLIANCE_ORIGIN_TABLE`, `ALLIANCE_ORIGIN_DESCRIPTIONS`, `BITTERNESS_CAUSE_TABLE`, `CONTEMPT_CAUSE_TABLE`, `ENVY_CAUSE_TABLE`, `FEAR_CAUSE_TABLE`, `HATRED_CAUSE_TABLE`, `RESPECT_CAUSE_TABLE`, `VENGEANCE_CAUSE_TABLE`, `*_CAUSE_DESCRIPTIONS` (one per nature above), `WAR_CAUSE_TABLE`, `WAR_CAUSE_DESCRIPTIONS`, `CAUSE_TABLES`, `CAUSE_DESCRIPTIONS` | Tables 2-12..2-22 data. `MUTUAL_RELATIONS` (`["Alliance", "Rivalry", "War"]`) flags which natures describe the pair mutually vs. one prince's one-directional feeling about the other — consumed by `relationships-journal.mjs` to decide which prince's page a relationship appears on. Every d10 cause table (2-15..2-21) was re-verified with `pdftotext -table` after `-layout` mode row-shifted them by one band — the same misprint pattern already seen in Table 1-1 and Table 2-11. `CAUSE_TABLES`/`CAUSE_DESCRIPTIONS` key by Table 2-12's relation name for dispatch; Rivalry and War are deliberately absent (Rivalry has no cause table at all; War uses `WAR_CAUSE_TABLE` directly and redirects into another nature's table — see `generation/relationships.mjs`) |

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
    actorFolderId: null,
    geography: { sceneId: null, sceneName: "Borderlands", mapSize: { width: 20, height: 20 }, journalId: null, log: [], stoppedReason: null },
    ruins: { journalId: null, entries: [] },
    princes: { entries: [] },
    relationships: { journalId: null, entries: [] },
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

`region.princes.entries` accumulates one object per prince (`{ type, race, characteristics,
career, priorCareers, skills, talents, guidanceNotes, armour, weapons, trappings,
careerLevel, careerProgress, goal, principle, style, secrets, quirks, courtiers, title,
principalitySize }`) each time Princes runs; `region.actorFolderId` points at the shared
"`<Map Name>`" Actor folder (separate from `region.journalFolderId` — Folders are typed per
document type in Foundry). `race` is narrative flavor only (recorded on the Actor's species
field) and doesn't feed `characteristics` — princes are NPCs, not PCs, so there's no
per-race stat conversion, only Table 2-1's baseline plus freshly-rolled Initiative/Dexterity.

`region.relationships.entries` accumulates one object per relationship (`{ princeAId,
princeBId, nature, length, cause }`, using each prince's Actor id rather than an array
index, so entries stay valid even if `region.princes.entries` gets reordered) each time
Relationships runs — two per prince, each against an independently-chosen random other
prince (self excluded, repeats allowed across a prince's own two rolls and across other
princes' rolls). `cause`'s shape depends on `nature`: `null` for Rivalry (no cause table),
`{ origins: [...] }` for Alliance (1 entry normally, 2 for a 10+ year alliance, 3 for a
25+ year one), `{ causeOfWar, underlyingNature?, underlyingCause? }` for War (Conquest has
no underlying cause; Envy/Fear/Hatred/Vengeance redirect into that nature's own table), and
a plain cause string for every other nature. `region.relationships.journalId` points at the
shared "`<Map Name>` - Relationships" JournalEntry, reused (new pages appended) on repeat
runs rather than recreated.

For the remaining two phases: each `generate*` function receives the region built so far
(so later phases can react to earlier results) and returns the fields it produced;
`runPhase` merges the result back into the region object in place.
