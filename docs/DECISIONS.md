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
- Cliff is a "boundary" feature — its roll is the escarpment's height in feet, not a square
  count (caught as a bug after an initial wrong implementation tried to claim ~700 cells).
- Zero scene padding — Foundry's 0.25 default made part of the generated map inaccessible.
- **Ban Large Geography Regions setting** (default off): rerolls Table 1-1 results 81-99 on
  maps under 500 squares, 91-99 on 500+, without bumping the running bonus.

## Geography (redesign)

Replaced the original interactive roll-and-immediately-place loop (one `Drawing` batch per
roll, radiating from the map's current frontier) with a single batch action: roll everything
up front, then place it all at once with knowledge of the whole rolled set — see PLAN.md's
"Geography Phase Redesign" section for the full narrative and the AskUserQuestion answers
that locked in the choices below.

- **Single one-shot Roll click**, same shape as every other phase now — the interactive
  `GeographyRoller` dialog and its template are gone entirely.
- Table 1-1 terrain is placed in a **fixed order regardless of roll order**: Swamps →
  Mountains → Hills → Badlands/Plains — later types' seed rules need earlier types already
  on the grid (Hills can't hug Mountains that haven't been placed yet).
- **Special Feature rolls are excluded from the "is the map full" budget** — only
  Swamps/Mountains/Hills/Badlands/Plains `size` rolls count toward `rollGeographyBatch`'s
  stop condition, since every Special Feature lands on top of already-placed terrain (see
  the overwrite decision below) rather than needing its own space.
- Special Features **simply overwrite** whatever terrain cell they land on — no attempt to
  relocate the displaced terrain elsewhere (a locked-in decision; "moving terrain out of the
  way" was judged too complex to resolve generally).
- Special Features that **pick their own location outright never land on the map edge**
  (`interiorCells`/`candidatesFor` in `geography-features.mjs`) — added on user request
  after the initial implementation. Scoped deliberately: Waterfall/Whirlpool and a Geyser
  reusing an existing river are exempt, since their position is anchored to a river's path
  and a river can legitimately reach the border by the routing rules above; forcing those
  off the edge would mean filtering the river itself, contradicting "must be sited on a
  river." Falls back to allowing the border only if the map has no interior cells at all
  (a 1-wide/1-tall map).
- A river's "different region" requirement for its 2nd+ start (skip any region already used)
  means a different **physical placed blob**, not just a different terrain type — two rivers
  can both start in separate Mountains patches.
- **8-directional adjacency** (orthogonal + diagonal) is used everywhere — border adjacency,
  Hills-near-Mountains, river step neighbors — for a more organic look than a 4-directional
  grid produces.
- River pathing is a **biased random walk**, not a straight line: each step weights the
  neighbor directions that reduce distance to the target (nearest Swamp, or the map border
  if the river started in a Swamp) 3x more likely than the rest — an arbitrary but documented
  weighting, since the brief only said "random, not direct line."
- Mountains' first-roll border seed **maximizes its minimum distance to any Swamp cell** —
  a deterministic pick (ties go to the first candidate in scan order), not a Roll call, since
  it's a maximization rather than a random choice.
- Swamps' 2nd+ roll: 80% chance to seed adjacent (border-and-adjacent) to the *immediately
  preceding* Swamp, not any earlier one — falls back to a plain random border cell on the
  20% roll or when no such adjacent-border cell exists.
- Caves' entrance count is `max(1, floor(size/10))`; every entrance past the first must fall
  within `size` distance **of the first entrance specifically** (not the sum of all pairwise
  distances) — the book's "total distance" phrasing is inherently ambiguous once there are
  3+ entrances, so this is a documented interpretation, not a literal reading.
- Tor/Volcano's terrain preference is a **70/30 weighted roll** (70% restricted to the
  preferred terrain when any exists) — the book says "preference," not a number.
- Geyser's "no river exists" fallback places it at a random cell and starts a **brand-new
  river sourced from that exact cell**; Waterfall/Whirlpool's fallback instead generates a
  river the normal way (region-preference start) — these are two different fallback shapes
  because Geyser's own rule text ties the feature directly to the river's source, while
  Waterfall/Whirlpool just need *some* river to sit on.
- Re-running Geography on a region that already has a Scene **reuses it** (clearing its
  Drawings first) instead of creating a second one, matching the "reuse folder/journal,
  rebuild content" convention already used by Relationships/Settlements' per-owner pages.
- **Global Illumination is enabled** on the created Scene — the map should be immediately
  explorable without the GM having to hand-light it first.
- **A river's arrival check runs *after* each step, not before** (`walkFromCell`,
  `geography-rivers.mjs`) — live-tested bug: Mountains/Swamps are themselves seeded at the
  map border, so a river's source (or the cell its mandatory "step into an adjacent region"
  move lands on) is frequently already a border cell; checking for arrival before any
  wandering step made those rivers stop dead on the spot instead of crossing the map. Fixed
  by requiring at least one genuine step past step-1 before the border/Swamp target can be
  declared reached.
- **Drawing `fillAlpha` encodes vegetation density** (`VEGETATION_OPACITY`, `tables/geography.mjs`,
  used by `geography-scene.mjs`'s `paintGrid`): Forested 1, Grassy 0.8, Scrubland/no-qualifier
  0.6 (`DEFAULT_VEGETATION_OPACITY`), Barren/Desert 0.4 — the user's own exact values, added
  after seeing the map that fill color alone (`FEATURE_COLORS`, terrain category only) can't
  distinguish "Forested Hills" from "Barren Hills."
- **Cliff traces the *connected* shared boundary chain between the two picked regions**, not
  just the one adjacent cell-pair that selected them, and **stops wherever that chain actually
  breaks** — two live-tested bugs. First: the original implementation drew a single 2-cell-
  center line, reading as a token 1-cell mark rather than a boundary; fixed by converting every
  axis-adjacent cell-pair between the same two regions to its shared-edge *corner* points, not
  cell centers (`sharedEdgeCorners`). Second (worse): that fix collected *all* of those corner
  points across the whole map and sorted them along the boundary's dominant axis into one
  polyline — which drew straight lines connecting disconnected stretches of the same two
  regions' border wherever a third blob happened to wedge in between them, cutting straight
  across unrelated terrain. Fixed by replacing the global sort with a **connected-edge walk**
  (`walkBoundaryChain`): starting from the randomly-seeded boundary segment, extend outward one
  shared corner at a time in each direction, but only while exactly one unvisited segment of
  the *same region pair* continues from the current corner. A branch point (3+ blobs meeting at
  one corner) or a dead end — including a third blob interrupting what would otherwise look
  like a continuous border — stops the walk right there rather than jumping elsewhere. Works
  cleanly for a straight/convex shared border; a boundary that loops back on itself is also
  handled correctly (each segment can only be consumed once per walk direction) but a highly
  branching boundary only ever draws through its first uninterrupted run from the seed, not the
  whole tree — a documented "we'll try," not a general polygon-boundary solver.
- **Cliffs are painted through their raw corner points, rivers through cell centers** — a
  second live-tested bug: `sharedEdgeCorners` already returns exact grid-line intersections,
  but `paintCliffs` was reusing the same "+gridSize/2, treat as a cell coordinate" pixel
  conversion as `paintRivers`, which shifted every Cliff half a cell off the true boundary —
  it read as running through cell centers instead of along the actual edge. Fixed by giving
  each painter its own `toPixel` mapper (`geography-scene.mjs`).
- **A river that reaches the map border gets one extra synthetic path point** projecting
  straight out to the true pixel edge (`borderExitPoint`, a fractional cell-coordinate like
  `x: -0.5`) — otherwise the drawn line, built from cell-*center* points, visibly stopped
  short of the actual border instead of touching it. This point is never a real grid cell —
  `geography-features.mjs`'s `realPathCells` filters it back out before Waterfall/Whirlpool
  ever try to place a feature "on the river," since a fractional coordinate isn't a placeable
  square.
- **Rivers never re-enter a cell already used by any river** (this one or an earlier one in
  the same batch) — a shared, mutated-in-place `usedCells` Set threaded through
  `walkFromCell`/`walkRiverPath`/`placeRivers`, and separately rebuilt from `rivers` for
  Waterfall/Whirlpool/Geyser's own "generate a river first" fallbacks in
  `geography-features.mjs`. A step with no legal (unused, non-uphill) neighbor just ends the
  river there — no fallback to crossing anyway.
- **Rivers never step uphill** (`ELEVATION_TIER`, `tables/geography.mjs`: Mountains 2 >
  Hills 1 > Plains/Badlands/Swamps 0, all three low-ground types ranked equal since the book
  doesn't order them against each other) — applies to every step, including the mandatory
  step-1 "leave the source region" move.
- **A river's source cell prefers non-border, closest to the map's center** — a deterministic
  pick (`pickSourceCell`, ties go to the first candidate in scan order), mirroring
  `geography-terrain.mjs`'s Mountains-farthest-from-Swamp precedent; a documented judgment
  call, since the brief said "prefer," not an exact mechanic. Falls back to the region's own
  border cells only if it has no interior cells at all.
- **Cave entrances get a location-aware Scene label** ("Cave entrance in Grassy Hills"),
  reading the terrain/vegetation the cell had *before* being overwritten
  (`caveEntranceLabel`) — stored as a `label` field on the grid cell distinct from `terrain`
  (which stays `"Caves"` for `FEATURE_COLORS`/`isPhaseDone`-style lookups); `paintGrid`
  prefers `cell.label` over the usual vegetation+terrain text when present.
- **Drawing stroke widths**: Cliff 10px, River 8px (both up from an initial flat 4px, on user
  request); River additionally gets `bezierFactor: 1` (full smoothing) since it's meant to
  wander organically, while Cliff stays an unsmoothed straight polyline (a boundary line, not
  a meandering one).
- **A river reaching a Swamp gets one extra synthetic path point touching the Swamp tile's own
  edge (or corner, for a diagonal approach)** — not its center, and not a real placeable cell
  either (unlike the first version of this fix): `swampTouchPoint` pulls the target Swamp
  cell's center back half a cell along whichever axis the approach came from, the same
  fractional-coordinate convention `borderExitPoint` uses for a border arrival — so it's
  filtered out by `realPathCells` just like `borderExitPoint` is, never mistaken for a
  placeable cell by Waterfall/Whirlpool.
- **The map border always wins over a Swamp target, even mid-walk toward one** — a river
  biased toward the nearest Swamp that reaches the map edge first now just flows off the map
  there, rather than being forced to keep hunting for a Swamp it may never legally reach
  (`walkFromCell`'s `hasArrived` checks `isBorderCell` unconditionally, Swamp-adjacency only as
  a second path). If a cell happens to satisfy both simultaneously, the border extension point
  is used, not the Swamp one.
- **`placeRivers` guarantees at least one river even when zero River results were rolled** on
  Table 1-1 — a map with no rivers at all reads as a generation gap rather than a legitimate
  roll outcome, so one extra river is force-started the normal way (`pickStartRegion` +
  `walkRiverPath`) if the roll-driven loop placed none and at least one region exists.
- **Rivers never take a diagonal step that visually crosses another diagonal step through the
  same 2x2 block, even when the two steps share no cell** — a live-tested bug: with a 2x2
  block's corners labeled clockwise 1/2/3/4, a river could path `1 -> 3` (the "\" diagonal)
  and, later (this river or another), `2 -> 4` (the "/" diagonal of the *same* block) — the two
  segments cross dead in the middle of the block, but `usedCells`'s plain cell-level tracking
  never catches it since neither step's endpoints overlap. Fixed with `diagonalKey` (the
  block's top-left corner + which of its two diagonals a step follows) and a parallel
  `usedDiagonals` Set threaded everywhere `usedCells` already was — `stepCandidates` rejects
  any diagonal candidate whose step would use the block's *other* diagonal if that one's
  already claimed.
- **Isolated Mountain is placed *before* rivers, and counts as Mountains-tier elevation** — the
  only Special Feature placed ahead of `placeRivers` rather than after it, specifically so a
  river's elevation check (`ELEVATION_TIER`) already knows about it and won't flow uphill onto
  or through it, the same as it wouldn't for a real Mountains region. `generateGeography`
  splits Table 1-2's rolls: `placeIsolatedMountains` runs first (on the full roll set), then
  `placeRivers`, then `placeSpecialFeatures` runs on the *remaining* rolls (Isolated Mountain
  filtered out, since it's already placed) — every other Special Feature stays after rivers
  since several of them (Geyser/Waterfall/Whirlpool/Pool) directly depend on rivers existing.
- **A river walk that dead-ends without reaching its target (border or Swamp) is discarded and
  retried from the same source**, up to `MAX_RIVER_WALK_ATTEMPTS = 20` times
  (`walkFromCellUntilArrived`), rather than being kept as a short, visually-truncated river — a
  dead end here means boxed in by the uphill/no-crossing constraints or the step cap, not a
  legitimate "arrived." `walkFromCell` itself is unchanged in what it attempts each try; it now
  returns `{ path, arrived }` instead of a bare array so the wrapper can tell a genuine arrival
  from a dead end. Each attempt gets its own scratch copy of the shared `usedCells` Set so a
  failed attempt's claimed cells don't permanently block later rivers — only a successful
  attempt's cells are committed back. Falls back to the last (unfinished) attempt's path if
  every retry fails, rather than producing nothing at all; on a sufficiently small/pathological
  grid this can legitimately exhaust all 20 attempts (see the `placeRivers` preference-order
  test, whose 3-cell-wide grid is too small for a river to ever genuinely arrive).

## Hex grid support

A new **Default Grid Shape** world setting (`defaultGridShape`, "square"/"hex", default
"square") lets a Scene use hexagonal tiles instead of squares — Geography's placement rules
(terrain blobs, rivers, cliffs, special features) and Ancient Ruins' Note placement all now
work for either. See PLAN.md's "Hex grid support" section for the full plan.

- **One hex orientation for v1: pointy-top, odd-row offset** (Foundry's `HEXODDR`). The other
  3 orientations (flat-top, even-offset) are the same amount of extra work per orientation for
  no functional gain — the hard part is the square/hex abstraction, not which layout sits
  behind it — so only one ships now.
- **World-scope setting only, no per-run command-arg override** — read once by
  `generateGeography` exactly like `banLargeRegions`, then stored on
  `region.geography.gridShape` so a re-run of an existing region keeps its original shape even
  if the setting changes later (mirrors `mapSize`'s own "read once, then fixed" behavior).
  `createRegion`'s own `gridShape: "square"` default is just an unset placeholder — the read-
  from-setting-or-reuse-stored-value branch in `generateGeography` keys off whether
  `region.geography.sceneId` already exists (a real prior run), not off the field's value.
- **Cells stay addressed by the same `{x, y}` offset coordinates (x = column, y = row) for
  both grid types** — the single biggest scope-control decision here. `geography-terrain.mjs`,
  `geography-rivers.mjs`, and `geography-features.mjs` never branch on grid type at all; they
  only call `neighborsOf`/`cellDistance`/`isBorderCell`/etc. out of `geography-grid.mjs`, which
  is the only file whose logic actually dispatches on `grid.type`. `isBorderCell`/`allCells`/
  `freeCells`/`freeBorderCells`/`cellsOfRegion`/`cellsOfType` needed **no changes at all** —
  border-ness and iteration are rectangle concepts, identical for both types.
- **Hex neighbor/distance math converts offset coordinates to cube coordinates internally**
  (`offsetToCube`/`cubeToOffset`, standard odd-r formulas, reimplemented directly rather than
  relying on Foundry's `HexagonalGrid` class) — cube coordinates make the 6 neighbor
  directions parity-independent (same 6 deltas regardless of row), where offset coordinates'
  neighbor deltas differ between even and odd rows. Kept pure/no-Foundry-dependency so this
  stays unit-testable exactly like the rest of `geography-grid.mjs`.
- **`cellDistance(grid, a, b)` replaces every hand-rolled `Math.hypot` cell-to-cell call** —
  Euclidean for square, cube tile-step distance for hex. Raw Euclidean distance on a hex
  grid's offset coordinates would be wrong (two cells that are genuinely 1 hex-step apart can
  have very different offset-coordinate deltas depending on row parity). Every distance-based
  placement rule (Mountains-farthest-from-Swamp, river source/target bias, Cave cluster
  radius, blob fill order) goes through it, so all of them are automatically correct for
  either grid type with no rule-specific special-casing.
- **`distanceToBorder` stays plain offset-rectangle math for both grid types**, deliberately
  not made hex-aware — it's already just "how far to the nearest edge of the rectangle," a
  judgment call that's a reasonable river-walk weighting heuristic either way, not worth hex
  geometry's added complexity for.
- **Diagonal-crossing prevention (`diagonalKey`/`usedDiagonals`) is square-only** — it exists
  to catch two river steps that visually cross through the same 2x2 block without ever sharing
  a cell, a gap specific to a square grid's diagonal neighbors. Hex neighbors always share a
  real edge, so there's no equivalent ambiguity to catch; `stepCandidates`'s diagonal filter
  and `walkFromCell`'s diagonal-recording calls are both gated behind `grid.type === "square"`
  — inert, never populated or consulted, on a hex grid, with no signature changes needed
  anywhere `usedDiagonals` already threaded through.
- **Cliff boundary corners on a hex grid are represented as the 3 cube coordinates of the (up
  to 3) hexes that meet there**, not a real coordinate — unlike a square grid's corners, which
  land trivially on the offset grid's own integer coordinates. For two cube-adjacent cells A
  and B, intersecting their two 6-neighbor sets (`neighborsOfCube`, not clipped to the grid —
  cube math needs no bounds check, so a corner can legitimately involve an off-grid "virtual"
  third hex right at the map edge) always yields exactly the 2 "third" cells, one per side of
  the shared edge; the two corners are `[A,B,C1]`/`[A,B,C2]`. `sharedEdgeCorners` attaches a
  `.key` string to every corner (both grid types) so `segmentsAt`/`walkBoundaryChain` can
  compare corners by identity alone, never by shape — that's what let the existing connected-
  boundary walk (`walkBoundaryChain`) plug in for hex with **zero changes to its own logic**.
  `key` is stripped back out of the final `cliffs[].path` before it's returned, so a square
  cliff's path keeps the exact plain `{x,y}` shape every existing caller/test already expects.
- **Hex pixel conversion reuses the live `scene.grid` instance** (`geography-scene.mjs`,
  `ruins-scene.mjs`) instead of hand-building a second grid object — once `Scene.create()`
  returns, `scene.grid` is already a real `foundry.grid.HexagonalGrid` matching the Scene's
  configured type/size, with its own `getCenterPoint`/`getVertices`/`cubeToPoint` methods.
  Every painter branches on `scene.grid.isHexagonal`. A hex grid cell is painted as a hexagon
  polygon Drawing (`getVertices`) instead of a rectangle; a Cliff corner's real pixel vertex is
  the average of its (up to 3) hexes' true `cubeToPoint` centers — geometrically exact for a
  regular hex tiling, and correct even when one of the 3 is off-grid, since `cubeToPoint` is
  pure formula with no bounds check.
- **A river's fractional border/Swamp-touch extension point** (`borderExitPoint`/
  `swampTouchPoint`, unchanged, still pure offset-coordinate math for both grid types) **is
  interpreted on a hex Scene by lerping between the real pixel centers of the base cell and
  the offset cell one step further in the direction each fractional axis points**
  (`hexRiverPoint`), rather than assuming square grid-line math — an approximation (a true hex
  neighbor's direction doesn't line up with a square's 8 fixed directions), flagged for visual
  tuning during manual verification rather than treated as exact geometry.
- **A hex Scene's pixel `width`/`height` come from the real `HexagonalGrid`'s own
  `getVertices` bounding box, not `width * gridSize`/`height * gridSize`** — live-tested bug:
  an odd-row-offset grid isn't a clean rectangle in pixel space. Row-to-row spacing for a
  pointy-top grid is `gridSize * sqrt(3)/2 ≈ 0.866 * gridSize`, not a full `gridSize`, so
  sizing the Scene by the square-grid formula left dead space at the bottom; and whichever
  direction Foundry's actual pixel convention shifts the offset rows (not necessarily the same
  direction as any logical/axial "odd-r" convention — the two are independent coordinate
  spaces) pushed some rows' column-0 hex into negative x, clipped by the canvas edge on the
  left. Fixed by `hexBoundingBox` (`geography-scene.mjs`): take the true min/max over every
  cell's `getVertices` for the whole grid, size the Scene to that exact box, and stash the
  resulting `{x,y}` translation as a `hexOffset` Scene flag (`hexOffsetOf`) that every hex
  painter (`paintGrid`/`paintRivers`/`paintCliffs`, and `ruins-scene.mjs`'s `placeRuinNotes`)
  adds to every point it computes.
- **The bounding-box helper takes the Scene's own already-configured `scene.grid` instance —
  it never constructs a second `HexagonalGrid` of its own** — a second live-tested bug,
  introduced by the very first version of the fix above: that version built its own `new
  foundry.grid.HexagonalGrid({size, columns: false, even: false})` to guess at `HEXODDR`'s
  internal config, and the guess was wrong (every tile ended up offset half a cell
  horizontally) — the guessed grid's row parity disagreed with the real `scene.grid`'s, so the
  bounding box measured against one didn't correctly align with vertices painted from the
  other. Fixed by creating the Scene first (at the naive, possibly-wrong `width * gridSize`
  size), then measuring against that Scene's own real `scene.grid`.
- **Painted hex content is never translated — every painter uses `scene.grid`'s raw output
  as-is** — a third live-tested bug: the version above this one also *translated* every
  painted point by the bounding box's `-minX/-minY`, to pull negative-x content on-canvas.
  That drifted every Drawing away from Foundry's own native grid-line rendering, which draws
  straight from `scene.grid`'s untranslated math with no knowledge of any extra shift applied
  on top — confirmed by a live screenshot showing our tiles' first row starting with a full
  cell while Foundry's own grid lines correctly showed it as a half-cell (a rectangular
  offset-coordinate hex grid's normal, expected look — the same jagged/sawtooth edge every hex
  map tool produces, not a defect to hide). Fixed by dropping the translation entirely
  (`hexPixelExtent`, formerly `hexBoundingBox`, now only used to size the Scene's `width`/
  `height` to the grid's true `maxX`/`maxY` — no `minX`/`minY` tracking, no offset, no Scene
  flag) — every hex painter's points are now pixel-identical to Foundry's own grid lines by
  construction, since both come from the exact same untranslated `scene.grid` math.
- **Foundry's raw `HEXODDR` grid clips the left point of every even row's (0, 2, 4, ...) cells,
  not row 0's top** — a fourth live-tested bug, found after the fix above: with translation
  gone and every painter using `scene.grid`'s raw output directly, cells still rendered
  clipped. The first attempt at a fix (below, kept only as a lesson) guessed the clipping was
  vertical — Foundry's raw row 0 sitting exactly on the Scene's top edge — and tried skipping
  it (`detectHexRowShift`, shifting every row index by 1); live-tested and **produced no
  visible change at all**, the wrong axis entirely. The real fix, from the user's own precise
  diagnosis after that miss: it's horizontal, and specific to even rows — an even row's own
  column 0 cell needs to start from Foundry's raw column `x + 1`, not `x`, while odd rows are
  untouched (`hexColumnOf(x, y) = y % 2 === 0 ? x + 1 : x`, `geography-scene.mjs`). Every hex
  painter (`paintGrid`, `paintRivers`'s `hexRiverPoint`, `paintCliffs`, and
  `ruins-scene.mjs`'s `placeRuinNotes`) routes every `{i, j}` lookup through it instead of using
  `x` directly. No detection/flag needed this time — it's a fixed per-row-parity rule, not
  something to guess and store. Cliff corners need one extra step since their
  `{hexes: [cube,cube,cube]}` are pure logical cube coordinates from `geography-features.mjs`
  (grid-shape-agnostic, unaware of Foundry's raw column layout) — each is round-tripped
  offset→`hexColumnOf`→cube (`cubeToOffset`/`offsetToCube`, both exported from
  `geography-grid.mjs`) before `cubeToPoint`. `hexPixelExtent` scans the same `hexColumnOf`-
  shifted columns rather than `0..width-1`, so the Scene comes out correctly wider (about half
  a tile, from even rows needing one extra column of run-up room) — the exact amount falls out
  of the live grid's own vertex geometry rather than being hand-computed as a fraction.

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
