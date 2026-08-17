// Generic grid/blob placement primitives for the Geography phase's region-aware placement
// (docs/DECISIONS.md "Geography (redesign)"). No per-terrain-type rules live here — just
// grid mechanics reused by geography-terrain.mjs/geography-rivers.mjs/geography-features.mjs.
// No Foundry dependency (besides the global `Roll` class), so it's directly unit-testable.

function cellKey(x, y) {
    return `${x},${y}`;
}

/**
 * Creates an empty width x height placement grid, `type` "square" (default) or "hex" (pointy-
 * top, odd-row offset — Foundry's HEXODDR, the only hex orientation this module supports; see
 * docs/DECISIONS.md). Cells are always addressed by the same `{x, y}` offset coordinates (x =
 * column, y = row) regardless of `type` — every placement module above this one is written
 * purely in terms of `neighborsOf`/`cellDistance`/etc. and never needs to know which grid type
 * is active; only this file's neighbor/distance math actually branches on it.
 */
export function createPlacementGrid(width, height, type = "square") {
    return { width, height, type, cells: new Map() };
}

/**
 * Offset (x = column, y = row) <-> cube coordinate conversion for a pointy-top, odd-row-offset
 * ("odd-r") hex grid — https://www.redblobgames.com/grids/hexagons/ is the reference. Cube
 * coordinates (q, r, s; q + r + s = 0) are what make neighbor/distance math parity-independent:
 * every hex has the same 6 cube-direction neighbors regardless of which row it's on, unlike
 * offset coordinates where the neighbor deltas differ between even and odd rows.
 */
export function offsetToCube(x, y) {
    const q = x - (y - (y & 1)) / 2;
    const r = y;
    return { q, r, s: -q - r };
}

export function cubeToOffset({ q, r }) {
    return { x: q + (r - (r & 1)) / 2, y: r };
}

const CUBE_DIRECTIONS = [
    { q: 1, r: 0, s: -1 }, { q: 1, r: -1, s: 0 }, { q: 0, r: -1, s: 1 },
    { q: -1, r: 0, s: 1 }, { q: -1, r: 1, s: 0 }, { q: 0, r: 1, s: -1 },
];

/** The 6 cube-coordinate neighbors of a cell, not clipped to any grid bounds (used for cliffs' off-grid-safe corner math). */
export function neighborsOfCube(cube) {
    return CUBE_DIRECTIONS.map(d => ({ q: cube.q + d.q, r: cube.r + d.r, s: cube.s + d.s }));
}

/**
 * Distance between two cells, grid-type aware: Euclidean for a square grid, hex-tile-step
 * ("cube") distance for a hex grid — using raw Euclidean distance on a hex grid's offset
 * coordinates would be wrong (adjacent hexes on the same row are 1 apart, but adjacent hexes on
 * a different row are also 1 apart despite an uneven offset-coordinate delta). This is the one
 * distance primitive every placement rule (Mountains-farthest-from-Swamp, river source/target
 * bias, Cave cluster radius, blob fill order) is expected to go through instead of hand-rolling
 * `Math.hypot`, so every one of those rules is automatically correct for both grid types.
 */
export function cellDistance(grid, a, b) {
    if (grid.type !== "hex") return Math.hypot(a.x - b.x, a.y - b.y);
    const ca = offsetToCube(a.x, a.y);
    const cb = offsetToCube(b.x, b.y);
    return (Math.abs(ca.q - cb.q) + Math.abs(ca.r - cb.r) + Math.abs(ca.s - cb.s)) / 2;
}

export function isBorderCell(grid, x, y) {
    return x === 0 || y === 0 || x === grid.width - 1 || y === grid.height - 1;
}

/** Every coordinate in the grid, claimed or not, in row-major order. */
export function allCells(grid) {
    const coords = [];
    for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) coords.push({ x, y });
    }
    return coords;
}

export function freeCells(grid) {
    return allCells(grid).filter(({ x, y }) => !grid.cells.has(cellKey(x, y)));
}

export function freeBorderCells(grid) {
    return freeCells(grid).filter(({ x, y }) => isBorderCell(grid, x, y));
}

/** Claimed cells belonging to a given region id. */
export function cellsOfRegion(grid, regionId) {
    const cells = [];
    for (const [key, cell] of grid.cells) {
        if (cell.regionId === regionId) {
            const [x, y] = key.split(",").map(Number);
            cells.push({ x, y });
        }
    }
    return cells;
}

/** Claimed cells whose terrain (or overwritten special feature name) matches. */
export function cellsOfType(grid, terrain) {
    const cells = [];
    for (const [key, cell] of grid.cells) {
        if (cell.terrain === terrain) {
            const [x, y] = key.split(",").map(Number);
            cells.push({ x, y });
        }
    }
    return cells;
}

const NEIGHBOR_OFFSETS = [
    { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
    { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
    { dx: -1, dy: 1 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 },
];

/**
 * Neighbor coordinates of a single cell, clipped to the grid bounds: 8-directional (orthogonal
 * + diagonal) for a square grid — used everywhere in the redesign for a more organic look than
 * a 4-directional grid produces, a judgment call, see docs/DECISIONS.md — or the natural
 * 6-directional neighbor set for a hex grid (every placement rule that says "8-directional"
 * just uses however many neighbors the active grid type actually has, no rule-specific
 * special-casing; see docs/DECISIONS.md's "Hex grid support" entries).
 */
export function neighborsOf(grid, x, y) {
    if (grid.type === "hex") {
        const cube = offsetToCube(x, y);
        return neighborsOfCube(cube)
            .map(cubeToOffset)
            .filter(n => n.x >= 0 && n.x < grid.width && n.y >= 0 && n.y < grid.height);
    }
    const neighbors = [];
    for (const { dx, dy } of NEIGHBOR_OFFSETS) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < grid.width && ny >= 0 && ny < grid.height) neighbors.push({ x: nx, y: ny });
    }
    return neighbors;
}

/** Free cells adjacent (per `neighborsOf` — 8-directional square, 6-directional hex) to any cell in `cells` (deduplicated, excludes `cells` themselves). */
export function cellsAdjacentTo(grid, cells) {
    const source = new Set(cells.map(c => cellKey(c.x, c.y)));
    const seen = new Set();
    const result = [];
    for (const { x, y } of cells) {
        for (const n of neighborsOf(grid, x, y)) {
            const key = cellKey(n.x, n.y);
            if (source.has(key) || seen.has(key) || grid.cells.has(key)) continue;
            seen.add(key);
            result.push(n);
        }
    }
    return result;
}

/** Grid-type-aware min-distance (see `cellDistance`) from one cell to the nearest of a set of target cells (Infinity if none). */
export function nearestDistance(grid, cell, targets) {
    if (targets.length === 0) return Infinity;
    let best = Infinity;
    for (const t of targets) {
        const d = cellDistance(grid, cell, t);
        if (d < best) best = d;
    }
    return best;
}

/** Min distance from a cell to the nearest map edge — used by river pathing's border target. */
export function distanceToBorder(grid, cell) {
    return Math.min(cell.x, cell.y, grid.width - 1 - cell.x, grid.height - 1 - cell.y);
}

/**
 * Roll-based uniform pick from a candidate list (`Roll` is the only randomness source,
 * matching every other pure roll function in the codebase — same pattern as ruins.mjs's
 * pickRandomCell, just operating on an in-memory candidate list instead of live Scene
 * Notes). Works for any array, not just cell coordinates (also used to pick a region or a
 * river). Returns null for an empty list so callers can fall back cleanly.
 */
export async function pickRandomCell(candidates) {
    if (candidates.length === 0) return null;
    const roll = await new Roll(`1d${candidates.length}`).evaluate();
    return candidates[roll.total - 1];
}

/**
 * Claims up to `count` free cells radiating outward from `seed` (nearest-to-seed first,
 * ties broken by (x+y) then x — mirrors the old claimNextCells fill order), stamping each
 * with `meta` (e.g. `{kind, terrain, vegetation, regionId}`). `seed` itself is claimed
 * first, since its distance-to-self is 0. Returns the list of claimed cells (fewer than
 * `count`, possibly none, once the grid runs out of free cells).
 */
export function claimBlobFromSeed(grid, seed, count, meta) {
    const candidates = freeCells(grid)
        .map(c => ({ ...c, dist: cellDistance(grid, c, seed) }))
        .sort((a, b) => a.dist - b.dist || (a.x + a.y) - (b.x + b.y) || a.x - b.x);

    const claimed = [];
    for (const cell of candidates) {
        if (claimed.length >= count) break;
        grid.cells.set(cellKey(cell.x, cell.y), { ...meta });
        claimed.push({ x: cell.x, y: cell.y });
    }
    return claimed;
}
