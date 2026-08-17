// Places Table 1-2 special feature rolls onto the (already fully-placed) terrain grid, each
// per its own terrain preference/avoidance rule (docs/DECISIONS.md "Geography (redesign)").
// Every placement is a simple overwrite of whatever terrain was there — no attempt to
// relocate the displaced terrain elsewhere (locked-in decision; see PLAN.md). Features that
// pick their own location outright never land on the map edge (see interiorCells) — the
// exceptions are Waterfall/Whirlpool and a Geyser reusing an existing river, whose position
// is anchored to a river's path, and rivers can legitimately reach the border by design.
// Pure grid math — no Foundry dependency.

import { allCells, isBorderCell, pickRandomCell, cellDistance, offsetToCube, neighborsOfCube, neighborsOf } from "./geography-grid.mjs";
import { walkRiverPath, walkFromCellUntilArrived, pickStartRegion, diagonalKey } from "./geography-rivers.mjs";

function cellKey(x, y) {
    return `${x},${y}`;
}

function terrainAt(grid, x, y) {
    return grid.cells.get(cellKey(x, y))?.terrain;
}

function overwriteCell(grid, x, y, feature, { label = null } = {}) {
    grid.cells.set(cellKey(x, y), { kind: "special", terrain: feature, vegetation: null, regionId: null, label });
}

/** Every cell any already-placed river has claimed, as `"x,y"` keys — threaded into a brand-new fallback river's walk so it routes around rivers that already exist. */
function usedRiverCells(rivers) {
    const used = new Set();
    for (const river of rivers) {
        for (const cell of river.path) used.add(cellKey(cell.x, cell.y));
    }
    return used;
}

/** Every diagonal step any already-placed river has taken (see geography-rivers.mjs's `diagonalKey`) — threaded into a brand-new fallback river's walk alongside `usedRiverCells` so it can't visually cross an existing river's diagonal through the same 2x2 block. */
function usedRiverDiagonals(rivers) {
    const used = new Set();
    for (const river of rivers) {
        const cells = river.path.filter(c => Number.isInteger(c.x) && Number.isInteger(c.y));
        for (let i = 1; i < cells.length; i++) {
            const a = cells[i - 1], b = cells[i];
            if (a.x !== b.x && a.y !== b.y) used.add(diagonalKey(a, b));
        }
    }
    return used;
}

/**
 * Non-border cells only — every feature that picks its own location outright (as opposed
 * to Waterfall/Whirlpool/an existing-river Geyser, which sit *on* a river's path and a
 * river can legitimately reach the border) keeps off the map edge. Falls back to the full
 * grid only if the map has no interior cells at all (a 1-wide/1-tall map).
 */
function interiorCells(grid) {
    return allCells(grid).filter(c => !isBorderCell(grid, c.x, c.y));
}

/** `predicate`-matching interior cells; relaxes one constraint at a time (predicate, then interior-ness) only as far as needed to find any candidate at all. */
function candidatesFor(grid, predicate) {
    const interior = interiorCells(grid);
    const preferred = interior.filter(predicate);
    if (preferred.length > 0) return preferred;
    if (interior.length > 0) return interior;
    const all = allCells(grid);
    const anyPreferred = all.filter(predicate);
    return anyPreferred.length > 0 ? anyPreferred : all;
}

/** Generates a brand-new river via the normal region-preference start (Waterfall/Whirlpool's "generate a river first" fallback), routed around every cell already-placed rivers used. */
async function generateFallbackRiver(grid, regions, rivers) {
    const region = await pickStartRegion(regions, new Set());
    if (!region) return null;
    const { path } = await walkRiverPath(grid, region, usedRiverCells(rivers), usedRiverDiagonals(rivers));
    const river = { id: rivers.length + 1, startRegionId: region.id, path };
    rivers.push(river);
    return river;
}

/** "Cave entrance in <the terrain it replaced>" — e.g. "Cave entrance in Grassy Hills" — read off the cell's terrain/vegetation *before* it gets overwritten. Falls back to a plain "Cave entrance" if the cell somehow has no prior terrain recorded. */
function caveEntranceLabel(grid, x, y) {
    const prior = grid.cells.get(cellKey(x, y));
    if (!prior) return "Cave entrance";
    const location = prior.vegetation ? `${prior.vegetation} ${prior.terrain}` : prior.terrain;
    return `Cave entrance in ${location}`;
}

function placeCaveEntrance(grid, cell) {
    const label = caveEntranceLabel(grid, cell.x, cell.y);
    overwriteCell(grid, cell.x, cell.y, "Caves", { label });
}

/**
 * `entranceCount = max(1, floor(size / 10))`. First entrance anywhere; each further one is
 * picked within `size` distance of the *first* entrance (a single cluster-radius
 * constraint — the book's "total distance" phrasing is ambiguous with 3+ entrances, so this
 * is a documented judgment call: distance-from-first, not sum-of-all-pairwise-distances).
 * Falls back to the nearest still-free-of-an-entrance cell if the radius has no candidates.
 * Each entrance's Scene label names the terrain it replaced (see caveEntranceLabel).
 */
async function placeCaves(grid, roll) {
    const entranceCount = Math.max(1, Math.floor(roll.size / 10));
    const pool = interiorCells(grid);
    const cells = pool.length > 0 ? pool : allCells(grid);
    const first = await pickRandomCell(cells);
    if (!first) return [];
    placeCaveEntrance(grid, first);
    const entrances = [first];

    for (let i = 1; i < entranceCount; i++) {
        const isEntrance = c => entrances.some(e => e.x === c.x && e.y === c.y);
        const withinRadius = cells.filter(c => !isEntrance(c) && cellDistance(grid, c, first) <= roll.size);
        let next = await pickRandomCell(withinRadius);
        if (!next) {
            const remaining = cells.filter(c => !isEntrance(c))
                .sort((a, b) => cellDistance(grid, a, first) - cellDistance(grid, b, first));
            next = remaining[0] ?? null;
        }
        if (!next) break;
        placeCaveEntrance(grid, next);
        entrances.push(next);
    }
    return entrances;
}

/**
 * The two corners of the shared edge between two adjacent cells `a`/`b`, each corner carrying
 * its own `key` — a string uniquely identifying that physical corner, so the same corner
 * reached from two different cell pairs compares equal. `segmentsAt`/`walkBoundaryChain` only
 * ever compare corners by `.key`, never by shape, which is what lets the same topological walk
 * work for either grid type below unmodified.
 *
 * Square: the two exact integer grid-line-intersection points bounding the shared edge between
 * axis-adjacent cells — cheap, since square corners already land on the offset grid's own
 * integer coordinates.
 *
 * Hex: there's no equivalently trivial coordinate for a hex vertex, so a corner is represented
 * topologically instead — **the 3 cube coordinates of the (up to 3) hexes that meet there**.
 * For two cube-adjacent cells A and B, intersecting their two 6-neighbor sets
 * (`neighborsOfCube`, not clipped to the grid — a corner can legitimately involve an off-grid
 * "virtual" third hex at the map edge, and cube math needs no bounds check to stay correct)
 * always yields exactly the 2 "third" cells, one per side of the shared edge. The two corners
 * are `[A,B,C1]` and `[A,B,C2]`; `key` is those 3 cube coordinates sorted and joined, so two
 * segments that share a real vertex always compute the identical key regardless of which two
 * of the corner's (up to 3) hexes each segment happened to be built from.
 */
function sharedEdgeCorners(grid, a, b) {
    if (grid.type !== "hex") {
        if (a.x !== b.x) {
            const x = Math.max(a.x, b.x);
            const y = Math.min(a.y, b.y);
            return [{ x, y, key: cellKey(x, y) }, { x, y: y + 1, key: cellKey(x, y + 1) }];
        }
        const y = Math.max(a.y, b.y);
        const x = Math.min(a.x, b.x);
        return [{ x, y, key: cellKey(x, y) }, { x: x + 1, y, key: cellKey(x + 1, y) }];
    }

    const cubeKey = c => `${c.q},${c.r}`;
    const cornerKey = cubes => cubes.map(cubeKey).sort().join("|");
    const cubeA = offsetToCube(a.x, a.y);
    const cubeB = offsetToCube(b.x, b.y);
    const bNeighborKeys = new Set(neighborsOfCube(cubeB).map(cubeKey));
    const common = neighborsOfCube(cubeA).filter(c => bNeighborKeys.has(cubeKey(c)));
    return common.map(third => {
        const hexes = [cubeA, cubeB, third];
        return { hexes, key: cornerKey(hexes) };
    });
}

/**
 * Every unvisited-in-`visited` boundary segment (index into `segments`) touching `corner`.
 * Used to extend a walk one hop at a time — see placeCliff.
 */
function segmentsAt(touching, visited, corner) {
    return (touching.get(corner.key) ?? []).filter(i => !visited.has(i));
}

/**
 * Walks a chain of boundary segments starting at `startCorner`, one hop per step, continuing
 * only while exactly one unvisited segment touches the current corner — a branch point (3+
 * blobs meeting at a corner) or a dead end (the region pair's border is interrupted by a
 * third blob wedging in between, or it simply ends) both stop the walk there rather than
 * jumping to an unrelated, disconnected part of the same region pair's border elsewhere on
 * the map. `excludeSegIndex` seeds `visited` so the walk doesn't immediately double back over
 * the segment it started from. Grid-type-agnostic — corners are only ever compared by `.key`
 * (see `sharedEdgeCorners`), never by shape.
 */
function walkBoundaryChain(segments, touching, startCorner, excludeSegIndex) {
    const visited = new Set([excludeSegIndex]);
    const points = [];
    let current = startCorner;
    for (;;) {
        const candidates = segmentsAt(touching, visited, current);
        if (candidates.length !== 1) break;
        const segIndex = candidates[0];
        visited.add(segIndex);
        const [c1, c2] = segments[segIndex];
        const next = c1.key === current.key ? c2 : c1;
        points.push(next);
        current = next;
    }
    return points;
}

/**
 * Picks a random pair of adjacent cells belonging to two different (still-unclaimed-by-a-
 * later-special) regions, both off the map edge, then traces the *connected* shared boundary
 * chain between those two specific regions starting from that pair's edge — extending outward
 * corner-by-corner in both directions only while the border keeps running as a single
 * unbroken line. The two same regions can share a border in several disconnected places (a
 * third blob wedging in between two stretches of e.g. Mountains/Hills border) — those stay
 * separate walks, never bridged into one straight line across unrelated terrain, and a third
 * blob interrupting the line (or a corner where 3+ blobs meet) is exactly where this walk
 * stops.
 */
async function placeCliff(grid, cliffs) {
    /** Neighbor cells to pair `(x,y)` against so each undirected edge is only visited once — the two "forward" axis directions for square, or the natural forward half of `neighborsOf`'s 6 hex directions (hex neighbors are always edge-sharing, unlike a square grid's diagonal neighbors, so no axis restriction is needed there). */
    const forwardNeighbors = (x, y) => grid.type === "hex"
        ? neighborsOf(grid, x, y).filter(n => n.y > y || (n.y === y && n.x > x))
        : [[x + 1, y], [x, y + 1]].map(([nx, ny]) => ({ x: nx, y: ny })).filter(n => n.x < grid.width && n.y < grid.height);

    const buildPairs = excludeBorder => {
        const pairs = [];
        for (const { x, y } of allCells(grid)) {
            if (excludeBorder && isBorderCell(grid, x, y)) continue;
            const cell = grid.cells.get(cellKey(x, y));
            if (!cell || cell.regionId == null) continue;
            for (const { x: nx, y: ny } of forwardNeighbors(x, y)) {
                if (excludeBorder && isBorderCell(grid, nx, ny)) continue;
                const neighbor = grid.cells.get(cellKey(nx, ny));
                if (neighbor && neighbor.regionId != null && neighbor.regionId !== cell.regionId) {
                    pairs.push({ a: { x, y }, b: { x: nx, y: ny }, regionA: cell.regionId, regionB: neighbor.regionId });
                }
            }
        }
        return pairs;
    };

    let pairs = buildPairs(true);
    if (pairs.length === 0) pairs = buildPairs(false);
    const seedPair = await pickRandomCell(pairs);
    if (!seedPair) return null;

    const pairKey = (a, b) => [a, b].sort((x, y) => x - y).join(",");
    const seedKey = pairKey(seedPair.regionA, seedPair.regionB);
    const boundaryPairs = pairs.filter(p => pairKey(p.regionA, p.regionB) === seedKey);

    const segments = boundaryPairs.map(p => sharedEdgeCorners(grid, p.a, p.b));
    const touching = new Map();
    segments.forEach((seg, i) => {
        for (const corner of seg) {
            if (!touching.has(corner.key)) touching.set(corner.key, []);
            touching.get(corner.key).push(i);
        }
    });

    const seedIndex = boundaryPairs.indexOf(seedPair);
    const [cornerA, cornerB] = segments[seedIndex];
    const before = walkBoundaryChain(segments, touching, cornerA, seedIndex).reverse();
    const after = walkBoundaryChain(segments, touching, cornerB, seedIndex);
    const points = [...before, cornerA, cornerB, ...after];
    // `key` is an internal identity for the topological walk above — strip it from the final
    // path so a square cliff's points stay the plain `{x,y}` shape geography-scene.mjs (and
    // every existing test) already expects.
    const path = points.map(({ key, ...point }) => point);

    const cliff = { id: cliffs.length + 1, path };
    cliffs.push(cliff);
    return cliff;
}

/** Random cell where terrain !== Swamps; falls back to allowing Swamps if the whole map is Swamps. */
async function placeFertileValley(grid) {
    const candidates = candidatesFor(grid, c => terrainAt(grid, c.x, c.y) !== "Swamps");
    const cell = await pickRandomCell(candidates);
    if (cell) overwriteCell(grid, cell.x, cell.y, "Fertile Valley");
    return cell;
}

/** At the source of a random existing river (rivers can legitimately reach the border, so this isn't restricted); if none exist, placed at a random interior cell and a brand-new river is walked starting from that cell. */
async function placeGeyser(grid, rivers) {
    if (rivers.length > 0) {
        const river = await pickRandomCell(rivers);
        const source = river.path[0] ?? null;
        if (source) overwriteCell(grid, source.x, source.y, "Geyser");
        return source;
    }

    const pool = interiorCells(grid);
    const cell = await pickRandomCell(pool.length > 0 ? pool : allCells(grid));
    if (!cell) return null;
    const priorMeta = grid.cells.get(cellKey(cell.x, cell.y));
    overwriteCell(grid, cell.x, cell.y, "Geyser");
    const path = await walkFromCellUntilArrived(grid, cell, {
        avoidRegionId: priorMeta?.regionId ?? null,
        startType: priorMeta?.terrain ?? null,
        usedCells: usedRiverCells(rivers),
        usedDiagonals: usedRiverDiagonals(rivers),
    });
    rivers.push({ id: rivers.length + 1, startRegionId: priorMeta?.regionId ?? null, path });
    return cell;
}

/** Random cell where terrain !== Mountains. */
async function placeIsolatedMountain(grid) {
    const candidates = candidatesFor(grid, c => terrainAt(grid, c.x, c.y) !== "Mountains");
    const cell = await pickRandomCell(candidates);
    if (cell) overwriteCell(grid, cell.x, cell.y, "Isolated Mountain");
    return cell;
}

/** Random cell where terrain !== Swamps and the cell isn't on any river's path. */
async function placePool(grid, rivers) {
    const riverKeys = new Set(rivers.flatMap(r => r.path).map(c => cellKey(c.x, c.y)));
    const candidates = candidatesFor(grid, c => terrainAt(grid, c.x, c.y) !== "Swamps" && !riverKeys.has(cellKey(c.x, c.y)));
    const cell = await pickRandomCell(candidates);
    if (cell) overwriteCell(grid, cell.x, cell.y, "Pool");
    return cell;
}

/** Weighted pick: 70% restricted to `preferredTypes` cells (if any exist), else (or on the 30% roll) any cell — always off the map edge. The 70/30 split is a judgment call — the book says "preference," not a number — see docs/DECISIONS.md. Shared by Tor (Plains) and Volcano (Badlands/Plains). */
async function pickWeightedCell(grid, preferredTypes) {
    const pool = interiorCells(grid);
    const cells = pool.length > 0 ? pool : allCells(grid);
    const preferred = cells.filter(c => preferredTypes.includes(terrainAt(grid, c.x, c.y)));
    const roll = await new Roll("1d10").evaluate();
    if (preferred.length > 0 && roll.total <= 7) return pickRandomCell(preferred);
    return pickRandomCell(cells);
}

async function placeTor(grid) {
    const cell = await pickWeightedCell(grid, ["Plains"]);
    if (cell) overwriteCell(grid, cell.x, cell.y, "Tor");
    return cell;
}

async function placeVolcano(grid) {
    const cell = await pickWeightedCell(grid, ["Badlands", "Plains"]);
    if (cell) overwriteCell(grid, cell.x, cell.y, "Volcano");
    return cell;
}

/** A river's real grid cells, excluding a trailing synthetic "border touch" point (see geography-rivers.mjs's borderExitPoint) — that point is a fractional pixel-space extension for drawing, not an actual grid cell to place a feature on. */
function realPathCells(path) {
    return path.filter(c => Number.isInteger(c.x) && Number.isInteger(c.y));
}

/** On a river at a change of terrain type; generates a river first (region-preference fallback) if none exist. Falls back to a random point on the path if the river never crosses a terrain boundary. */
async function placeWaterfall(grid, regions, rivers) {
    const river = rivers.length > 0 ? await pickRandomCell(rivers) : await generateFallbackRiver(grid, regions, rivers);
    if (!river) return null;
    const cells = realPathCells(river.path);
    if (cells.length < 2) return null;

    for (let i = 1; i < cells.length; i++) {
        const prev = cells[i - 1], cur = cells[i];
        if (terrainAt(grid, prev.x, prev.y) !== terrainAt(grid, cur.x, cur.y)) {
            overwriteCell(grid, cur.x, cur.y, "Waterfall");
            return cur;
        }
    }
    const fallback = await pickRandomCell(cells);
    if (fallback) overwriteCell(grid, fallback.x, fallback.y, "Waterfall");
    return fallback;
}

/** On a river, at a uniformly random point along its path; generates a river first if none exist. */
async function placeWhirlpool(grid, regions, rivers) {
    const river = rivers.length > 0 ? await pickRandomCell(rivers) : await generateFallbackRiver(grid, regions, rivers);
    if (!river) return null;
    const cells = realPathCells(river.path);
    if (cells.length === 0) return null;
    const cell = await pickRandomCell(cells);
    if (cell) overwriteCell(grid, cell.x, cell.y, "Whirlpool");
    return cell;
}

/**
 * Places every rolled Isolated Mountain *before* rivers are pathed — unlike every other
 * Special Feature (which land after rivers exist, some directly depending on them), Isolated
 * Mountain needs to already be on the grid when `placeRivers` runs so its cell is honored as
 * high ground (`ELEVATION_TIER["Isolated Mountain"]`, `tables/geography.mjs`) a river can't
 * flow uphill onto or through, the same as a real Mountains region. The caller is expected to
 * filter these rolls out of what it later passes to `placeSpecialFeatures`, so each roll is
 * only placed once.
 */
export async function placeIsolatedMountains(specialRolls, grid) {
    for (const roll of specialRolls) {
        if (roll.feature === "Isolated Mountain") await placeIsolatedMountain(grid);
    }
}

/**
 * Dispatches every rolled special feature (in roll order) to its own placement rule.
 * `rivers` is mutated in place (Geyser/Waterfall/Whirlpool can add a brand-new river).
 * `specialRolls` is expected to already exclude Isolated Mountain rolls (see
 * `placeIsolatedMountains`, which places those earlier, before rivers exist). Returns
 * `{ cliffs }`.
 */
export async function placeSpecialFeatures(specialRolls, grid, regions, rivers) {
    const cliffs = [];
    for (const roll of specialRolls) {
        switch (roll.feature) {
            case "Caves": await placeCaves(grid, roll); break;
            case "Cliff": await placeCliff(grid, cliffs); break;
            case "Fertile Valley": await placeFertileValley(grid); break;
            case "Geyser": await placeGeyser(grid, rivers); break;
            case "Pool": await placePool(grid, rivers); break;
            case "Tor": await placeTor(grid); break;
            case "Volcano": await placeVolcano(grid); break;
            case "Waterfall": await placeWaterfall(grid, regions, rivers); break;
            case "Whirlpool": await placeWhirlpool(grid, regions, rivers); break;
        }
    }
    return { cliffs };
}
