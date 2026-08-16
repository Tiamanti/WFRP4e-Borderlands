# Source Map

## Entry point

`src/wfrp4e-borderlands.mjs` — registers the module's 3 settings (`Hooks.once("init")`) and
the `/borderlands` command (`Hooks.once("setup")`).

## src/settings.mjs

`MODULE_ID`, `SETTINGS` (key names), `registerSettings` — 3 world-scope settings:
`defaultMapSize` (String, "WxH", default `"20x20"` — read by `borderlands-command.mjs` as
`parseMapSize`'s fallback when no `mapSize=WxH` arg is given), `banLargeRegions` (Boolean,
default `false` — read by `apps/geography-roller.mjs`, passed into `rollGeographyStep`),
`generateNames` (Boolean, default `true` — read by `generation/settlements.mjs`, gates
`generation/names.mjs`'s calls). Every setting is read at its one Foundry-side call site and
threaded down as a plain parameter into the pure roll functions below it, so those stay
unit-testable without a `game.settings` stub — same pattern Hazards' GM-chosen lair style
uses for `generateHazards(region, style)`.

## src/commands/

| File | Exports | Purpose |
|------|---------|---------|
| `borderlands-command.mjs` | `handleBorderlandsCommand` | GM check, parses `/borderlands [sceneName] [mapSize=WxH]` args (falling back to the `defaultMapSize` setting, itself parsed the same way, when no `mapSize=WxH` arg is given), opens `BorderlandsWizard` |

## src/apps/

| File | Exports | Purpose |
|------|---------|---------|
| `borderlands-wizard.mjs` | `BorderlandsWizard` (default) | ApplicationV2 wizard stepping through the six phases in `REGION_PHASES`; special-cases Geography to open `GeographyRoller`, and Hazards to open `promptLairStyle()` first, instead of the generic `runPhase` flow |
| `geography-roller.mjs` | `GeographyRoller` (default) | Interactive Table 1-1/1-2 roller — rolls, paints the result onto the Geography Scene, tracks running bonus/grid-full state (PLAN.md §5). Reads the "Ban Large Geography Regions" setting and the region's own `mapSize` each roll, passing both into `rollGeographyStep` |
| `lair-style-dialog.mjs` | `promptLairStyle` | `DialogV2` Few/Moderate/Many prompt for Table 4-1's GM-chosen campaign style — resolves to `"few"`/`"moderate"`/`"many"`, or `undefined` if dismissed |

## src/generation/

Orchestration and one module per SPECS.md process. All six phases are implemented
(PLAN.md).

| File | Exports | SPECS.md process |
|------|---------|-------------------|
| `region.mjs` | `REGION_PHASES`, `createRegion`, `runPhase`, `isPhaseDone` | phase registry + region data shape; `isPhaseDone` centralizes each phase's "has this produced anything yet" check for the wizard's checklist |
| `geography.mjs` | `rollGeographyStep`, `rollSpecialFeature`, `generateGeography` | GEOGRAPHY PROCESS rolls (Tables 1-1, 1-2). `generateGeography` just throws, pointing at `GeographyRoller` — geography is an interactive loop, not a one-shot `runPhase` call. `rollGeographyStep` optionally rerolls a banned Table 1-1 total (the "Ban Large Geography Regions" setting) before proceeding — 81-99 on a map under 500 squares, 91-99 on 500+ — capped at 20 attempts as a safety net; the discarded rolls never bump the running bonus |
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
| `settlements.mjs` | `generateSettlements`, `rollTownCheck`, `rollVillageCount`, `rollHomesteadCount`, `rollEconomicResourceDetail`, `rollCommunityFeatures`, `rollSettlement`, `rollOwnerSettlements` | COMMUNITIES SUMMARY (Tables 3-1..3-7). Generated once per prince's principality plus once for the uncontrolled area (`ownerId: null`). `rollCommunityFeatures` resolves Table 3-2's full recursive chain (Chokepoint's one bonus reroll, Special's Table 3-7 dispatch including its own Roll Twice recursion and a town's Monastery result redirecting to the next village/homestead via `onMonasteryForTown`) into every feature it actually produces, not just one; a town's economic resources are topped up to its population-based minimum on top of whatever that chain already rolled. When the "Generate Names" setting is on, `generateSettlements` also rolls each prince's naming style (`names.mjs`'s `rollNamingStyleForRace`, from their race) and threads it into every one of that prince's settlements as `ownerStyle`, so `rollSettlement` can roll a `name` (`rollSettlement`/`rollOwnerSettlements` both default `generateNames` to `false` for their own testability — the setting's `true` default is enforced by `generateSettlements` reading it and passing it through explicitly). `generateSettlements` is the `runPhase`-compatible orchestrator (throws if the Princes phase hasn't run); the rest are pure and unit-tested |
| `settlements-journal.mjs` | `createSettlementsJournal` | Creates/updates "`<Map Name>` - Settlements" — one page **per prince plus one for the uncontrolled area** (mirrors `relationships-journal.mjs`'s per-prince pattern), settlements on each page sorted largest-population-first (so a Town, when one exists, always leads), each rendered as a subsection with its features and the book's placement-preference text (no scene `Note`s — settlements are journal-only, see PLAN.md). Pages are keyed by an `ownerId` flag so a re-run rebuilds an owner's page in place instead of duplicating it — isolated from the pure logic above so that stays unit-testable |
| `settlements-chat.mjs` | `postSettlementsSummary` | Posts the newly-generated settlements (tier/owner/population/Stronghold/feature count per settlement) to chat as a GM-only ("selfroll") message |
| `hazards.mjs` | `generateHazards`, `rollLairs`, `rollLair`, `rollNumberOfLairs`, `rollMonsterType`, `rollChaosLair`, `rollGreenskinLair`, `rollMonsterLair`, `rollShamblingHorde`, `rollUndeadLair` | HAZARDS SUMMARY (Tables 4-1..4-12). Table 4-1's lair count is GM-chosen (Few/Moderate/Many via `apps/lair-style-dialog.mjs`), not random — `generateHazards` throws if no style is passed. Dispatches every lair into one of four branches (Chaos/Greenskin/Monster/Undead); Chaos derives Table 4-5's followers row directly from Table 4-3's own modifier rather than an independent roll, Greenskin retries an all-zero roll and rolls a Table 1-2 raiding area past 1000 total (reusing `geography.mjs`'s `rollSpecialFeature`), Undead's Dead Lords auto-generate a full Prince-style personality (reusing `princes.mjs`'s `rollSecrets`/`rollQuirks`) plus a Shambling Horde of servants, and standalone Shambling Hordes (Table 4-12) start on a random column and roll exactly once per column in wrap-around order under a shared cumulative modifier. `generateHazards` is the `runPhase`-compatible orchestrator; the rest are pure and unit-tested |
| `hazards-journal.mjs` | `createHazardsJournal` | Creates/appends to "`<Map Name>` - Hazards" — one page **per lair** (matches `ruins-scene.mjs`'s pattern, not the per-owner pattern — a lair has no natural owner), each page naming its type/leader/monster/undead-kind and the book's placement guidance as text (no scene placement at all, per PLAN.md's locked-in "journal-only" decision) — isolated from the pure logic above so that stays unit-testable |
| `hazards-chat.mjs` | `postHazardsSummary` | Posts the newly-generated lairs (type and a short description per lair) to chat as a GM-only ("selfroll") message |
| `names.mjs` | `rollNamingStyleForRace`, `rollSettlementNamingStyle`, `rollPlaceName`, `rollSettlementName` | Appendix I: Border Prince Names (Tables A-1..A-12) — place names only; Princes deliberately don't get a generated personal name at all, per direction (left to the GM). `rollSettlementNamingStyle` biases 50% toward the settlement's `ownerStyle` (or `"Flavourful"` when there's no owner — the uncontrolled area), 10% each toward the other 5 styles. Consumed only by `settlements.mjs`, gated behind the "Generate Names" setting |

## src/tables/

| File | Exports | Purpose |
|------|---------|---------|
| `geography.mjs` | `GEOGRAPHY_TABLE`, `SPECIAL_FEATURES_TABLE`, `TERRAIN_DESCRIPTIONS`, `VEGETATION_DESCRIPTIONS`, `FEATURE_COLORS` | Table 1-1 / 1-2 data, transcribed from the PDF (`pdftotext -table`) and cross-checked against the book's own row pattern; `FEATURE_COLORS` maps each terrain/special-feature name to its Drawing fill color |
| `ruins.mjs` | `lookupBand`, `RUIN_COUNT_TABLE`, `RUIN_TYPE_TABLE`, `ANCIENT_MENACES_TABLE`, `ORIGINAL_PURPOSE_TABLE`, `REASON_FOR_RUINS_TABLE`, `AGE_OF_RUINS_TABLE`, `RUIN_TYPE_DESCRIPTIONS`, `MENACE_DESCRIPTIONS`, `PURPOSE_DESCRIPTIONS`, `REASON_DESCRIPTIONS` | Tables 1-3..1-8 data (band-range tables, not dense 1-100 arrays); every column of the 1-5/1-7 matrices sums to exactly 100, confirming the transcription |
| `princes.mjs` | `PRINCE_TYPE_TABLE`, `PRINCE_TYPES`, `RACE_TABLE`, `isImpossibleRaceType`, `CAREER_STAGE_LEVEL_TABLE`, `CAREER_STAGE_PROGRESS_TABLE`, `GOAL_TABLE`, `PRINCIPLES_TABLE`, `STYLE_TABLE`, `SECRETS_TABLE`, `QUIRKS_TABLE`, `COURTIERS_TABLE`, `TITLE_TABLE` | Tables 2-1..2-11 data. `PRINCE_TYPES`' 7 example statblocks are hand-converted to 4e once here (career/skills/talents already 4e names) using `Conversion_Rules.pdf` as a one-time reference — see PLAN.md for why this isn't a runtime lookup. `TITLE_TABLE`'s bands were corrected from a `-layout` row-shift misprint, confirmed with `-table` mode |
| `race-conversion.mjs` | `NEW_CHARACTERISTIC_DICE` | Just the Initiative/Dexterity generation dice (2e has neither) — race conversion is otherwise unused: princes are NPCs, and race stays narrative flavor rather than adjusting characteristics, per direction |
| `relationships.mjs` | `DIPLOMATIC_RELATIONS_TABLE`, `RELATION_DESCRIPTIONS`, `MUTUAL_RELATIONS`, `LENGTH_OF_RELATIONS_TABLE`, `ALLIANCE_ORIGIN_TABLE`, `ALLIANCE_ORIGIN_DESCRIPTIONS`, `BITTERNESS_CAUSE_TABLE`, `CONTEMPT_CAUSE_TABLE`, `ENVY_CAUSE_TABLE`, `FEAR_CAUSE_TABLE`, `HATRED_CAUSE_TABLE`, `RESPECT_CAUSE_TABLE`, `VENGEANCE_CAUSE_TABLE`, `*_CAUSE_DESCRIPTIONS` (one per nature above), `WAR_CAUSE_TABLE`, `WAR_CAUSE_DESCRIPTIONS`, `CAUSE_TABLES`, `CAUSE_DESCRIPTIONS` | Tables 2-12..2-22 data. `MUTUAL_RELATIONS` (`["Alliance", "Rivalry", "War"]`) flags which natures describe the pair mutually vs. one prince's one-directional feeling about the other — consumed by `relationships-journal.mjs` to decide which prince's page a relationship appears on. Every d10 cause table (2-15..2-21) was re-verified with `pdftotext -table` after `-layout` mode row-shifted them by one band — the same misprint pattern already seen in Table 1-1 and Table 2-11. `CAUSE_TABLES`/`CAUSE_DESCRIPTIONS` key by Table 2-12's relation name for dispatch; Rivalry and War are deliberately absent (Rivalry has no cause table at all; War uses `WAR_CAUSE_TABLE` directly and redirects into another nature's table — see `generation/relationships.mjs`) |
| `settlements.mjs` | `VILLAGE_COUNT_TABLE`, `principalitySizeBand`, `COMMUNITY_FEATURES_TABLE`, `COMMUNITY_FEATURE_DESCRIPTIONS`, `ECONOMIC_RESOURCE_TABLE`, `RESOURCES_TABLE`, `STRONGHOLD_RESOURCES`, `CRAFTS_TABLE`, `STRONGHOLD_CRAFTS`, `ODDITIES_TABLE`, `SPECIAL_FEATURES_TABLE`, `SPECIAL_FEATURE_DESCRIPTIONS`, `PLACEMENT_GUIDANCE` | Tables 3-1..3-7 data — no row-shift misprint turned up here, unlike every dense table in Geography/Princes/Relationships (`-table` and `-layout` agreed cleanly). `COMMUNITY_FEATURES_TABLE`'s 45 bands encode Table 3-2's per-band modifier deltas directly (`+10`/`-10`/`0`); its final band is open-ended (`max: Infinity`) since the cumulative modifier can push a roll past 100. `STRONGHOLD_RESOURCES`/`STRONGHOLD_CRAFTS` are the Table 3-4/3-5 entries that auto-flag a settlement as a Stronghold. `PLACEMENT_GUIDANCE` is the GM-facing placement text used in place of scene placement, per the locked-in "journal-only" decision (PLAN.md) |
| `names.mjs` | `NAMING_STYLES`, `RACE_TO_STYLE`, `FIRST_ELEMENT_TABLES`, `SECOND_ELEMENT_TABLES` (plus every individual `*_FIRST_ELEMENT`/`*_SECOND_ELEMENT` table) | Appendix I: Border Prince Names (Tables A-1..A-12, PDF pages 116-118), re-verified with `pdftotext -table` — `-layout` wrapped several longer words ("Hunter's", "Hangman's") onto the row below, misaligning that column. 6 cultural styles, each a First Element (banded d100) + Second Element pair; only Flavourful's Second Element (Table A-12) is itself banded d100 like every First Element — the other 5 styles' Second Elements (Tables A-2/A-4/A-6/A-8/A-10) are plain 1d10 direct-index lists. `RACE_TO_STYLE` maps every `RACE_TABLE` (`tables/princes.mjs`) entry except `"Human—Other"`, which has no book-stated style and is split 50/50 between Estalian/Kislevite in `generation/names.mjs` instead — a judgment call, not stated by the book, so every one of the 6 tables sees use |
| `hazards.mjs` | `lookupBand` (re-exported), `NUMBER_OF_LAIRS_TABLE`, `PLACEMENT_GUIDANCE`, `MONSTER_TYPE_TABLE`, `CHAOS_CREATURE_COUNT_TABLE`, `CHAOS_LEADER_TABLE`, `CHAOS_LEADER_COLUMNS`, `CHAOS_FOLLOWERS_TABLE`, `CHAOS_LEADER_DESCRIPTIONS`, `GREENSKIN_NUMBERS_TABLE`, `GREENSKIN_COLUMNS`, `MONSTER_TABLE`, `MONSTER_ATTITUDE_TABLE`, `MONSTER_DESCRIPTIONS`, `MONSTER_ATTITUDE_DESCRIPTIONS`, `UNDEAD_CLASS_TABLE`, `DEAD_LORD_TABLE`, `DEAD_LORD_DESCRIPTIONS`, `LONE_MENACE_TABLE`, `LONE_MENACE_DESCRIPTIONS`, `SHAMBLING_HORDE_START_TABLE`, `SHAMBLING_HORDE_COLUMNS`, `SHAMBLING_HORDE_TABLE` | Tables 4-1..4-12 data. `pdftotext -table` caught one real `-layout` misalignment (Table 4-8's Giant column); everything else read cleanly in both modes. `CHAOS_FOLLOWERS_TABLE`'s row is picked directly from `CHAOS_CREATURE_COUNT_TABLE`'s own `followerModifier`, not an independent roll. `SHAMBLING_HORDE_TABLE`'s `modifierDelta` carries across all 4 of one horde's column rolls (resets per horde, not within one — same shape as `settlements.mjs`'s `COMMUNITY_FEATURES_TABLE`). `PLACEMENT_GUIDANCE` is the GM-facing placement text used in place of scene placement, per the locked-in "journal-only" decision (PLAN.md) |

## templates/

- `apps/borderlands-wizard.hbs` — phase list with a "Roll" button per phase.
- `apps/geography-roller.hbs` — running bonus/status, roll log, Roll Next / End Phase buttons.

Ancient Ruins and Hazards have no templates of their own — their journal pages are built as
static HTML strings in `ruins-scene.mjs`/`hazards-journal.mjs` (written once at creation
time, never re-rendered).

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
    settlements: { journalId: null, entries: [] },
    hazards: { journalId: null, entries: [] },
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

`region.settlements.entries` accumulates one object per settlement (`{ tier: "town"|
"village"|"homestead", ownerId, population, features, isStronghold, name? }`, `ownerId` a
prince's Actor id or `null` for the uncontrolled area) each time Settlements runs — one town (if the
principality's Table 3-1 roll clears 100) plus a Table 3-1 village count and `1d10`
homesteads per prince, and once more for the uncontrolled area (always treated as
"medium," never gets a town). `features` is an array (Table 3-2's roll and its recursion can
produce more than one), each entry either `{ kind: "Resource"|"Craft"|"Oddity"|"Market",
detail, isStronghold }` (an Economic Resource hit) or `{ type: "Stronghold"|"Chokepoint"|
"Cultists"|"Hospital"|"MagicalEffect"|"Monastery"|"Monster"|"Templars"|"Witch"|"Wizard" }`.
No scene placement — every settlement's journal page carries the book's placement
preference as text instead (`PLACEMENT_GUIDANCE`, `tables/settlements.mjs`), per the
locked-in "journal-only" decision (PLAN.md). `name` is only present when the "Generate
Names" setting is on (`generation/names.mjs`, Appendix I) — omitted entirely, not `null`,
when it's off. `region.settlements.journalId` points at the
shared "`<Map Name>` - Settlements" JournalEntry, reused (pages rebuilt in place) on repeat
runs rather than recreated.

`region.hazards.entries` accumulates one lair object per Hazards run, whose shape depends on
`type` (Table 4-2's dispatch): `{ type: "Chaos", count, leader, aim, followers }` (`aim` only
set for a Chaos Warrior leader); `{ type: "Greenskin", counts, total, leader, raidingArea }`
(`raidingArea: { feature, size, sizeUnit }` only past 1000 total, else `null`); `{ type:
"Monster", monster, count, attitude }`; or `{ type: "Undead", undeadClass, ... }` where
`undeadClass` is `"Dead Lord"` (`{ deadLordType, servants: <horde>, personality: { goal,
principle, style, secrets, quirks } }`), `"Lone Menace"` (`{ menace }`), or `"Shambling
Horde"` (`{ horde: <horde> }`) — a `<horde>` object is always `{ counts, total, cursed }`.
Table 4-1's lair count is GM-chosen (Few/Moderate/Many, prompted via
`apps/lair-style-dialog.mjs` before `runPhase` is called), not random, so `generateHazards`
throws if no style is passed. No scene placement — every lair's journal page carries the
book's placement preference as text instead (`PLACEMENT_GUIDANCE`, `tables/hazards.mjs`),
per the locked-in "journal-only" decision (PLAN.md). `region.hazards.journalId` points at
the shared "`<Map Name>` - Hazards" JournalEntry, reused (new pages appended, one per lair —
lairs have no natural owner to rebuild-in-place by) on repeat runs rather than recreated.
