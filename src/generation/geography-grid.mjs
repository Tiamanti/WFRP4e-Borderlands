// Generic grid/blob placement primitives for the Geography phase's region-aware placement
// (docs/DECISIONS.md "Geography (redesign)"). No per-terrain-type rules live here — just
// grid mechanics reused by geography-terrain.mjs/geography-rivers.mjs/geography-features.mjs.
// No Foundry dependency (besides the global `Roll` class), so it's directly unit-testable.

function cellKey(x, y) {
    return `${x},${y}`;
}

/** Creates an empty width x height placement grid. Cells are added to `cells` as they're claimed. */
export function createPlacementGrid(width, height) {
    return { width, height, cells: new Map() };
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
 * 8-directional (orthogonal + diagonal) neighbor coordinates of a single cell, clipped to
 * the grid bounds. 8-directional adjacency is used everywhere in the redesign — border
 * adjacency, Hills-near-Mountains, river step neighbors — for a more organic look than a
 * 4-directional grid produces; a judgment call, see docs/DECISIONS.md.
 */
export function neighborsOf(grid, x, y) {
    const neighbors = [];
    for (const { dx, dy } of NEIGHBOR_OFFSETS) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < grid.width && ny >= 0 && ny < grid.height) neighbors.push({ x: nx, y: ny });
    }
    return neighbors;
}

/** Free cells 8-directionally adjacent to any cell in `cells` (deduplicated, excludes `cells` themselves). */
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

/** Euclidean min-distance from one cell to the nearest of a set of target cells (Infinity if none). */
export function nearestDistance(cell, targets) {
    if (targets.length === 0) return Infinity;
    let best = Infinity;
    for (const t of targets) {
        const d = Math.hypot(cell.x - t.x, cell.y - t.y);
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
        .map(c => ({ ...c, dist: Math.hypot(c.x - seed.x, c.y - seed.y) }))
        .sort((a, b) => a.dist - b.dist || (a.x + a.y) - (b.x + b.y) || a.x - b.x);

    const claimed = [];
    for (const cell of candidates) {
        if (claimed.length >= count) break;
        grid.cells.set(cellKey(cell.x, cell.y), { ...meta });
        claimed.push({ x: cell.x, y: cell.y });
    }
    return claimed;
}
