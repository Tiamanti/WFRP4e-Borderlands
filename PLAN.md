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

## Not in scope for this plan (future sessions)

Ancient Ruins, Princes, Relationships, Settlements, and Hazards phases — each
needs its own table transcription + process design pass like this one, done
when we get to it. Per the user's direction so far, their eventual Foundry
representations are: Ancient Ruins → Journal entries + scene placeables;
Princes → NPC Actors; Relationships → Journal entries; Settlements → Journal
entries + placeables (same pattern as Ruins); Hazards is still open.

A second source PDF has been added: `Conversion_Rules.pdf` (2nd edition →
4th edition WFRP character conversion rules) — relevant to the **Princes**
phase, since *Renegade Crowns* is a 2e book and generated princes will need
their statistics converted to build a 4e NPC Actor. Not needed for Geography.
Housekeeping for later: gitignore this PDF the same way as `Renegade
Crowns.pdf` (currently only the latter is listed in `.gitignore`).
