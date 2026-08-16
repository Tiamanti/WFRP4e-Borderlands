# Decisions

Every non-obvious, locked-in design call made while building this module, condensed to a
scannable reference — so future work doesn't have to re-derive (or accidentally re-litigate)
one by reading through `PLAN.md`'s full chronological narrative. Each entry here has the
detailed "why" and any AskUserQuestion transcript in `PLAN.md`'s matching phase section, if
you need it.

## Cross-cutting

- Each phase materializes directly onto real Foundry documents as it generates
  (Scenes/JournalEntries/Actors) — not a roll-log left for the GM to place by hand.
- A shared `"<Map Name>"` JournalEntry folder (`generation/journal-folder.mjs`) holds every
  phase's journal; a separate `"<Map Name>"` Actor folder holds Princes — Folders are typed
  per document type in Foundry, so these can't be the same Folder document.
- Per-owner journal pages (Relationships, Settlements) are keyed by a
  `flags["wfrp4e-borderlands"]` id and **rebuilt in place** on a re-run, never duplicated.
  Per-entity pages with no natural owner (Ancient Ruins, Hazards) are simply **appended**
  instead — there's nothing to key a rebuild by.
- `isPhaseDone(region, phaseId)` (`region.mjs`) centralizes each phase's "has this produced
  anything yet" check, instead of per-phase special-casing in the wizard.
- Never cite `Conversion_Rules.pdf` in GM-facing text — it's not a document the GM has open
  in Foundry, unlike `Renegade Crowns.pdf`.
- A `game.settings` value is read once at its single Foundry-side call site and threaded
  down as a plain parameter into the pure roll functions below it — see `settings.mjs`.

## Table transcription

`pdftotext -table` mode is the trusted source for this book's dense multi-column tables.
`-layout` mode has repeatedly mis-aligned rows whenever a cell's text wraps onto a second
line, shifting every band below it by one row. Confirmed instances: Table 1-1 rows 73-100
(Geography), Table 2-11 Titles (Princes), Tables 2-15..2-21 relationship causes
(Relationships), Table 4-8's Giant column (Hazards), several Appendix I second-column words
like "Hunter's"/"Hangman's" (Names). Sanity check used throughout: a d100 table's band
widths should sum to exactly 100 (10 for a 1d10 table) — confirms the transcription is
complete with no gaps or overlaps.

## Geography

- Scene squares are Foundry `Drawing` documents (rectangle + text label), not `Tile` — core
  `TileDocument` requires an image texture, `Drawing` doesn't.
- Rivers are logged only, never painted — no square-count size to fill, and the book leaves
  routing to GM judgment.
- Cliff is a "boundary" feature — its roll is the escarpment's height in feet, not a square
  count (caught as a bug after an initial wrong implementation tried to claim ~700 cells).
- Zero scene padding — Foundry's 0.25 default made part of the generated map inaccessible.
- Cell fill radiates from the map's current *frontier* (nearest still-empty square), not the
  fixed top-left corner — avoids a "concentric rings" look once tiles got distinct colors.
- **Ban Large Geography Regions setting** (default off): rerolls Table 1-1 results 81-99 on
  maps under 500 squares, 91-99 on 500+, without bumping the running bonus.

## Ancient Ruins

- One-shot batch generation via the generic `runPhase` flow — no per-step GM decision the
  way Geography's grid-fill needs.
- One JournalEntry, one page per ruin; a scene `Note` per ruin deep-links to its page. Ruins
  land on a uniformly random already-painted cell, deduplicated against other ruins.
- Table 1-7 has no "Oddity" column — resolved by auto-rolling twice on two random *other*
  columns and combining both purposes (the book's own suggestion, mechanized).
- Table 1-6 (Age of Ruins) isn't actually a random table in the book — the module still
  auto-rolls a suggested age (a random valid period for the ruin type, then a year within
  it); each ruin's page states it's a GM-overridable suggestion, not a hard result.

## Princes

- Full linked Career/Skill/Talent Items (not just text) on `npc` Actors, filed into a shared
  Actor folder.
- Principality is rolled for size only — no auto-placement; the GM draws its boundary by
  hand once they've decided where.
- The 7 Table 2-1 example statblocks are **hand-converted 2e->4e once**, at table-
  transcription time (`tables/princes.mjs`) — not a live ~90-row lookup engine run on every
  roll. `Conversion_Rules.pdf` was used only as a one-time reference during that transcription.
- Race (Table 2-2) is pure narrative flavor — recorded on the Actor's species field, doesn't
  feed characteristics at all. Princes are NPCs, not PCs, so there's no per-race stat offset;
  every prince uses Table 2-1's baseline plus freshly-rolled Initiative/Dexterity.
- Wounds is **not** computed by this module — wfrp4e's own `StandardActorModel` auto-derives
  it from S/T/WP once characteristics are set.
- A Skill's "+N%" suffix maps straight onto `system.advances.value` — already a flat %,
  confirmed via `skill.js#computeOwned()`'s own formula.
- Basic Skills: `Actor.create(data, { skipItems: true })` suppresses wfrp4e's own "Add Basic
  Skills?" prompt (which would otherwise offer an undeduped second copy); the module fetches
  the same set directly via `game.wfrp4e.utility.allBasicSkills()`, deduped against the
  prince's own resolved skills by base name.
- Item lookups use `game.wfrp4e.utility.findExactName`/`findBaseName` (searches every
  compendium pack tagged with the item type across *all* installed modules) rather than a
  `wfrp4e-core`-only pack search — needed to find "Basic" skills like Stealth/Ride, which
  ship in the `wfrp4e` system's own bundled compendium, not `wfrp4e-core`'s.
- Principality size is capped at `MAX_PRINCIPALITY_SIZE = 100` — Table 1-1's size formulas,
  reused unclamped, can roll as high as 500, and a lucky high roll on one prince next to
  unlucky low rolls on the rest produces a wildly lopsided region (user-reported live bug,
  fixed). Known side effect: Settlements' "Large" principality band (`> 150` squares) is
  permanently unreachable as a result — harmless, just noted rather than silently left.

## Relationships

- Two relationships per prince, each against an independently-chosen random *other* prince
  (self excluded, repeats allowed — the book's own explicit tolerance for "deeply stupid"
  contradictory results, e.g. being simultaneously allied and at war, justifies this).
- One JournalEntryPage **per prince** (not per relationship) — corrected mid-build from an
  initial per-relationship layout; each relationship renders as a subsection under the
  *other* prince's name.
- Only `MUTUAL_RELATIONS = ["Alliance", "Rivalry", "War"]` appear on **both** princes' pages
  — corrected mid-build from an initial "show every relationship on both pages
  unconditionally" bug. Every other nature is one prince's one-directional feeling *about*
  the other and appears only on the feeling prince's own page.
- The "particularly old alliance" third Origin reinforcement roll has no exact year
  threshold in the book — applied at 25+ years (Table 2-13's own next band up).
- No `<h2>` repeating a journal page's own title — Foundry's viewer already shows that. Fixed
  across Geography, Ancient Ruins, and Relationships journals in one pass after being caught
  here first.

## Settlements

- Journal-only, **no scene placement at all**, even for the uncontrolled area — chosen over
  auto-placing by terrain preference, consistent with principality boundaries themselves
  already being GM-hand-placed. Each settlement's page states the book's placement
  preference as text instead.
- One page per prince plus one for the uncontrolled area (mirrors Relationships' pattern).
- `rollCommunityFeatures` resolves Table 3-2's *entire* recursive chain into every feature it
  actually produces (Chokepoint's one bonus reroll, Special's Table 3-7 dispatch including
  its own Roll Twice, a town's Monastery redirect) — capped at 6 total, mirroring Princes'
  `maxSecrets` cap, per the book's own "ignore it once ridiculous" permission.
- A town's population-based economic-resource minimum is a **simple top-up**: count whatever
  the Table 3-2 chain already produced, then roll flat calls (continuing the same
  per-settlement modifier/Market-sticky state) until reaching `max(1, floor(population /
  1000))` — simpler than an originally-floated "+1 per Economic Resource hit" rule, and
  avoids double-counting.
- Each owner's page sorts settlements largest-population-first (a Town, when one exists,
  always leads) — added after live verification, for easier scanning.

## Hazards

- Table 4-1's lair count is **GM-chosen** (Few/Moderate/Many), not random — surfaced as a
  minimal `DialogV2` prompt before the generic `runPhase` flow runs, rather than a bespoke
  app (unlike Geography's interactive loop, this is a single field).
- Dead Lords (Vampires/Mummies) **auto-generate a full Prince-style personality**
  (Goal/Principle/Style/Secrets/Quirks, reusing Princes' own tables and rollers directly) —
  the book calls this optional ("there is no reason not to..."), the module does it
  automatically, consistent with how thoroughly every other phase mechanizes book-optional
  steps. No Actor gets created for a Dead Lord — unlike Princes' 7 hand-converted
  archetypes, the book gives no 2e statblock to convert from.
- Table 4-5 (Chaos Followers) needs **no independent roll** — its row is Table 4-3's own
  `followerModifier` value directly (`min(5, 1 + followerModifier)`).
- Table 4-12 (Shambling Hordes): picks a random starting column, then rolls exactly once per
  column in wrap-around order, sharing one cumulative modifier across all 4 rolls (resets
  per horde, not within one — same shape as Settlements' Table 3-2 chain).
- One page **per lair** (not per-owner) — a lair has no natural owner to group by; matches
  Ancient Ruins' append-only pattern instead of Relationships'/Settlements' rebuild-in-place.
- Placement is fully journal-text-only, even more explicitly than Settlements — the book's
  own "Placing Lairs" section states outright that no random table could sensibly place a
  lair without knowledge of the mapped area.
- **Table 4-2 house-ruled**, on user request: the book's own bands (confirmed via
  `pdftotext -table`) are 1-2 Chaos, 3-7 Greenskin, 8 Monster (a single roll), 9-10 Undead —
  Monster's 1-in-10 odds were judged too rare, so Greenskin was narrowed to 3-5 and Monster
  widened to 6-8, leaving Chaos/Undead untouched. This is a **deliberate deviation from the
  book**, not a transcription fix — don't "correct" it back without checking first.

## Settings

- **Default Map Size** (`defaultMapSize`, default `"20x20"`) parses with the exact same
  `parseMapSize` helper the `/borderlands` command's own `mapSize=WxH` arg uses, as that
  parser's fallback.
- **Ban Large Geography Regions** (`banLargeRegions`, default `false`) — see Geography above.
- **Generate Names** (`generateNames`, default `true`):
  - **Princes do not get a generated personal name at all** — the user explicitly chose to
    skip that and leave it to the GM, overriding the feature's original scope mid-question.
    Consequently, WFRP4e's own `/name` command (`game.wfrp4e.names.generateName`) is
    **never called anywhere** in the final design: every settlement always resolves to one
    of Appendix I's 6 cultural styles (full 1-100 coverage), so there's no "no table
    available" case left for it to fall back into.
  - A settlement's naming style is biased **50% toward its owning prince's own race-mapped
    style, 10% each toward the other 5** — the user's own specified mechanic.
  - `RACE_TO_STYLE` (`tables/names.mjs`) maps Table 2-2's Human—Bretonnian/Empire/Tilean
    races directly to their matching Appendix I style; Human—Border Princes and
    Dwarf/Elf/Halfling (no matching style at all) default to **Flavourful**, the appendix's
    own "native, unclaimed land" style; **Human—Other is split 50/50 between Estalian and
    Kislevite** (the two styles nothing else maps to) so all 6 tables see use. This exact
    mapping was **never put to the user directly** — the question that would have covered it
    got preempted when Prince naming was dropped entirely. Worth double-checking against
    actual play if it looks wrong.
  - The uncontrolled area (no owning prince) biases toward Flavourful directly.
