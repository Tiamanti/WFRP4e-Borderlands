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
River placement or Ruin Age are; it's bounded, mechanical data. Per the
decision below, that ~90-row Career/Skill/Talent data gets *applied* once
by hand during transcription rather than shipped as a live lookup engine,
so it never actually becomes ~90 rows of runtime code.

### Key decisions locked in via AskUserQuestion

- **Convert once, at transcription time, not at roll time.** Originally
  planned as a live ~90-row Career/Skill/Talent lookup engine
  (`tables/conversion.mjs`) run against every generated prince. Per your
  direction ("run conversion before we implement so we don't do it every
  time"), the 7 Table 2-1 statblocks are instead **hand-converted to 4e once
  while transcribing them**, using `Conversion_Rules.pdf`'s tables purely as
  a one-time reference during that transcription pass — the PDF's ~90-row
  tables themselves never get encoded as shipped runtime data. `tables/princes.mjs`
  stores the *already-4e* career/skill/talent names directly. This only works
  because the Table 2-1 statblocks are Human-baseline and every 2e→4e
  characteristic for Human is "remain the same" — see the revised §1/§2/§3
  below for exactly what's still resolved at runtime (only race, which is
  rolled per prince) versus baked into the table (career/skill/talent,
  Human-baseline characteristics).

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
  drawn by the GM. **Post-verification correction**: Table 1-1's size
  formulas run as high as `1d10 * 50` (max 500) — reused unclamped, a
  lucky high roll on one prince next to unlucky low rolls on the others
  produced exactly the lopsided region (350 squares vs. 59 combined) the
  user flagged after testing. `rollPrincipalitySize` now clamps the result
  to `MAX_PRINCIPALITY_SIZE = 100` (`generation/princes.mjs`). Knock-on
  effect: this makes Settlements' "Large" principality band (Table 3-1,
  `principalitySize > 150`) permanently unreachable — harmless (every
  principality just resolves as Small or Medium for village-count
  purposes), flagged here rather than silently left unnoticed.
- **NPCs get filed into a shared Actor folder**, the same pattern as
  Geography/Ruins' shared JournalEntry folder — a `"<Map Name>"` `Folder`
  of `type: "Actor"` (Folders are typed per-document-type in Foundry, so
  this is a second folder alongside the JournalEntry one, not a shared
  one). `region.actorFolderId` alongside the existing `region.journalFolderId`.

### 1. Table data — `src/tables/princes.mjs`

Renegade Crowns tables, band/lookup style like `tables/ruins.mjs`:

- **Table 2-1: Type of Prince** — 7 types (Bandit, Knight, Mercenary,
  Merchant, Politician, Priest, Wizard) as a band table, **each entry also
  carries its full example statblock, hand-converted to 4e at transcription
  time** (see the top-level decision above — not a runtime conversion):
  `characteristics` (WS BS S T Ag Int WP Fel, as **4e Human-baseline
  values** — for Human the 2e printed number *is* the 4e number per
  `Conversion_Rules.pdf`'s "remain the same" rule for every one of these
  eight, so this is a direct transcription, not a converted one; Initiative
  and Dexterity are omitted here entirely since 2e has no equivalent stat —
  they're rolled fresh at runtime, see §3), `secondaryProfile` (A W SB TB M
  Mag IP FP), `career` as an **already-4e, already-parsed** structure (e.g.
  `{ career: "Outlaw", tier: 3, level: "Outlaw Chief", priorCareers:
  ["Veteran", "Outlaw"] }` — the 2e chain string and the
  `CAREER_CONVERSION` lookup both collapse into this one hand-done mapping),
  `skills` (array of **already-4e** skill names with specialization already
  resolved, e.g. `"Charm"`, `"Lore (Reikland)"` — some with a `+N%` bonus
  suffix carried over from the 2e entry), `talents` (array of **already-4e**
  talent names), `armour`, `weapons`, `trappings`. A handful of 2e
  skills/talents have no clean 4e Item equivalent (per
  `Conversion_Rules.pdf`'s own guidance-text fallbacks, e.g. Meditation) —
  those are recorded as plain strings in a `guidanceNotes` array instead of
  `skills`/`talents`, and become biography text rather than Items (§4).
  **Transcription task, not yet done — now the single biggest task in this
  phase**: PDF pages 22-26 (book pages 20-24) for the raw 2e statblocks,
  cross-referenced against `Conversion_Rules.pdf` PDF pages 3-13 for the
  Career/Skill/Talent name mapping, done by hand once per statblock. Verify
  the Renegade Crowns extraction with `pdftotext -table` the same way
  Geography's Table 1-1 was (dense multi-line blocks, same
  column-misalignment risk in `-layout` mode); the Conversion_Rules tables
  only need a one-time `-table` re-check as a lookup aid, since none of
  their rows get encoded verbatim into shipped data.
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

### 2. Characteristic generation — `src/tables/race-conversion.mjs`

Revised again after implementation started: **race stays narrative-only**
for princes, per direction ("Since Princes will be NPCs I don't think
they use Race as it will be only narrative"). Princes are NPCs, not PCs —
unlike a player Character, an NPC's race doesn't need a mechanically
"correct" characteristic conversion; a GM just wants a plausible statline.
So `RACE_CHARACTERISTIC_OFFSETS` (the per-race WS/BS/S/T/Agi/Int/WP/Fel/M
offset table originally planned here) was **dropped entirely** — every
prince uses the Table 2-1 type's baseline characteristics unchanged,
regardless of rolled race. Table 2-2 is still rolled (and still applies the
book's "impossible combination" reroll for Dwarf/Halfling Wizards/Priests,
since that's a lore-plausibility rule, not a stat rule) — the result just
becomes flavor text (`system.details.species.value`) instead of feeding
characteristic math.

What's left in this file is much smaller: `NEW_CHARACTERISTIC_DICE`, a
single `{ initiative, dexterity }` dice pair (Conversion_Rules.pdf's Human
row — 2e has neither stat at all, so both are always "Generate New Stats"
regardless of race). Wounds isn't computed here either — the wfrp4e system
auto-calculates it from S/T/WP once the Actor's characteristics are set
(`StandardActorModel#computeWounds` in `packages/wfrp4e/src/model/actor/
standard.js`, "avg size" case: `SB + 2×TB + WPB`), so duplicating that
formula here would just be redundant.

### 3. Roll + conversion logic — `src/generation/princes.mjs`

Pure functions, mirroring `ruins.mjs`'s structure:

- `rollPrinces(region)` — rolls Table 1-3 for a count, then per prince:
  type (2-1), race (2-2, re-rolling on an impossible Wizard/Priest +
  Dwarf/Halfling combination — narrative only, see §2), current career +
  stage (2-3/2-4, flavor only), goal/principles/style/secrets/quirks
  (2-5..2-9), courtiers (2-10), title (2-11), principality size (Table 1-1
  reroll). Returns plain roll results — no Foundry Actor/Item creation
  here, so this stays unit-testable with the `__rollQueue` stub exactly
  like `rollAncientRuins`.
- `convertCharacteristics(statblock)` — takes *no* race parameter (see
  §2): returns the Table 2-1 type's baseline characteristics plus fresh
  `Roll`s for Initiative/Dexterity via `NEW_CHARACTERISTIC_DICE`. Pure,
  Roll-based, unit-testable.
- No `convertCareerChain`/`convertSkillsAndTalents` functions. `prince.career`/
  `.skills`/`.talents`/`.guidanceNotes` are read directly off the Table 2-1
  entry (§1); they're already 4e and don't vary by race, so there's
  nothing left to convert at roll time.

### 4. Materializing onto Foundry — `src/generation/princes-actor.mjs`

- `getOrCreateActorFolder(region)` — same pattern as `journal-folder.mjs`,
  new file since Folders are typed per document-type (`type: "Actor"`);
  mutates `region.actorFolderId` directly (top-level on the region, not
  nested under `princes` — mirrors `region.journalFolderId`).
- Pack discovery ended up reusing **wfrp4e's own lookup utilities** rather
  than a hardcoded pack id or a `wfrp4e-core`-only search, both of which
  were tried first and turned out wrong: manual playtesting found "Basic"
  skills like Stealth and Ride weren't resolving even though wfrp4e-core
  was installed — they ship in the **wfrp4e system's own** bundled pack,
  not wfrp4e-core's, so a search scoped to `wfrp4e-core` alone missed
  them. `game.wfrp4e.utility.findExactName(name, type)` /
  `findBaseName(name, type)` (`packages/wfrp4e/src/system/utility-wfrp4e.js`)
  are the same helpers wfrp4e itself uses to resolve items by name — they
  search every compendium pack tagged with that item type
  (`game.wfrp4e.tags.getPacksWithTag`, which scans *all* installed packs'
  own indexes, not any one module's), so this now finds items regardless
  of which module actually ships them. `wfrp4e-core` stays a required
  dependency because it's what supplies the "Advanced"/grouped skills,
  Careers, and Talents the system's own pack doesn't have.
- `findItem(baseName, itemType)` — `findExactName` first; `findBaseName`
  as a fallback for a specialised name with no exact entry (e.g. only a
  generic `"Lore (any)"` template exists) — `findBaseName` matches on the
  name before the `"(...)"` bracket and returns a *clone already renamed*
  to the full specialised name, so no separate generic-template handling
  is needed on this module's side. The caller still creates the embedded
  Item with `skipSpecialisationChoice: true` so wfrp4e's interactive
  specialisation picker doesn't pop mid-batch-creation
  (`skill.js#_handleSpecialisationChoice`).
- `resolveCareerItem(career)` — career Items are per-tier: the compendium
  entry's `name` is the *level* name (e.g. `"Outlaw Chief"`), and
  `system.careergroup.value` is the career line (e.g. `"Outlaw"`) —
  matched on both, not just the level name, since level names aren't
  necessarily unique across different career lines. Not a `findItem` call
  since that only matches on name.
- `resolveNamedItems(names, itemType)` — resolves a list of already-4e
  Skill/Talent names into embeddable Item data; anything not found in any
  installed compendium is collected into `missing` instead of silently
  dropped, and surfaced in the biography's "Not found automatically" list.
- `resolveBasicSkills(existingSkillNames)` — princes *should* have
  wfrp4e's standard Basic Skills set (untrained-usable skills like Charm,
  Dodge, Gossip — makes the NPC much easier to actually run at the table,
  not just flavor completeness), the same set wfrp4e's own "Add Basic
  Skills?" prompt offers. Fetched directly via
  `game.wfrp4e.utility.allBasicSkills()` instead of going through that
  prompt, filtering out anything already covered by `prince.skills`
  (compared by base name, ignoring a `"+N%"` suffix) so the two sources
  never produce a duplicate Item for the same skill.
- `Actor.create(data, { skipItems: true })` — without this, wfrp4e's own
  `Actor#_preCreate` (`packages/wfrp4e/src/documents/actor.js`) sees an
  Actor being created with no `data.items` (this module adds Items via a
  separate `createEmbeddedDocuments` call right after, not in the initial
  `Actor.create` payload) and pops its own "Add Basic Skills?" confirm
  dialog regardless. `skipItems: true` suppresses that prompt — this
  phase already includes its own deduped Basic Skills set (above) in the
  `createEmbeddedDocuments` call, so the prompt would only ever be
  redundant or duplicate-causing here, never additive.
- Skill "+N%" bonus suffixes (e.g. `"Dodge +10%"`) map directly onto
  `system.advances.value` — confirmed from `skill.js#computeOwned()`
  (`total.value = modifier.value + advances.value + characteristic.value`),
  so `advances.value` is already a flat percentage, no /5-per-advance
  conversion needed.
- `createPrinceActor(region, prince, folder)` — creates the `npc` Actor:
  `system.characteristics.*.initial` from `convertCharacteristics` (`ws`,
  `bs`, `s`, `t`, `i` ← rolled Initiative, `ag` ← Agi, `dex` ← rolled
  Dexterity, `int`, `wp`, `fel` — see `standard.js`/`char-gen.js` for the
  system's actual field keys, which don't all match this module's more
  readable internal names), career Item from `resolveCareerItem`,
  skill/talent Items from `resolveNamedItems`, `system.details.species`
  from the rolled race (narrative only, §2), `system.details.biography`
  built from title/goal/principles/style/secrets/quirks/courtiers/
  principality size/prior-career flavor text/`guidanceNotes`/missing-item
  notes, filed into the folder from `getOrCreateActorFolder`. Wounds is
  left for the system to auto-calculate (§2) — not set here at all.

### 5. Wiring

- `region.mjs`: `princes: []` → `princes: { entries: [] }`, with a new
  top-level `actorFolderId: null` alongside `journalFolderId` (not nested
  under `princes` — see §4). `isPhaseDone` gets a `princes` branch
  (`entries.length > 0`) alongside `geography`/`ruins`.
- Generic `runPhase(region, "princes")` — no bespoke roller needed, same
  reasoning as Ruins (no per-step "stop" condition, and no Geography-scene
  dependency either — princes aren't placed on the scene, unlike Ruins).
- `borderlands-wizard.mjs`: after a successful `runPhase(region, "princes")`,
  no auto-opened sheet (unlike Ruins' single journal, there are multiple
  Actors) — instead posts a `ui.notifications.info` with the count
  generated (`BORDERLANDS.PrincesGenerated`), GM opens the ones they want
  from the Actors sidebar/folder.

### Implemented (2026-08-16, commit pending manual verification)

Table 2-1..2-11 transcribed (`pdftotext -table`, cross-checked against
`-layout`) and Table 2-1's 7 statblocks hand-converted to 4e using
`Conversion_Rules.pdf` (also `-table`-verified) as a one-time reference —
see inline comments in `tables/princes.mjs` for the handful of judgment
calls this required (e.g. Conversion_Rules.pdf's own "Anointed Priest →
Priest — Tier 1: Priest" entry contradicts its own "Initiate → Priest —
Tier 1: Initiate" entry; corrected to Tier 3: High Priest, matching the
book's own "ex-Initiate, ex-Priest" career chain). `Table 2-11: Titles`'
bands were shifted by one in `-layout` mode (same failure mode as
Geography's Table 1-1) — `-table` mode confirmed the corrected alphabetical
ordering. 44 vitest tests passing (14 new for Princes), production build
clean.

**First round of manual verification (2026-08-16) found three bugs**, all
fixed in `princes-actor.mjs`/`tables/princes.mjs` (see §4's updated
description above for the pack-discovery fix in detail):
1. Actor creation popped wfrp4e's own "Add Basic Skills?" prompt (answered
   Yes → duplicated skills this phase already adds). Basic Skills are
   wanted on these NPCs (makes them much easier to run at the table), so
   the fix isn't to skip them — `resolveBasicSkills` now fetches the same
   set directly (`game.wfrp4e.utility.allBasicSkills()`), deduped against
   `prince.skills`, and adds it alongside this phase's own resolved
   Items; `Actor.create(data, { skipItems: true })` then just suppresses
   the redundant prompt itself.
2. "Not found" biography notes listed Stealth and Ride — both are "Basic"
   skills that ship in the wfrp4e **system's** own bundled compendium, not
   `wfrp4e-core`'s, so the `wfrp4e-core`-only pack search missed them —
   fixed by switching to `game.wfrp4e.utility.findExactName`/`findBaseName`,
   which search every tagged pack regardless of which module owns it (the
   same lookup wfrp4e itself uses).
3. Biography guidance notes cited `Conversion_Rules.pdf` by name — not a
   document the GM has open in Foundry (unlike `Renegade Crowns.pdf`,
   which this whole module exists to automate) — rephrased to describe the
   conversion fact itself instead of citing the source.

Still pending: a full pass confirming the resolved Items/characteristics
look correct on an actual generated Actor sheet, now that the popup/pack
bugs are fixed.

## Relationships phase design

SPECS.md "RELATIONS GENERATION SUMMARY" — Tables 2-12 through 2-22
(Renegade Crowns, PDF pages 37-43, book pages 35-41). Much smaller than
Princes: no new statblocks, no compendium Items, just a nature/length/cause
roll between pairs of already-generated princes, written up as journal
entries. Requires **at least 2 princes to exist** — `generateRelationships`
gates on `region.princes.entries.length >= 2` and throws otherwise, same
pattern as Ruins gating on Geography's scene.

### Key decisions locked in via AskUserQuestion

- **Two relationships per prince, randomly paired, allowing repeats.**
  For each prince in `region.princes.entries`, roll 2 relationships, each
  against an independently-chosen random *other* prince (self excluded,
  but the same partner can be picked twice, and a pair can end up with two
  separate relationship rolls between them). This matches the book's own
  explicit tolerance for messy results — "It is possible these random
  results will seem deeply stupid... one lord is both allied and at war
  with another" — rather than trying to dedupe pairs. With only 2 princes
  total, both of a prince's rolls necessarily land on the same (only)
  partner, which is the natural degenerate case, not an error.
- **One JournalEntryPage per relationship**, in a single "`<Map Name>` -
  Relationships" JournalEntry — same pattern as Ancient Ruins.

### 1. Table data — `src/tables/relationships.mjs`

Band tables, `lookupBand`-style like `tables/ruins.mjs`:

- **Table 2-12: Diplomatic Relations** — 1d10, 10 types: Alliance,
  Bitterness, Contempt, Envy, Fear, Hatred, Respect, Rivalry, Vengeance,
  War.
- **Table 2-13: Length of Relations** — d100 band, "6 months" through "50
  years."
- **Cause tables, one per relation type except Rivalry** ("Rivalry is the
  default condition in the Border Princes and does not need an exact
  cause" — no roll, no table, just the nature+length): Table 2-14 (Origins
  of Alliance, 10 entries), 2-15 (Springs of Bitterness, 5), 2-16 (Grounds
  of Contempt, 5), 2-17 (Seeds of Envy, 5), 2-18 (Sources of Fear, 5), 2-19
  (Reasons for Hatred, 5), 2-20 (Grounds for Respect, 5), 2-21 (Things to
  Avenge, 5). **Transcription risk flagged**: the `-layout` extraction of
  2-15 through 2-21 shows the same row-shift misprint pattern Table 1-1
  and Table 2-11 had (entry text one band off from its roll range) — every
  one of these needs `-table`-mode re-verification before being trusted,
  not just a copy from the `-layout` read.
- **Table 2-22: Cause of War** — d10, but three of its five bands
  *redirect* into another table instead of giving a final answer: 1-2
  Conquest (final), 3-4 Envy (reroll Table 2-17), 5-6 Fear (reroll 2-18),
  7-8 Hatred (reroll 2-19), 9-10 Vengeance (reroll 2-21). Needs a small
  chained-lookup helper, not a single `lookupBand` call — mirrors
  `rollOriginalPurpose`'s Oddity-column recursion in `generation/ruins.mjs`.
- **Table 2-14's reinforcement re-roll**: "If you have generated an
  alliance that has lasted for ten years or more, there must be a story
  behind it. Roll a second time on Table 2-14 to determine what reinforced
  the alliance... you could roll a third time for particularly old
  alliances." The first threshold (10+ years) is mechanical — any Table
  2-13 result of 10 years or more. The second ("particularly old") isn't
  given a number by the book; **judgment call**: treat 25+ years as the
  threshold for a third roll, flagged inline in the table file rather than
  silently picked.

### 2. Roll logic — `src/generation/relationships.mjs`

- `pickRandomPartner(princes, excludeIndex)` — uniformly picks a random
  *other* prince's index from `region.princes.entries` (pure, `Roll`-based,
  unit-testable) — this replaces the book's manual "number the princes,
  roll a d10/d100 to pick one" indirection (`The Parties` section), which
  exists in the book only because the GM doesn't have a ready-indexed list
  in front of them; this module already does.
- `rollRelationshipCause(nature, length)` — dispatches to the right cause
  table for `nature` (no roll at all for Rivalry), handles Table 2-22's
  War redirect and Table 2-14's Alliance reinforcement re-roll(s).
- `rollSingleRelationship(princes, princeAIndex)` — picks a partner via
  `pickRandomPartner`, rolls Table 2-12 (nature) and 2-13 (length), then
  `rollRelationshipCause`. Returns `{ princeAId, princeBId, nature,
  length, cause }` (uses each prince's `actorId`, not array index, so the
  relationship stays valid even if `region.princes.entries` gets
  reordered — see the Princes-phase fix that added `prince.actorId`).
- `rollRelationships(region)` — for every prince, calls
  `rollSingleRelationship` twice. Pure, unit-testable with the
  `__rollQueue` stub, exactly like `rollPrinces`.

### 3. Materializing onto Foundry — `src/generation/relationships-journal.mjs`

- `createRelationshipsJournal(region, relationships)` — reuses
  `getOrCreateJournalFolder`; journal named `` `${sceneName} -
  Relationships` ``, reused (pages appended) on repeat runs, same pattern
  as `ruins-scene.mjs`. Each page's content links the two princes by
  `@UUID[Actor.<actorId>]{<princeDisplayName>}` (Foundry's inline document
  link syntax) so the GM can jump straight from the relationship writeup
  to either prince's Actor sheet — `princeDisplayName` (tables/princes.mjs)
  is reused here for exact-match display text.
- `postRelationshipsSummary` (`relationships-chat.mjs`) — GM-only chat
  message, same pattern as `ruins-chat.mjs`/`princes-chat.mjs`.

### 4. Wiring

- `region.mjs`: `relationships: []` → `relationships: { journalId: null,
  entries: [] }` (mirrors `ruins`'s shape); `isPhaseDone` gets a
  `relationships` branch.
- `generateRelationships(region)` — throws if
  `region.princes.entries.length < 2` ("Generate at least two princes
  first — relationships need someone to have them with."), otherwise
  calls `rollRelationships`, `createRelationshipsJournal`,
  `postRelationshipsSummary`, generic `runPhase` flow (no bespoke roller).
- `borderlands-wizard.mjs`: after a successful
  `runPhase(region, "relationships")`, opens the relationships journal
  sheet — same as Ruins' auto-open (a single journal makes sense to jump
  to here, unlike Princes' multiple Actors).

### Status: implemented

All of Tables 2-12 through 2-22 were re-verified with `pdftotext -table`
before transcription — the same one-band row-shift `-layout` misprint seen
in Table 1-1 and Table 2-11 was confirmed again across 2-15 through 2-19,
and the correction carried through to 2-20/2-21/2-22 as well. The
"particularly old alliance" third reinforcement-roll threshold is applied
at 25+ years, as planned above (`rollAllianceCause` in
`generation/relationships.mjs`).

One small implementation deviation from the design above: instead of
reusing `princeDisplayName` at journal-render time, `relationships-chat.mjs`
looks up `game.actors.get(princeId)?.name` directly — the Actor's `name`
was already set via `princeDisplayName` at creation time
(`princes-actor.mjs`), so re-deriving it from the stored prince object
would just be redundant. Falls back to `"Unknown Prince"` if the Actor was
deleted out from under a stored relationship.

**Post-verification correction**: after a first look at the generated
journal, the user asked for one page **per prince** instead of one page
per relationship — a GM looking up a specific prince wants everything that
prince is party to in one place, not scattered across N separate two-prince
pages. `relationships-journal.mjs` was restructured: `createRelationshipsJournal`
now takes the full prince list and the *complete* accumulated relationships
array (not just the new batch), groups relationships by prince (matching
either `princeAId` or `princeBId`), and builds one page per prince —
titled with `princeDisplayName`, each relationship rendered as an `<h3>`
subsection naming the *other* prince (e.g. "Exalted One (Priest):
Bitterness"). Pages are keyed by a `princeId` flag rather than matched by
name, so re-running the phase rebuilds an affected prince's page in place
(their full relationship list, old and new together) instead of
duplicating pages — this is why the journal builder now needs the complete
`region.relationships.entries` list, not just each run's new relationships.

**Second correction — not every nature is mutual**: the first pass put a
relationship on *both* princes' pages unconditionally. The user caught
that most natures aren't actually felt by both sides — Bitterness,
Contempt, Envy, Fear, Hatred, Respect, and Vengeance are all one prince's
feeling *about* the other (the book's own language: "the bitter prince
wants...", "one prince thinks the other is weak..."), not something the
target necessarily reciprocates or even knows about. Only Alliance,
Rivalry, and War describe the state of the pair as a whole. Added
`MUTUAL_RELATIONS = ["Alliance", "Rivalry", "War"]` (`tables/relationships.mjs`)
and `relationshipBelongsToPrince` (`relationships-journal.mjs`): mutual
natures land on both princes' pages, everything else lands only on
princeA's page (the prince the relationship was rolled *for* —
`rollSingleRelationship`'s `princeAIndex` — never their randomly-picked
target princeB).

Files: `src/tables/relationships.mjs`, `src/generation/relationships.mjs`
(`pickRandomPartner`, `rollRelationshipCause`, `rollSingleRelationship`,
`rollRelationships`, `generateRelationships`), `relationships-journal.mjs`,
`relationships-chat.mjs`; wired into `region.mjs` (`relationships:
{ journalId, entries }`, `isPhaseDone`) and `borderlands-wizard.mjs`
(auto-opens the journal sheet after a successful run, same as Ruins).
Tests: `tests/tables/relationships.test.mjs` (band coverage, description
completeness), `tests/generation/relationships.test.mjs` (roll-queue traces
for every cause dispatch branch, pairing, and the two-per-prince loop).

## Settlements phase design

SPECS.md "COMMUNITIES SUMMARY" — Tables 3-1 through 3-7 (Renegade Crowns,
book pages 42-49, PDF pages 44-51). All seven tables re-verified with
`pdftotext -table` (no row-shift misprint found this time — `-table` and
`-layout` agreed cleanly, unlike every dense table in Geography/Princes/
Relationships).

### Key decision locked in via AskUserQuestion

**Journal-only, no scene placement.** Unlike Ancient Ruins, this module has
no record of which grid cells belong to which prince's principality —
Princes deliberately left `principalitySize` as a number only, GM-placed
by hand ("size only — place on the map by hand"). The book's own placement
rules are boundary-dependent ("if *this principality* contains a fertile
valley, place the town there"), which can't be checked automatically
without that boundary data. Two other options were considered — auto-place
everything by searching the whole map for matching terrain regardless of
which prince "owns" it (unfaithful to "this principality's fertile
valley"), or auto-place only the settlements in the uncontrolled area
(where the book's rule genuinely is boundary-free: "place them where you
like") — but the user chose the simplest, fully-faithful option: **every
settlement's journal page states the book's placement preference as text**
(e.g. "Place in a Fertile Valley if the principality has one, else a Tor,
else near a River on Plains, else Hills, else GM's choice"), and the GM
places it by hand once they've decided the principality's actual
boundaries — consistent with how principality size itself is already
handled.

### Process (per prince, then once more for the uncontrolled area)

1. **Town check** (skipped for the uncontrolled area — "there are no towns
   between principalities"): `1d100 + principalitySize` (the prince's
   rolled square count). Total > 100 → the principality has a town (capped
   at one — "extremely large principalities might contain more than one,
   but that is beyond the scope of random generation").
   - Population: `1000 + (3d10 × 100)`.
   - Economic resources: `floor(population / 1000)` (minimum 1) resource
     rolls on Table 3-3, **plus one more if the town's own Table 3-2 roll
     came up "Economic Resource"** — the book's "may add further... the
     number based on population is a minimum" is a genuine judgment call
     on exactly how additive this is; treating a 3-2 "Economic Resource"
     hit as +1 beyond the population floor is the reading used here,
     flagged inline in the table/roll comments rather than silently
     assumed.
2. **Villages**: Table 3-1 (1d10, banded by principality size —
   `principalitySize` < 80 = Small, 80–150 = Medium, > 150 = Large; the
   uncontrolled area is always treated as Medium regardless of its actual
   size, per the book) gives the village count. Each rolls Table 3-2 once.
3. **Homesteads**: `1d10` interesting homesteads (same formula for both
   principalities and the uncontrolled area — the book's "all villages
   outside principalities have features of interest" is about *villages*
   using the same Table 3-1 mechanic, not a different homestead count).
   Each rolls Table 3-2 once.

### Table 3-2: Community Features cascade

The real complexity of this phase. One d100 roll per settlement (not
banded evenly — 22 explicit bands transcribed in
`tables/settlements.mjs`, ending in an open-ended `91+` band), with a
**cumulative modifier that resets between settlements but not within
one**:

- **Economic Resource** (+10 to next roll on Table 3-2 for *this*
  settlement): rolls once on Table 3-3 (Resource +2/Craft +1/Oddity/Market
  bands, itself cumulative across multiple 3-3 rolls for the same
  settlement — see the town resource-count rule above). Resource → Table
  3-4 (13 named resources; gemstone/gold/silver mines auto-flag
  Stronghold). Craft → Table 3-5 (16 named crafts; Gem Cutter/Goldsmith
  auto-flag Stronghold). Oddity → Table 3-6 (10 flavor entries, terminal —
  no further roll). Market is terminal but sticky: once a settlement rolls
  Market, *later* Table 3-3 rolls for that same settlement that land on
  Market are treated as Craft instead ("treat future results of Market as
  Craft").
- **Stronghold**, **Cultists**: terminal flags, just descriptive
  (`RELATION`-style short description dictionaries, no further roll).
- **Chokepoint**: terminal flag, but triggers one more Table 3-2 roll for
  the same settlement ("roll again, and ignore further results of
  Chokepoint" — so a second Chokepoint on the reroll is treated as
  "nothing further," not a third roll).
- **Special**: rolls on Table 3-7 (1d10): 1-2 **Roll Twice** on Table 3-2
  again (same recursive-cap pattern as Princes' Secrets/Quirks — stop
  once capped, matching the book's own "ignore it once the settlement
  becomes ridiculous"); 3 Cultists (same flag as above); 4 Hospital; 5
  Magical Effect; 6 **Monastery** (if rolled for a *town*, re-roll the
  town's Table 3-2 result and apply Monastery to a village/homestead
  generated for the same area instead — "the orders do not establish
  their monasteries in centres of population"); 7 Monster; 8 **Templars**
  (auto-flags Stronghold); 9 Witch; 10 Wizard. All ten are terminal,
  paraphrased-description-only (no further sub-tables) — the extensive
  prose for Templars/Witch/Wizard/Monster in the book is GM color, not
  more mechanics.
- **Negative roll = no feature at all** ("if your roll is a negative
  result, there is no community feature") — reachable only via repeated
  Cultists' `-10` modifier stacking past a low base roll; the mechanized
  version treats any total ≤ 0 as `null`/no feature, same idea as Ruins'
  band lookups but with an explicit floor instead of clamping to 1.

### Data shape

```js
region.settlements = { journalId: null, entries: [] }
```

One entry per settlement: `{ ownerId (prince actorId, or null for the
uncontrolled area), tier: "town"|"village"|"homestead", population,
economicResources: [{ kind: "Resource"|"Craft"|"Oddity"|"Market", detail
}], feature: null | { type: "Stronghold"|"Chokepoint"|"Cultists"|<Table
3-7 result>, ... } }`. Exact shape gets finalized during implementation —
this is the rough contract, not a locked schema.

### Foundry representation

One shared "`<Map Name>` - Settlements" JournalEntry, **one page per
prince plus one page for the uncontrolled area** — same pattern
Relationships just adopted (a GM looking up a prince wants everything
about their principality, including its settlements, in one place), not
one page per settlement. Each settlement is a subsection within its
owning page, including the book's placement-preference text per the
locked-in decision above. No scene `Note`s.

### Status: implemented

`src/tables/settlements.mjs` (Tables 3-1 through 3-7, all re-verified with
`pdftotext -table` — no row-shift misprint turned up this time, unlike
every dense table in Geography/Princes/Relationships), `src/generation/
settlements.mjs` (`rollTownCheck`, `rollVillageCount`, `rollHomesteadCount`,
`rollEconomicResourceDetail`, `rollCommunityFeatures`, `rollSettlement`,
`rollOwnerSettlements`, `generateSettlements` orchestrator),
`settlements-journal.mjs` (one page per prince plus one for the
uncontrolled area, rebuilt in place on re-run — same pattern
`relationships-journal.mjs` established), `settlements-chat.mjs`; wired
into `region.mjs` (`settlements: { journalId, entries }`, `isPhaseDone`)
and `borderlands-wizard.mjs` (auto-opens the journal, same as Ruins/
Relationships).

Two implementation decisions made while coding, refining what's written
above:

- **Table 3-2's chain resolves into every feature it actually produces**,
  not one — `rollCommunityFeatures` returns an array. Chokepoint's bonus
  reroll and Special's Table 3-7 (including its own Roll Twice recursion)
  can each add more entries; a `maxFeatures` cap (6, mirroring Princes'
  `maxSecrets`) stops runaway chains, matching the book's own "ignore it
  once the settlement becomes ridiculous."
- **A town's economic-resource "population minimum" is a simple top-up**,
  not a separate `+1` for an Economic-Resource hit as originally sketched
  above: `rollSettlement` counts whatever Resource/Craft/Oddity/Market
  entries the Table 3-2 chain already produced, then rolls flat
  `rollEconomicResourceDetail` calls (continuing the same per-settlement
  `resourceState` — modifier and the Market-sticky flag both carry over)
  until the array reaches `max(1, floor(population / 1000))`. This is
  simpler than the `+1` rule floated during planning and doesn't
  double-count a chain-produced Economic Resource against the floor.

Tests: `tests/tables/settlements.test.mjs` (band/description coverage),
`tests/generation/settlements.test.mjs` (roll-queue traces for the
Chokepoint reroll, the negative-roll-means-no-feature floor, Special's
Roll Twice recursion, the Monastery-for-town redirect, the Market-sticky
rule, and the population-based resource top-up) — all matched their
hand-computed expected roll sequences on the first run. 98 vitest tests
total, production build clean.

**Post-generation tweak**: each owner's page now sorts its settlements
largest-population-first, so a Town (when one exists) always leads,
followed by villages and homesteads in descending size — easier to scan
than roll order. Manually verified in a live Foundry world.

**Post-generation fix (Princes, not Settlements itself)**: Table 1-1's
size formulas reused for Principality size could roll as high as 500,
producing lopsided principalities (observed: 350 squares vs. 59 combined
across the rest) — capped at `MAX_PRINCIPALITY_SIZE = 100` in
`generation/princes.mjs`'s `rollPrincipalitySize`. Side effect: Table
3-1's "Large" principality band (`principalitySize > 150`) is now
permanently unreachable — harmless (Small/Medium still cover the full
capped range), flagged here rather than silently left as dead code.

## Hazards phase design

SPECS.md "HAZARDS SUMMARY" — Tables 4-1 through 4-12 (Renegade Crowns,
book pages 56-63, PDF pages 58-65). All twelve tables transcribed and
cross-verified with `pdftotext -table` (one real misalignment found and
fixed: Table 4-8's Giant column — `-layout` had shifted it, `-table`
corrected it to Guardian 1 / Raider 2-8 / Reclusive 9-10 / Tribute none).
This is the last of the six phases — once it's built, `wfrp4e-borderlands`
covers the full *Renegade Crowns* generation process end to end.

### Key decisions locked in via AskUserQuestion

- **Table 4-1's lair count is GM-chosen, not random** ("it is something
  you need to decide, in broad terms, rather than randomly generate") —
  the GM picks a campaign style (Few/Moderate/Many), *then* Table 4-1 is
  rolled against that style's column. Surfaced as a minimal `DialogV2`
  prompt (style select + Roll button) when the GM clicks Hazards' Roll
  button — the same interactive-step pattern `GeographyRoller` already
  established, just a single field instead of a whole grid-fill loop, so
  no need to reuse that class directly.
- **Dead Lords (Vampires/Mummies) auto-generate a full personality** —
  the book explicitly suggests reusing Princes' Goal/Principle/Style/
  Secrets/Quirks tables (2-5 through 2-9) for them ("there is no reason
  not to use the rules for generating princes"), calling it optional; the
  module does it automatically for every Dead Lord, consistent with how
  thoroughly every other phase already mechanizes book-optional steps.
  Reuses `PRINCES` module's `GOAL_TABLE`/`PRINCIPLES_TABLE`/`STYLE_TABLE`/
  `SECRETS_TABLE`/`QUIRKS_TABLE` (and their `*_DESCRIPTIONS` dictionaries)
  directly rather than duplicating them — no new personality tables needed
  in `tables/hazards.mjs`. No Actor gets created for a Dead Lord, though:
  unlike Princes' 7 hand-converted archetypes, the book gives no 2e
  statblocks for Vampires/Mummies to convert from, so there's nothing to
  build an NPC Actor's characteristics/skills/talents out of — this stays
  journal text only, same as every other Hazards lair.
- **No scene placement, journal-only** — following Settlements'
  precedent, but on an even stronger textual basis this time: the book's
  own "Placing Lairs" section explicitly disclaims automation ("there are
  no random tables in this section... a random table created with no
  knowledge of your mapped area could not produce sensible results"). Every
  lair's journal page states the book's placement heuristics as text (see
  below) for the GM to act on by hand.

### Process

1. GM picks a lair-count style via the dialog above; roll Table 4-1 (1d10
   against that style's column) → lair count.
2. For each lair: roll Table 4-2 (1d10: 1-2 Chaos, 3-7 Greenskin, 8
   Monster, 9-10 Undead) → dispatch to that branch.

### Chaos branch (Tables 4-3, 4-4, 4-5)

- Table 4-3 (1d10) gives a creature count *and* a modifier to Table 4-4
  *and* either "no roll" (count 1: a solo leader, no followers at all) or
  a row index for Table 4-5.
- Table 4-4 (1d100 + Table 4-3's modifier — the modifier can push the
  total as high as 120, so the table's own bands run past 100) → leader
  type: Daemon, Chaos Warrior, Minotaur, Mutant, Gor (Beastman), or
  Bestigor (Beastman).
- Table 4-5 needs **no independent roll at all** — its row is Table
  4-3's own modifier value, directly (`row = min(5, 1 + modifier)`, the
  table's own "5+" notation *is* that cap), and its column is picked by
  the Table 4-4 leader's type (Gor and Bestigor both use the "Beastman"
  column). Gives a follower-composition string (e.g. "Beastmen and
  Mutants").
- A Chaos Warrior leader additionally gets the book's explicit sub-roll:
  1d10, ≤7 raider, ≥8 seeks rulership.
- **Judgment call**: which of the four Chaos Gods a rolled Daemon serves
  has no die mechanic in the book at all (purely descriptive prose per
  god) — left as GM-facing flavor text naming all four rather than
  auto-picked, since there's genuinely nothing to roll.

### Greenskin branch (Table 4-6)

- Roll once per column (Snotlings, Goblins, Trolls, Common Orcs, Black
  Orcs) — each a **direct 1d10 row lookup, not banded**, independently
  giving a headcount (0 is a valid result for any column).
- The leader is a member of whichever column, scanning right-to-left, is
  the first with a nonzero count (Black Orcs > Common Orcs > Trolls >
  Goblins > Snotlings) — "most bands of Greenskins are led by Orcs."
- All-zero result (every column rolls 0): reroll the whole set from
  scratch ("start again from Snotlings"), capped at a handful of retries
  like every other reroll loop in this module, for safety against a
  pathological stubbed `Roll` in tests.
- Total population > 1000: rolls a raiding-area size by reusing Table
  1-2's Special Feature size formula (the same mechanism Princes reuses
  for principality size) — recorded as text only ("raiding area: N
  squares — place between principalities, moving inconvenient villages to
  the edge"), no scene placement, per the locked-in journal-only decision.

### Monster branch (Tables 4-7, 4-8)

- Table 4-7 (1d10) → type: Giant, Great Eagle, Griffon, Hippogriff,
  Hydra, Jabberwock, Manticore, Wyvern.
- Headcount is a **per-type hardcoded formula**, not a shared table:
  Giant `floor(1d10 / 2)`; Great Eagle `ceil(1d10 / 3)`; Griffon/
  Hippogriff/Hydra/Jabberwock/Manticore always 1 (all explicitly solitary
  in the book's own text); Wyvern 1, or 2 on a 1d10 roll of 9-10.
- Table 4-8 → attitude (Guardian/Raider/Reclusive/Tribute), banded
  per-monster-type — several monster types simply can't roll certain
  attitudes (a `--` band in the book means that attitude isn't reachable
  for that column at all, not a gap to fill in).

### Undead branch (Tables 4-9..4-12)

- Table 4-9 (1d10, banded) → class: Dead Lord, Lone Menace, or Shambling
  Horde.
- **Dead Lord**: Table 4-10 (1d10, banded) → Mummy, or one of four
  Vampire bloodlines (Blood Dragon, von Carstein Exile, Necrarch,
  Strigoi). Always gets a Shambling Horde as servants (rolls Table 4-12
  again, below) plus the auto-generated personality from the locked-in
  decision above.
- **Lone Menace**: Table 4-11 (1d10, banded) → Banshee, Spectre, Wight,
  or Wraith.
- **Shambling Horde**: Table 4-12's own distinct mechanic — roll the
  table's "First Roll" row (1d10, banded into 4 starting-column picks:
  Dire Wolves/Skeletons/Vampire Bats/Zombies), then roll **exactly 4
  times total**, once per column, continuing in wrap-around order from
  the starting column (Dire Wolves → Skeletons → Vampire Bats → Zombies →
  Dire Wolves...) — each roll banded 1-10+ against whichever column is
  current, giving a headcount added to the horde, and applying a shared
  cumulative modifier (the table's own "Notes" column, e.g. "+2 to next
  roll") that carries across all 4 rolls — same "resets per horde, not
  within one" shape as Settlements' Table 3-2 modifier chain. After
  assembly: curse check = `1d10 + floor(hordeSize / 25)`; 10 or higher
  means the horde carries a curse (anything it kills rises to join it).
  A Dead Lord's servant horde reuses this exact same roller.

### Placing Lairs

No automation, on the book's own explicit authority (quoted above). Every
lair's journal page states the book's placement heuristics as text: tied
to a specific community → within 1-2 squares of it; a pure raider → 3-4
squares out; reclusive/solitary → a couple of squares into difficult
terrain, away from any settlement; a large (>1000) Greenskin lair's
raiding-area size (rolled above) → place between principalities, moving
any inconvenient villages to the edge.

### Data shape

```js
region.hazards = { journalId: null, entries: [] }
```

One entry per lair: `{ type: "Chaos"|"Greenskin"|"Monster"|"Undead",
...type-specific fields }` — exact per-branch shape gets finalized during
implementation, not locked here.

### Foundry representation

One shared "`<Map Name>` - Hazards" JournalEntry, **one page per lair**
(numbered, "Lair 1: <type>" etc.) — matches Ancient Ruins' one-page-per-
entry pattern rather than Relationships/Settlements' one-page-per-owner
pattern, since a lair has no natural "owner" to group by the way a
relationship or settlement has a prince. No scene `Note`s, per the
locked-in journal-only decision.

### Status: implemented

`src/tables/hazards.mjs` (Tables 4-1 through 4-12, all re-verified with
`pdftotext -table` — one real misalignment found and fixed, Table 4-8's
Giant column, everything else agreed with `-layout`), `src/apps/
lair-style-dialog.mjs` (`promptLairStyle` — a 3-button `DialogV2`,
resolving to `"few"`/`"moderate"`/`"many"` or `undefined` if dismissed),
`src/generation/hazards.mjs` (`rollNumberOfLairs`, `rollMonsterType`,
`rollChaosLair`, `rollGreenskinLair`, `rollMonsterLair`,
`rollShamblingHorde`, `rollUndeadLair`, `rollLair`, `rollLairs`,
`generateHazards` orchestrator), `hazards-journal.mjs` (one page per lair,
appended — matches `ruins-scene.mjs`'s pattern, not
Relationships'/Settlements' rebuilt-in-place-per-owner pattern, since a
lair has no owner), `hazards-chat.mjs`; wired into `region.mjs`
(`hazards: { journalId, entries }`, `isPhaseDone`) and
`borderlands-wizard.mjs` (special-cases Hazards' Roll button to call
`promptLairStyle()` first, bails out if dismissed, then runs the generic
`runPhase("hazards", style)` flow and auto-opens the journal, same as
Ruins/Relationships/Settlements).

Two mechanics worth calling out, both confirmed by close reading rather
than assumption:

- **Table 4-5 (Chaos Followers) needs no independent roll** — its row is
  Table 4-3's own `followerModifier` value directly (`min(5, 1 +
  followerModifier)`), per the book's own phrasing ("+1 on Table 4-5" as a
  row-selection instruction, not a modifier to a fresh roll).
- **Table 4-12 (Shambling Hordes) rolls exactly once per column**, starting
  on a randomly-picked column and wrapping around the remaining three, with
  a cumulative modifier shared across all 4 rolls (resets per horde, not
  within one — same shape as Settlements' Table 3-2 chain). Reused
  identically for a standalone Shambling Horde lair and for a Dead Lord's
  servants.

Dead Lords auto-generate a full Prince-style personality by reusing
`princes.mjs`'s `GOAL_TABLE`/`PRINCIPLES_TABLE`/`STYLE_TABLE` plus the
now-exported `rollSecrets`/`rollQuirks`, exactly as locked in above — no
duplicate personality tables in `tables/hazards.mjs`.

Tests: `tests/tables/hazards.test.mjs` (band/description coverage across
all twelve tables), `tests/generation/hazards.test.mjs` (roll-queue traces
for every branch, including the Chaos Warrior aim sub-roll, the
rollFollowers:false solo-leader path, the Greenskin all-zero retry and
>1000 raiding-area trigger, each monster's headcount formula, the
Shambling Horde wrap-around order and curse threshold, and the Dead Lord's
full personality generation) — all matched their hand-computed expected
roll sequences on the first run. 136 vitest tests total, production build
clean. **Not yet manually verified in a live Foundry world** — this is
the last of the six phases; once verified, `wfrp4e-borderlands` covers the
full *Renegade Crowns* generation process end to end.

## Settings design

### Status: implemented

Three world-scope settings, requested after all six phases were built.
`src/settings.mjs` (`registerSettings`, called from `Hooks.once("init")`)
registers all three; every setting is read once at its single Foundry-side
call site and threaded down as a plain parameter into the pure roll
functions below it (same pattern Hazards' GM-chosen lair style already
established for `generateHazards(region, style)`), so nothing downstream
needs a `game.settings` stub in tests.

**1. Default Map Size** (`defaultMapSize`, String "WxH", default
`"20x20"`) — `borderlands-command.mjs` parses it with the same
`parseMapSize` helper the `mapSize=WxH` command arg already uses, and
passes the result as that parser's fallback. An invalid setting value
(shouldn't happen — the setting only ever accepts what the picker writes)
falls back to the hardcoded `DEFAULT_MAP_SIZE` constant, same as an
invalid command arg does today.

**2. Ban Large Geography Regions** (`banLargeRegions`, Boolean, default
`false`) — on a map under 500 squares, Table 1-1 results of 81-99 (the
`1d10 * 20` and `1d10 * 50` size-tier rows) are rerolled entirely; on a
500+ square map, only 91-99 (the `1d10 * 50` tier) is banned. The reroll
is a fresh 1d100 against the same running bonus — a discarded attempt
never counts as a step, so the bonus doesn't creep from the retries
themselves. Implemented as a bounded retry loop inside
`rollGeographyStep` (capped at 20 attempts, mirroring Hazards' Greenskin
reroll cap — never realistically hit, since even the narrower 91-99 ban
is only a 9% chance per roll), gated behind the new `banLargeRegions`/
`mapSquares` options so the existing no-option call sites (and their
tests) are unaffected. `GeographyRoller` reads the setting and computes
`mapSquares` from `region.geography.mapSize` fresh on every roll.

**3. Generate Names** (`generateNames`, Boolean, default `true`) — the
open design question here was locked in via two rounds of
AskUserQuestion:

- Princes do **not** get a generated personal name at all — the user
  chose to skip that entirely and leave it to the GM, overriding the
  original request's "generate names for Princes and places." This
  simplified the design a lot: since every settlement in Appendix I is
  cultural-style-based with full 1-100 coverage across all 6 styles (see
  below), there's no case where "no table is available," so the
  originally-proposed `/name` (WFRP4e's own name-gen command) fallback
  turned out to be unnecessary — nothing in the final design calls it.
- A settlement's naming style is **biased 50% toward its owning prince's
  own race-mapped style, 10% each toward the other 5** (the user's own
  phrasing, "a biased table"). Table 2-2's Race table (`RACE_TABLE`,
  `tables/princes.mjs`) only names 4 Human sub-cultures (Border Princes,
  Bretonnian, Empire, Tilean) plus "Other," and Dwarf/Elf/Halfling, none
  of which line up 1:1 with Appendix I's 6 styles (Empire, Bretonnian,
  Tilean, Estalian, Kislevite, Flavourful) — `RACE_TO_STYLE`
  (`tables/names.mjs`) maps the 4 direct matches plus Border
  Princes/Dwarf/Elf/Halfling → Flavourful (the appendix's own "native,
  unclaimed land" style); `"Human—Other"` is deliberately left out of
  that map and instead split 50/50 between Estalian and Kislevite in
  `rollNamingStyleForRace` (`generation/names.mjs`), so every one of the
  6 tables gets used somewhere. This mapping itself wasn't put to
  AskUserQuestion (the question was skipped when Prince naming itself
  was dropped) — a judgment call, flagged here per project convention,
  easy to revisit if it turns out wrong in play. The uncontrolled area
  (no prince) biases toward Flavourful directly (`ownerStyle: null` →
  `"Flavourful"` in `rollSettlementNamingStyle`).

Appendix I's data (`tables/names.mjs`, Tables A-1 through A-12) was
transcribed from `pdftotext -table` output — `-layout` mode wrapped
several longer words ("Hunter's", "Hangman's", "Sigmar's", "Wolf's") onto
the row below instead of alongside their band, shifting that whole
column; every style's band widths were hand-summed to exactly 100 to
confirm the `-table` transcription, the same cross-check used for every
other Renegade Crowns table in this module. One entry (Flavourful's
band 1-2, `"'Wocky"`) is a best-effort reading of a character the PDF's
text layer renders as a bare backtick in both extraction modes, almost
certainly a mis-encoded apostrophe.

`generation/settlements.mjs`'s `rollSettlement`/`rollOwnerSettlements`
both default `generateNames` to `false` (opt-in, keeps their own tests
roll-queue-neutral); `generateSettlements` reads the actual setting and
always passes it through explicitly, so the setting's `true` default is
still what end users see. When on, every settlement (town, village, and
homestead alike) gets a `name`; when off, the field is omitted entirely
rather than `null`, matching how settlements looked before this feature
existed. `settlements-journal.mjs`/`settlements-chat.mjs` both prefix the
name onto their existing tier heading when present.

Tests: `tests/tables/names.test.mjs` (band-width-sums-to-100 coverage
across all 6 styles, `RACE_TO_STYLE`'s exact mapping),
`tests/generation/names.test.mjs` (roll-queue traces for the race→style
mapping including the Human—Other 50/50 split, the settlement style bias
including its uncontrolled-area Flavourful default, and both name-join
conventions — concatenated vs. Flavourful's space-joined pair), plus new
cases in `tests/generation/geography.test.mjs` (the reroll mechanic, both
map-size thresholds, confirming Special Features are never treated as
banned) and `tests/generation/settlements.test.mjs` (a settlement with
`generateNames: true` gets a `name`, matching the existing opt-in default
without one). 157 vitest tests total, production build clean. **Not yet
manually verified in a live Foundry world.**

## Not in scope for this plan (future sessions)

`Conversion_Rules.pdf` (2nd edition → 4th edition WFRP character conversion
rules) is gitignored the same way as `Renegade Crowns.pdf`. Not needed for
Geography or Ancient Ruins — only Princes.
