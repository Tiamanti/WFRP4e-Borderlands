# WFRP4e Borderlands — Development Plan

## Context

`wfrp4e-borderlands` currently has only a boilerplate scaffold: a `/borderlands`
command, an empty `BorderlandsWizard` app, and six phase files under
`src/generation/` that each just `throw new Error("not yet implemented")`.
The goal now is to design — in detail — how the **first phase, Geography**,
will actually work, so it can be implemented next. The other five phases
(Ancient Ruins, Princes, Relationships, Settlements, Hazards) are intentionally
left as-is for now; we'll plan each of those the same way when we get to them.

I read the source book directly (`docs/RENEGADE-CROWNS-TEXT.txt`, the
gitignored page-numbered text extraction, PDF pages 6–12) to ground this in
the actual table contents and process text, not just the `SPECS.md` summary.

### Key realization that shapes the design

SPECS.md's step 5 — *"Place the feature on your map. If the map is full,
stop."* — is a **manual, creative GM action** in the book: *"You may place
the feature where you wish, and in any shape you wish... If you have no
preferences, filling the map from one side to the other is a good strategy."*

Per direction from the user, this module leans into automating that "no
preferences" strategy rather than leaving placement manual: **each phase
materializes directly onto a real Foundry Scene as it generates.** For
Geography specifically:

- A **Scene** is created (or reused) with a 20×20 grid by default.
- Each rolled terrain/special feature auto-fills the next N grid squares,
  radiating outward from the top-left corner (0,0) — the first feature forms
  a quarter-circle-ish blob in the corner, and each subsequent feature
  continues filling the nearest still-empty squares, so the region grows
  outward ring by ring as more features are rolled.
- Squares are represented as text-labelled placeables (terrain name, no art
  assets for now — see §3).
- Rivers are **logged only, not auto-placed** — they have no square-count
  size to fill, and the book's routing guidance ("draw a river with forks
  and such, wherever it seems reasonable... rivers often disappear in
  swamps...") isn't reducible to a simple fill rule the way terrain extent
  is. The GM draws rivers onto the scene by hand afterward.

This also sets the pattern for later phases, which the user has already
directed (kept brief here — each gets its own detailed plan when we reach
it): **Ancient Ruins** → Journal entries + scene placeables; **Princes** →
NPC Actors; **Relationships** → Journal entries; **Settlements** → Journal
entries + placeables (same pattern as Ruins). Hazards' representation is
still open.

## Geography phase design

### 1. Table data — `src/tables/geography.mjs`

Two tables, transcribed from PDF pages 9–11 (Table 1-1: Geography, Table
1-2: Special Features):

```js
// 100-entry array, index 1-100 (roll total, i.e. d100 + running bonus).
// >100 is handled separately as "Special Feature" — it's not part of this array.
export const GEOGRAPHY_TABLE = [
    null, // index 0 unused, keeps 1-based indexing readable
    { type: "terrain", terrain: "Barren Plains",   vegetation: "Barren",   sizeFormula: "1d100" }, // 1
    { type: "terrain", terrain: "Scrubland Plains", vegetation: "Scrubland", sizeFormula: "1d100" }, // 2
    // ...
    { type: "river" }, // 10, 20, 30, 40, 50, 60, 70 (and possibly others in the 80s/90s — see caveat below)
    // ...
    { type: "terrain", terrain: "Barren Hills", vegetation: "Barren", sizeFormula: "1d10 * 50" }, // 100
];

// 1d10 table for rolls >100 on Table 1-1.
export const SPECIAL_FEATURES_TABLE = [
    null,
    { feature: "Caves",            sizeFormula: "1d100", description: "Entrance to an extensive underground chamber system." }, // 1
    { feature: "Cliff",            sizeFormula: "(1d10 * 50) + 200", sizeUnit: "feet", description: "A steep escarpment; runs along terrain boundaries, rarely through mountains." }, // 2
    { feature: "Fertile Valley",   sizeFormula: null, description: "Much more fertile than its surroundings; settlements are placed here first." }, // 3
    { feature: "Geyser",           sizeFormula: null, description: "Always forms the source of a river." }, // 4
    { feature: "Isolated Mountain", sizeFormula: null, description: "A single mountain, possibly an extinct volcano." }, // 5
    { feature: "Pool",             sizeFormula: null, description: "A still body of water with no visible source or outlet." }, // 6
    { feature: "Tor",              sizeFormula: null, description: "A defensible hill with a flat peak; almost always inhabited." }, // 7
    { feature: "Volcano",          sizeFormula: null, description: "Active; soil nearby is unusually fertile (may place Fertile Valley adjacent)." }, // 8
    { feature: "Waterfall",        sizeFormula: null, description: "Must be sited on a river with a sudden change of elevation." }, // 9
    { feature: "Whirlpool",        sizeFormula: null, description: "Impassable water; add a river/coastline first if the region has none." }, // 10
];

// Short reference text shown as GM guidance, not per-roll (keeps the table above from
// repeating the same description 15+ times).
export const TERRAIN_DESCRIPTIONS = { Badlands: "...", Hills: "...", Mountains: "...", Plains: "...", Swamps: "...", River: "..." };
export const VEGETATION_DESCRIPTIONS = { Barren: "...", Grassy: "...", Forested: "...", Scrubland: "..." };
```

**Caveat / first implementation task:** `pdftotext -layout`'s column
alignment breaks down for Table 1-1 rows 73–100, because several entries
there wrap onto a second line (`"Forested Plains, 1d10×20 squares"`), which
shifts the row numbering in the raw text dump. Rows 1–72 (columns 1–2, single-
line entries) are extracted cleanly and can be transcribed directly from
`docs/RENEGADE-CROWNS-TEXT.txt` lines 379–451. **Rows 73–100 must be visually
verified against the actual PDF page** (`Read` tool on `Renegade Crowns.pdf`
with `pages: "9-10"`, which renders it as an image) before being encoded —
don't trust the raw text order there.

### 2. Roll logic — `src/generation/geography.mjs`

Pure(ish) functions, each doing exactly one Foundry `Roll`, so they're easy to
unit test with a stubbed `Roll`:

```js
export async function rollGeographyStep(runningBonus) {
    const roll = await new Roll("1d100").evaluate();
    const total = roll.total + runningBonus;

    if (total > 100) {
        return { roll: roll.total, bonus: runningBonus, total, ...(await rollSpecialFeature()) };
    }

    const entry = GEOGRAPHY_TABLE[total];
    if (entry.type === "river") {
        return { roll: roll.total, bonus: runningBonus, total, type: "river" };
    }

    const sizeRoll = await new Roll(entry.sizeFormula).evaluate();
    return { roll: roll.total, bonus: runningBonus, total, type: "terrain", terrain: entry.terrain, vegetation: entry.vegetation, size: sizeRoll.total };
}

export async function rollSpecialFeature() {
    const roll = await new Roll("1d10").evaluate();
    const entry = SPECIAL_FEATURES_TABLE[roll.total];
    const size = entry.sizeFormula ? (await new Roll(entry.sizeFormula).evaluate()).total : null;
    return { type: "special", feature: entry.feature, size, sizeUnit: entry.sizeUnit ?? "squares", description: entry.description };
}
```

This directly implements SPECS.md's Geography Process steps 1–4, 6, 9–10.
Steps 5 ("place it, is the map full?"), 7–8 ("+10 bonus, loop"), and 11–12
("reset bonus on special, loop") are orchestration state owned by the UI
layer below, not by these pure roll functions.

### 3. Grid placement — `src/generation/geography-grid.mjs` (pure, no Foundry deps)

Deliberately separated from Foundry document creation so it's unit-testable
without any Foundry stubbing:

```js
export function createGrid(width, height) {
    // Precompute every cell ordered by distance from the top-left corner (0,0),
    // ascending, tie-broken by (x + y) then x — gives the "expanding quarter-circle"
    // fill order the user asked for.
    const cells = [];
    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++)
            cells.push({ x, y, dist: Math.hypot(x, y) });
    cells.sort((a, b) => a.dist - b.dist || (a.x + a.y) - (b.x + b.y) || a.x - b.x);
    return { width, height, order: cells, claimed: new Set() }; // claimed keys: `${x},${y}`
}

/** Claims the next `count` unclaimed cells in radiating order. Returns [] once the grid is full. */
export function claimNextCells(grid, count) {
    const claimed = [];
    for (const cell of grid.order) {
        if (claimed.length >= count) break;
        const key = `${cell.x},${cell.y}`;
        if (grid.claimed.has(key)) continue;
        grid.claimed.add(key);
        claimed.push({ x: cell.x, y: cell.y });
    }
    return claimed;
}

export function isGridFull(grid) {
    return grid.claimed.size >= grid.width * grid.height;
}
```

A feature's `size` (in squares) from `rollGeographyStep` is clamped to however
many cells `claimNextCells` actually returns — if a roll's extent is larger
than the remaining empty grid, it simply fills what's left and the grid
reports full (this replaces the manual "map is full, stop" check from the
book with an automatic one, consistent with automating the whole placement
step).

### 4. Materializing onto the Scene — `src/generation/geography-scene.mjs` (Foundry-side effects)

All `Scene`/placeable creation lives here, isolated from the pure grid math
above so tests never need a real Foundry environment:

```js
export async function createGeographyScene(region, { width = 20, height = 20, gridSize = 100 } = {}) {
    const scene = await Scene.create({
        name: "Borderlands", grid: { type: CONST.GRID_TYPES.SQUARE, size: gridSize },
        width: width * gridSize, height: height * gridSize,
    });
    region.geography.sceneId = scene.id;
    return scene;
}

/** One text-labelled Drawing per claimed grid cell — see rationale below. */
export async function placeCellLabels(scene, cells, { terrain, vegetation }) {
    const gridSize = scene.grid.size;
    const drawings = cells.map(({ x, y }) => ({
        x: x * gridSize, y: y * gridSize, shape: { type: "r", width: gridSize, height: gridSize },
        text: terrain, fontSize: 16,
        flags: { "wfrp4e-borderlands": { terrain, vegetation } },
    }));
    return scene.createEmbeddedDocuments("Drawing", drawings);
}
```

**Why `Drawing`, not `Tile`, for the "text/label tile" requirement:** Foundry
core `TileDocument` always renders an image texture — there's no built-in
way to give it a plain text label without first generating a placeholder
image asset. `DrawingDocument` (`type: "rectangle"`) natively supports a
`text` field with no image required, and sizes/positions onto the grid the
same way a Tile would. So "one tile per grid square" is implemented as one
Drawing per square. If real terrain art gets added later, swapping these for
image-backed Tiles is a contained change to this one file.

Each Drawing's `flags["wfrp4e-borderlands"] = { terrain, vegetation }` is
what lets later phases (Settlements, Hazards) query "what terrain is at grid
cell (x,y)" by reading the scene's drawings — no separate grid-lookup data
structure needs to be persisted on the region object.

### 5. Interactive UI — `src/apps/geography-roller.mjs` + `templates/apps/geography-roller.hbs`

An `ApplicationV2` dialog (same pattern as `borderlands-wizard.mjs`), opened
from the wizard's Geography row instead of the generic one-shot `runPhase`
call (see §6). On first open it calls `createGeographyScene` (or reuses
`region.geography.sceneId` if one already exists) and `createGrid(width,
height)`. State: `log` (every roll result, in order), `runningBonus`, the
`grid` from §3.

Flow per **Roll Next** click:
1. `rollGeographyStep(runningBonus)` (§2 — unchanged from the original
   design).
2. **River** → append to `log`, `runningBonus += 10`, re-render. No grid
   interaction (per the clarified river handling above).
3. **Terrain** → `claimNextCells(grid, entry.size)`, then
   `placeCellLabels(scene, claimedCells, entry)`; append to `log` (recording
   how many cells were actually claimed, which may be less than the rolled
   size if the grid filled up); `runningBonus += 10` (unless
   `isGridFull(grid)`, in which case auto-stop the loop and disable
   **Roll Next** — this is the automated replacement for the book's manual
   "map is full, stop" check).
4. **Special feature** (`total > 100`) → same as terrain if it has a
   `sizeFormula` (Caves, Cliff), otherwise claims/places a single cell;
   `runningBonus` resets to 0 per step 11.

No separate "Placed, Continue" / "Map is Full" buttons are needed anymore —
placement and the full-grid check are both automatic. A single **End Phase**
button lets the GM stop early regardless of grid fill state, and closes the
dialog resolving `region.geography` back to the wizard.

### 6. Wiring into the wizard and region data shape

- `src/generation/region.mjs`: replace the placeholder
  `geography: { features: [], rivers: [] }` shape in `createRegion()` with:

  ```js
  geography: { sceneId: null, mapSize: { width: 20, height: 20 }, log: [], stoppedReason: null }
  ```

- `src/apps/borderlands-wizard.mjs`: `_onRunPhase` special-cases
  `phaseId === "geography"` to open `GeographyRoller` instead of calling the
  generic `runPhase` — geography is the only phase whose process is
  inherently an interactive loop rather than a single roll-and-return. The
  other five `REGION_PHASES` entries are untouched for now.

### 7. Tests — `tests/generation/geography.test.mjs` and `tests/generation/geography-grid.test.mjs`

`geography-grid.test.mjs` (no Foundry stubbing needed — pure logic):
- `claimNextCells` returns cells in radiating order from (0,0) (spot-check
  the first few claimed cells for a fresh grid).
- Claiming across multiple calls never returns an already-claimed cell.
- `claimNextCells` returns fewer cells than requested once the grid runs out,
  and `isGridFull` becomes `true`.

`geography.test.mjs`:

Extend `tests/setup.mjs` with a stubbed `globalThis.Roll` (constructor takes
a formula, `.evaluate()` resolves to `{ total }` — tests control `total` per
formula via a `vi.fn()` queue, same stubbing style already used for
`foundry.applications.handlebars.renderTemplate`). Cases:
- `rollGeographyStep` returns a `river` entry for a table total that's a
  river row.
- `rollGeographyStep` returns a `terrain` entry with a rolled `size` for a
  normal row.
- `rollGeographyStep` total > 100 delegates to `rollSpecialFeature` and
  returns a `special` entry.
- `rollSpecialFeature` rolls 1d10, looks up the right table entry, and only
  rolls a size when `sizeFormula` is set (Caves/Cliff) vs. `null` (everything
  else).

## Verification

- `npm test` (vitest) — the above unit tests, run headless, no Foundry needed.
- Manual: `npm run build`, load the module in a dev Foundry world with the
  `wfrp4e` system, run `/borderlands`, click **Roll** on the Geography row —
  confirm a "Borderlands" Scene is created with a 20×20 grid, each terrain
  roll paints labelled Drawings onto it radiating out from the top-left
  corner, the running bonus climbs by 10 each non-special roll and resets on
  a special feature, river rolls log but paint nothing, and rolling stops
  automatically once the grid is full.

## Ancient Ruins phase design

Tables transcribed from PDF pages 12–19 (Table 1-3: Ancient Ruins, 1-4: Ruin
Type, 1-5: Ancient Menaces, 1-6: Age of Ruins, 1-7: Original Purpose of
Ruins, 1-8: Reason for Ruins), cross-checked with `pdftotext -table`: every
column of the 1-5 and 1-7 matrices sums to exactly 100, which is strong
confirmation the transcription is correct.

### Key differences from Geography

- **No interactive roller needed.** Unlike Geography, this process has no
  "map is full, stop" condition requiring a per-step GM decision — it's roll
  a count, then loop simple table lookups that many times. So this phase
  runs through the **generic one-shot `runPhase()` flow already in
  `region.mjs`**, the same as the still-stubbed phases, instead of getting
  its own `ApplicationV2` dialog like `GeographyRoller`.
- **Ruins land on already-painted terrain.** Geography's radiating fill
  claims every grid cell by the time it stops, so there's no "empty cell" to
  place a ruin into — the book's own guidance for the Location step (PDF
  p.18/book p.18) says free-choice ruins should just be "scatter[ed] across
  the map," so each ruin gets a **uniformly random cell** within
  `region.geography.mapSize`, deduplicated against cells already used by
  other ruins in this run.
- **Journal Entry + Note, not Drawing.** Per your standing direction (and
  confirmed for this phase): one `JournalEntry` ("Borderlands — Ancient
  Ruins") with one `JournalEntryPage` per ruin, and a `Note` placeable
  pinned at the ruin's cell that deep-links to that page (`entryId` +
  `pageId`) — clicking the pin opens the ruin's writeup directly. Reusing
  the existing `JournalEntry` on repeat runs (appending new pages) mirrors
  how `GeographyRoller` reuses `sceneId`.
- **Table 1-6 (Age of Ruins) isn't a real random table** — the book says so
  explicitly ("you should choose the precise age of your ruins... Instead,
  it gives broad bands... normally found dating from those periods"). Per
  your answer, the module still auto-rolls a suggested age (uniformly picks
  one of the ruin type's valid periods, then rolls a specific year within
  it), but every ruin's journal page states this is a **suggestion** and
  stays a normal editable page the GM can freely overwrite — no bespoke "Age
  field" UI, just page text.
- **Table 1-7 has no column for Oddity ruins.** Per your answer, Oddity
  rolls twice on two independently-chosen random columns (of the other
  five) and records both purposes — mechanizing the book's own suggestion
  for "ambiguous... mysterious origin" ruins, applied specifically to the
  one type that structurally can't roll a single column.

### 1. Table data — `src/tables/ruins.mjs`

Band tables (roll ranges, not 1-100 dense arrays like Geography's) sharing
one small lookup helper:

```js
/** First entry whose `max` is >= roll, scanning in ascending order. */
export function lookupBand(table, roll) {
    return table.find(entry => roll <= entry.max);
}

export const RUIN_COUNT_TABLE = [ // Table 1-3
    { max: 10, count: 1 }, { max: 22, count: 2 }, { max: 34, count: 3 },
    { max: 47, count: 4 }, { max: 60, count: 5 }, { max: 72, count: 6 },
    { max: 83, count: 7 }, { max: 92, count: 8 }, { max: 98, count: 9 },
    { max: 100, count: 10 },
];

export const RUIN_TYPE_TABLE = [ // Table 1-4 — canonical type names used everywhere below
    { max: 20, type: "Arabyan" }, { max: 30, type: "Chaos Cults" },
    { max: 45, type: "Dwarf" }, { max: 65, type: "Khemri" },
    { max: 90, type: "Recent Human" }, { max: 100, type: "Oddity" },
];

// Table 1-5, keyed by RUIN_TYPE_TABLE's `type`. Column headers in the book are
// shorthand ("Chaos", "Human", "Oddities") — normalized to the same keys as above.
export const ANCIENT_MENACES_TABLE = {
    "Arabyan": [{ max: 25, menace: "Daemon" }, { max: 55, menace: "Degenerate Tribe" }, { max: 75, menace: "Plague" }, { max: 85, menace: "Swarm" }, { max: 95, menace: "Undead" }, { max: 100, menace: "None" }],
    "Chaos Cults": [{ max: 20, menace: "Daemon" }, { max: 25, menace: "Degenerate Tribe" }, { max: 35, menace: "Golem" }, { max: 50, menace: "Plague" }, { max: 65, menace: "Swarm" }, { max: 85, menace: "Undead" }, { max: 95, menace: "Weapon" }, { max: 100, menace: "None" }],
    "Dwarf": [{ max: 5, menace: "Daemon" }, { max: 30, menace: "Golem" }, { max: 55, menace: "Plague" }, { max: 75, menace: "Swarm" }, { max: 95, menace: "Weapon" }, { max: 100, menace: "None" }],
    "Khemri": [{ max: 15, menace: "Daemon" }, { max: 40, menace: "Degenerate Tribe" }, { max: 50, menace: "Plague" }, { max: 60, menace: "Swarm" }, { max: 85, menace: "Undead" }, { max: 95, menace: "Weapon" }, { max: 100, menace: "None" }],
    "Recent Human": [{ max: 15, menace: "Daemon" }, { max: 40, menace: "Degenerate Tribe" }, { max: 60, menace: "Plague" }, { max: 70, menace: "Swarm" }, { max: 85, menace: "Undead" }, { max: 95, menace: "Weapon" }, { max: 100, menace: "None" }],
    "Oddity": [{ max: 15, menace: "Daemon" }, { max: 30, menace: "Degenerate Tribe" }, { max: 45, menace: "Golem" }, { max: 60, menace: "Plague" }, { max: 75, menace: "Swarm" }, { max: 80, menace: "Undead" }, { max: 95, menace: "Weapon" }, { max: 100, menace: "None" }],
};

// Table 1-7 — no "Oddity" column (see below).
export const ORIGINAL_PURPOSE_TABLE = {
    "Arabyan": [{ max: 30, purpose: "Fortress" }, { max: 60, purpose: "Outpost" }, { max: 70, purpose: "Settlement" }, { max: 90, purpose: "Temple" }, { max: 100, purpose: "Tomb" }],
    "Chaos Cults": [{ max: 20, purpose: "Fortress" }, { max: 25, purpose: "Outpost" }, { max: 30, purpose: "Settlement" }, { max: 80, purpose: "Temple" }, { max: 100, purpose: "Tomb" }],
    "Dwarf": [{ max: 25, purpose: "Fortress" }, { max: 60, purpose: "Outpost" }, { max: 80, purpose: "Settlement" }, { max: 90, purpose: "Temple" }, { max: 100, purpose: "Tomb" }],
    "Khemri": [{ max: 20, purpose: "Fortress" }, { max: 50, purpose: "Outpost" }, { max: 60, purpose: "Settlement" }, { max: 70, purpose: "Temple" }, { max: 100, purpose: "Tomb" }],
    "Recent Human": [{ max: 20, purpose: "Fortress" }, { max: 50, purpose: "Outpost" }, { max: 75, purpose: "Settlement" }, { max: 90, purpose: "Temple" }, { max: 100, purpose: "Tomb" }],
};

export const REASON_FOR_RUINS_TABLE = [ // Table 1-8, 1d10
    null,
    { reason: "Civil War" }, { reason: "Enigma" }, { reason: "Famine" }, { reason: "Magic" },
    { reason: "Military Attack" }, { reason: "Natural Decay" }, { reason: "Natural Disaster" },
    { reason: "Plague" }, { reason: "Policy" }, { reason: "Resource Loss" },
];

export const AGE_OF_RUINS_TABLE = [ // Table 1-6 — reference bands, not a d100 roll (see above)
    { period: "Dawn of Time", yearsAgoMin: 3000, yearsAgoMax: 5000, validTypes: ["Dwarf", "Oddity"] },
    { period: "Ancient Wars", yearsAgoMin: 1500, yearsAgoMax: 3000, validTypes: ["Chaos Cults", "Dwarf", "Khemri", "Oddity"] },
    { period: "Historical", yearsAgoMin: 300, yearsAgoMax: 1500, validTypes: ["Arabyan", "Chaos Cults", "Dwarf", "Khemri", "Oddity"] },
    { period: "Old", yearsAgoMin: 100, yearsAgoMax: 300, validTypes: ["Arabyan", "Chaos Cults", "Dwarf", "Recent Human", "Oddity"] },
    { period: "Recent", yearsAgoMin: 0, yearsAgoMax: 100, validTypes: ["Chaos Cults", "Recent Human", "Oddity"] },
];
```

Plus four short GM-facing description dicts, paraphrased (not quoted) the
same way as Geography's `TERRAIN_DESCRIPTIONS`: `RUIN_TYPE_DESCRIPTIONS`,
`MENACE_DESCRIPTIONS`, `PURPOSE_DESCRIPTIONS`, `REASON_DESCRIPTIONS` — one
sentence per entry, embedded into each ruin's journal page.

### 2. Roll logic — `src/generation/ruins.mjs`

One pure batch function, replacing the current stub. All dice go through
`Roll` (mockable via the existing `globalThis.__rollQueue` test stub):

```js
export async function rollAncientRuins(region) {
    const countRoll = await new Roll("1d100").evaluate();
    const count = lookupBand(RUIN_COUNT_TABLE, countRoll.total).count;

    const ruins = [];
    const usedCells = new Set();
    for (let i = 0; i < count; i++) {
        const type = lookupBand(RUIN_TYPE_TABLE, (await new Roll("1d100").evaluate()).total).type;
        const menace = lookupBand(ANCIENT_MENACES_TABLE[type], (await new Roll("1d100").evaluate()).total).menace;
        const purpose = await rollOriginalPurpose(type); // string[] — 2 entries only for Oddity
        const reason = REASON_FOR_RUINS_TABLE[(await new Roll("1d10").evaluate()).total].reason;
        const age = await rollSuggestedAge(type);
        const cell = await pickRandomCell(region.geography.mapSize, usedCells);
        usedCells.add(`${cell.x},${cell.y}`);
        ruins.push({ type, menace, purpose, reason, age, cell });
    }
    return ruins;
}
```

`rollOriginalPurpose(type)`: if `ORIGINAL_PURPOSE_TABLE[type]` exists, roll
once. For `"Oddity"` (no column), roll a `1d5` twice to pick two columns
from `Object.keys(ORIGINAL_PURPOSE_TABLE)`, roll `1d100` on each, and return
both — `purpose` is always an array (`length === 1` normally, `=== 2` only
for Oddity), so the journal page template doesn't need type-specific
branching.

`rollSuggestedAge(type)`: filter `AGE_OF_RUINS_TABLE` to bands whose
`validTypes` includes `type`, pick one uniformly (`1d<n>`), then roll a year
within `[yearsAgoMin, yearsAgoMax]` via formula
`` `${yearsAgoMin} + 1d${yearsAgoMax - yearsAgoMin + 1} - 1` `` (keeps the
uniform pick expressible as a single `Roll`, consistent with how the rest of
the module avoids bare `Math.random`).

`pickRandomCell(mapSize, usedCells)`: rolls `1d<width>`/`1d<height>` (0
indexed by subtracting 1), re-rolling on a collision with `usedCells`. Given
a 20×20 grid and a realistic ruin count (1–10), collisions are rare; if the
grid is exhausted (only relevant for pathological tiny `mapSize` values in
tests), it falls back to the first unused cell found by linear scan rather
than looping forever.

### 3. Materializing onto Foundry — `src/generation/ruins-scene.mjs`

Mirrors Geography's split between pure logic and Foundry effects:

```js
/** Creates (or reuses) the ruins JournalEntry and adds one page per ruin. */
export async function createRuinsJournal(region, ruins) {
    let journal = region.ruins.journalId ? game.journal.get(region.ruins.journalId) : null;
    if (!journal) {
        journal = await JournalEntry.create({ name: "Borderlands — Ancient Ruins" });
        region.ruins.journalId = journal.id;
    }
    const pages = await journal.createEmbeddedDocuments("JournalEntryPage", ruins.map((ruin, i) => ({
        name: `Ruin ${region.ruins.entries.length + i + 1}: ${ruin.type}`,
        text: { content: renderRuinPageHtml(ruin), format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML },
    })));
    return { journal, pages };
}

/** One Note per ruin, deep-linked to its journal page. */
export async function placeRuinNotes(scene, ruins, pages) {
    const notes = ruins.map((ruin, i) => ({
        entryId: pages[i].parent.id, pageId: pages[i].id,
        x: ruin.cell.x * scene.grid.size + scene.grid.size / 2,
        y: ruin.cell.y * scene.grid.size + scene.grid.size / 2,
        text: ruin.type,
    }));
    return scene.createEmbeddedDocuments("Note", notes);
}
```

`renderRuinPageHtml(ruin)` is a small template-literal HTML builder (type,
menace, purpose, reason, suggested age + "edit this if you want to place it
more precisely" note, each with its one-sentence description looked up from
the phase-1 description dicts) — plain string building, no Handlebars
needed since it's static content written once at creation time, not
re-rendered.

### 4. Wiring into the wizard and region data shape

- `region.mjs`: `ruins: []` becomes `ruins: { journalId: null, entries: [] }`
  (mirrors Geography's richer shape, needed to remember the journal to
  append to on a repeat run). `generateAncientRuins(region)` replaces the
  stub, calling `rollAncientRuins` → `createRuinsJournal` →
  `placeRuinNotes`, throwing early if `!region.geography.sceneId` ("run
  Geography first"), and returning `{ ruins: { journalId, entries: [...region.ruins.entries, ...newRuins] } }`
  for `runPhase` to merge in.
- **`isPhaseDone(region, phaseId)` extracted into `region.mjs`**, replacing
  the inline done-check that's been growing a special case per phase inside
  `borderlands-wizard.mjs`. `geography` checks `log.length`, `ruins` checks
  `entries.length`, everything else falls back to the existing
  array/object-keys check. `_prepareContext` calls this helper instead of
  inlining the logic.
- `borderlands-wizard.mjs`: after a successful generic `runPhase(region,
  "ruins")`, opens the created `JournalEntry`'s sheet
  (`game.journal.get(region.ruins.journalId).sheet.render(true)`) so the GM
  immediately sees the results — the one bit of `ruins`-specific handling
  needed in the wizard, everything else goes through the unmodified generic
  path.

### 5. Tests — `tests/generation/ruins.test.mjs` and `tests/tables/ruins.test.mjs`

Pure, `__rollQueue`-stubbed, no Scene/JournalEntry stubbing needed for the
roll logic itself:
- `lookupBand` returns the right band at both the low and high end of a
  range, and at a band boundary.
- `rollAncientRuins` produces the right `count` of ruins for a given Table
  1-3 roll, and each ruin's `type`/`menace`/`reason` match the queued rolls.
- Oddity ruins get a 2-entry `purpose` array; every other type gets a
  1-entry array.
- `pickRandomCell` never returns a cell already in `usedCells`.
- Column-sum sanity check (`ANCIENT_MENACES_TABLE` and
  `ORIGINAL_PURPOSE_TABLE` — assert each column's last band `max === 100`)
  as a regression guard on the transcription itself.

`createRuinsJournal`/`placeRuinNotes` are Foundry-side effects and, per the
Geography precedent, are covered by manual verification rather than unit
tests requiring a fuller Foundry stub.

## Verification (Ancient Ruins)

- `npm test` — the above, headless.
- Manual: run Geography to completion first, then click **Roll** on the
  Ancient Ruins row — confirm the count feels right for a couple of re-rolls,
  a "Borderlands — Ancient Ruins" JournalEntry opens automatically with one
  page per ruin (type/menace/purpose/reason/suggested age, each with its
  description), and each page's Note pin is on the scene at the stated cell
  and opens the right page when clicked. Re-running the phase should add
  more pages/pins to the same JournalEntry rather than creating a second one.

## Princes phase design

Much bigger than Geography or Ruins: 11 Renegade Crowns tables (2-1..2-11,
PDF pages 21-35), 7 full 2e example statblocks (one per Prince Type), and —
per your direction — real 4e NPC Actors with **linked Career/Skill/Talent
Items**, not just descriptive text. That last part is only possible because
`Conversion_Rules.pdf` (PDF pages 3-13) turns out to give an exact,
mechanical 2e→4e characteristic-conversion formula plus ~90-entry Career,
Skill, and Talent lookup tables — this isn't GM-judgment territory the way
River placement or Ruin Age are; it's bounded, mechanical data, just a lot
of it.

### Key decisions locked in via AskUserQuestion

- **Full linked Items.** Converted Career/Skill/Talent names are matched
  against the `wfrp4e-core` module's compendium packs at runtime and added
  as real embedded Items on the Actor, not just listed as text. Because of
  this, `module.json` now declares `relationships.requires: [{id:
  "wfrp4e-core", type: "module"}]` — the wfrp4e system's own bundled
  `wfrp4e.basic` pack is not the full compendium; `wfrp4e-core` (the
  official Core Rulebook content module) is what actually has the full
  Skill/Talent/Career library this phase needs to look items up in.
- **One-shot batch**, same pattern as Ancient Ruins: reuse Table 1-3 (the
  book explicitly allows this — "If desired, roll on Table 1-3... use the
  result as the number of princes") to roll a count, then generate all
  princes in one click.
- **Principality**: roll only the *size* (Table 1-1 reroll, ignoring
  terrain, using its existing size-formula-by-row logic from
  `tables/geography.mjs`) and log it on the prince — no auto-placement.
  The book's own guidance here ("apply common sense... borders defined by
  mountains, rivers, cliffs...") is exactly as GM-judgment-heavy as River
  routing in Geography, so it gets the same treatment: rolled/recorded,
  drawn by the GM.
- **NPCs get filed into a shared Actor folder**, the same pattern as
  Geography/Ruins' shared JournalEntry folder — a `"<Map Name>"` `Folder`
  of `type: "Actor"` (Folders are typed per-document-type in Foundry, so
  this is a second folder alongside the JournalEntry one, not a shared
  one). `region.actorFolderId` alongside the existing `region.journalFolderId`.

### 1. Table data — `src/tables/princes.mjs`

Renegade Crowns tables, band/lookup style like `tables/ruins.mjs`:

- **Table 2-1: Type of Prince** — 7 types (Bandit, Knight, Mercenary,
  Merchant, Politician, Priest, Wizard) as a band table, **each entry also
  carries its full example 2e statblock**: `characteristics` (WS BS S T Ag
  Int WP Fel — 4e's Agi, no 2e Dex/Init yet), `secondaryProfile` (A W SB TB
  M Mag IP FP), `career` (the 2e career chain string, e.g. `"Outlaw Chief
  (ex-Veteran, ex-Outlaw)"`), `skills` (array of 2e skill names, some with
  a `+N%` bonus suffix), `talents` (array of 2e talent names), `armour`,
  `weapons`, `trappings`. **Transcription task, not yet done**: PDF pages
  22-26 (book pages 20-24) — verify with `pdftotext -table` the same way
  Geography's Table 1-1 was, since these are dense multi-line blocks prone
  to the same column-misalignment risk in `-layout` mode.
- **Table 2-2: Princely Races** — 8 entries (Dwarf, Elf, Halfling, Human ×5
  cultural flavors — Border Princes/Bretonnian/Empire/Tilean/Other). The
  book's own "impossible combination" rule (no Dwarf/Halfling
  Wizards/Priests — re-roll race) is mechanical, implement it directly, no
  need to ask.
- **Tables 2-3/2-4: Current Career / Career Stage** — rolled and recorded
  as flavor text on the prince (e.g. *"Third career, about one-third
  completed"*) — the book gives no formula for how earlier/later career
  stages change the example statline (that data lives in the WFRP2 core
  book, which isn't a source we have), so these don't feed into the
  characteristic conversion; every prince still starts from the Table 2-1
  type's baseline statblock.
- **Tables 2-5..2-9: Goal, Principles, Style, Secrets, Quirks** — band
  tables with a "Roll Twice" result on Secrets (2-8, up to 4 total, book
  caps it there) and Quirks (2-9, re-roll future 10s, allow a repeated
  result to "count double" per the book's text) — both need a small
  recursive/looping roll helper, not just a single `lookupBand` call.
- **Table 2-10: Courtiers** — band table, count only (0/1/3/4/6/8/10/12/15).
- **Table 2-11: Titles** — 18-entry band table.
- Reuses `ruins.mjs`'s `lookupBand` (import, don't reimplement) and
  `geography.mjs`'s `GEOGRAPHY_TABLE` (for principality size, Table 1-1
  reused — "ignore the type of terrain, and roll the indicated dice").

### 2. Conversion data — `src/tables/conversion.mjs`

Transcribed from `Conversion_Rules.pdf` (PDF pages 3-13). **Not yet
transcribed — this is the first real implementation task for this phase**,
and given the ~90-row Career/Skill/Talent tables' size, each needs the same
`-table`-mode re-extraction + sanity-checking discipline used for Geography
and Ruins before being trusted.

- `CHARACTERISTIC_CONVERSION` — keyed by race (`Human`, `Elf`, `Dwarf`,
  `Halfling`; the 5 Human cultural flavors from Table 2-2 all map to the
  `Human` row), one entry per characteristic with an `action`: `"same"`
  (default), `{ type: "offset", amount: N }` (WS/BS/S/T/Agi/Int/WP/Fel/M —
  applied directly to the statblock's printed 2e value), `{ type:
  "generate", formula }` (Initiative, Dexterity — 2e has no equivalent,
  roll fresh with the race's given dice), or `{ type: "remove" }` (Attacks
  — 4e has no such characteristic). Wounds is **always** recomputed via 4e's
  own formula (`SB + 2×TB + WPB`, using the *converted* S/T/WP), not looked
  up from this table at all.
- `CAREER_CONVERSION`, keyed by 2e career name → `{ career: "4e Career
  name", tier: N, level: "4e Level name" }` or `{ guidance: "text" }` for
  the handful of 2e careers with no official 4e equivalent (e.g. Fieldwarden,
  Jailer, Kislevite Kossar, Targeteer, Vampire Hunter, Ghost Strider —
  the book gives a substitute + reasoning instead of a clean mapping).
- `SKILL_CONVERSION`, `TALENT_CONVERSION` — 2e name → 4e name (specialization
  bracket text, e.g. `"(Strategy/Tactics)"`, carries over unchanged; only the
  base skill name before the bracket gets looked up), or a `{ guidance:
  "text" }` fallback for entries like Meditation ("no official rules...
  substitute for Channelling advances") that don't cleanly become an Item.

### 3. Roll + conversion logic — `src/generation/princes.mjs`

Pure functions, mirroring `ruins.mjs`'s structure:

- `rollPrinces(region)` — rolls Table 1-3 for a count, then per prince:
  type (2-1), race (2-2, re-rolling on an impossible Wizard/Priest +
  Dwarf/Halfling combination), current career + stage (2-3/2-4, flavor
  only), goal/principles/style/secrets/quirks (2-5..2-9), courtiers (2-10),
  title (2-11), principality size (Table 1-1 reroll). Returns plain roll
  results — no Foundry Actor/Item creation here, so this stays unit-testable
  with the `__rollQueue` stub exactly like `rollAncientRuins`.
- `convertCharacteristics(statblock, race)` — applies `CHARACTERISTIC_CONVERSION`
  to a Table 2-1 type's baseline statblock for the rolled race: offsets for
  WS/BS/S/T/Agi/Int/WP/Fel/M, fresh `Roll`s for Initiative/Dexterity, drops
  Attacks, recomputes Wounds from the converted S/T/WP bonuses. Pure,
  Roll-based, unit-testable.
- `convertCareerChain(careerString)` — parses `"Outlaw Chief (ex-Veteran,
  ex-Outlaw)"` into `["Outlaw Chief", "Veteran", "Outlaw"]`, maps the
  *first* (current) name through `CAREER_CONVERSION` for the Actor's active
  career; the `ex-` entries become flavor text in the biography ("formerly
  a Veteran, formerly an Outlaw... (4e-equivalent names)"), not separate
  Items — an Actor only has one current Career in 4e.
- `convertSkillsAndTalents(skills, talents)` — maps each 2e name (splitting
  off any specialization bracket first) through `SKILL_CONVERSION`/
  `TALENT_CONVERSION`; returns `{ resolved: [{4e name, specialization}],
  guidance: ["text for entries with no clean equivalent"] }` — `guidance`
  entries become biography notes instead of Items.

### 4. Materializing onto Foundry — `src/generation/princes-actor.mjs`

- `getOrCreateActorFolder(region)` — same pattern as `journal-folder.mjs`,
  new file since Folders are typed per document-type (`type: "Actor"`);
  stores `region.actorFolderId`.
- `resolveCompendiumItems(names, itemType)` — looks up `SKILL_CONVERSION`/
  `TALENT_CONVERSION`/`CAREER_CONVERSION` output names against
  `wfrp4e-core`'s compendium pack(s) (pack id(s) to be confirmed against a
  live world at implementation time — `wfrp4e`'s own bundled pack is a
  single `wfrp4e.basic` pack with mixed item types, `wfrp4e-core` may be
  structured the same way or split per type). Matches by exact name first;
  for a specialized skill/talent with no exact match (e.g. compendium only
  has the generic `"Lore (any)"` template), creates the Item with
  `skipSpecialisationChoice: true` and sets the resolved specialization
  name directly, rather than triggering wfrp4e's interactive specialization
  picker mid-batch-creation (see `skill.js#_handleSpecialisationChoice` —
  that dialog is meant for a human adding one skill at a time, not a batch
  of ~15 per generated prince). Any name that still can't be resolved logs
  a warning and is skipped (added to the biography's guidance list instead
  of silently failing).
- `createPrinceActor(region, prince)` — creates the `npc`-type Actor:
  `system.characteristics.*.initial` from `convertCharacteristics`, career
  Item from the resolved current career, skill/talent Items from
  `resolveCompendiumItems`, `system.details.biography` built from
  race/title/goal/principles/style/secrets/quirks/courtiers/principality
  size/career chain flavor text/guidance notes, filed into the folder from
  `getOrCreateActorFolder`.

### 5. Wiring

- `region.mjs`: `princes: []` → `princes: { actorFolderId: null, entries:
  [] }` (mirrors `ruins`'s shape); `isPhaseDone` gets a `princes` branch
  (`entries.length > 0`) alongside `geography`/`ruins`.
- Generic `runPhase(region, "princes")` — no bespoke roller needed, same
  reasoning as Ruins (no per-step "stop" condition).
- `borderlands-wizard.mjs`: after a successful `runPhase(region, "princes")`,
  no auto-opened sheet planned (unlike Ruins' single journal, there are
  multiple Actors — a "N princes generated" notification is enough; GM
  opens the ones they want from the Actors sidebar/folder).

### Not yet done for this phase

This section is a design pass only, matching how Geography and Ancient
Ruins were planned before being built — **no code for Princes has been
written yet**. Before implementation starts, the Table 2-1..2-11 data and
all three `Conversion_Rules.pdf` tables need transcribing and verifying
(the largest single transcription task in the module so far), and the
exact `wfrp4e-core` compendium pack id(s) need confirming against a real
Foundry world with that module installed.

## Not in scope for this plan (future sessions)

Relationships, Settlements, and Hazards phases — each needs its own table
transcription + process design pass like this one, done when we get to it.
Per the user's direction so far, their eventual Foundry representations
are: Relationships → Journal entries; Settlements → Journal entries +
placeables (same pattern as Ruins); Hazards is still open.

`Conversion_Rules.pdf` (2nd edition → 4th edition WFRP character conversion
rules) is gitignored the same way as `Renegade Crowns.pdf`. Not needed for
Geography or Ancient Ruins — only Princes.
