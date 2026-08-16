// Pure grid math for the Geography phase's auto-fill placement (PLAN.md §3). No Foundry
// dependency, so it's directly unit-testable without stubbing anything.

/**
 * Precomputes every cell of a width x height grid, ordered by distance from the
 * top-left corner (0,0), ascending (ties broken by x+y, then x). Used only to find the
 * current "top-left available square" quickly (see findSeed) — the fixed corner is where
 * the region as a whole starts, not where every subsequent feature is centered.
 */
export function createGrid(width, height) {
    const order = [];
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            order.push({ x, y, dist: Math.hypot(x, y) });
        }
    }
    order.sort((a, b) => a.dist - b.dist || (a.x + a.y) - (b.x + b.y) || a.x - b.x);
    return { width, height, order, claimed: new Set() };
}

function cellKey(x, y) {
    return `${x},${y}`;
}

/** The nearest unclaimed cell to the top-left corner (0,0) — null once the grid is full. */
function findSeed(grid) {
    for (const cell of grid.order) {
        if (!grid.claimed.has(cellKey(cell.x, cell.y))) return cell;
    }
    return null;
}

/**
 * Claims the next `count` unclaimed cells, radiating outward from the current top-left
 * *available* square (the seed) rather than from the fixed (0,0) corner. Each newly
 * rolled feature therefore grows as its own compact blob anchored at wherever the map's
 * frontier currently is, instead of every feature's cells being picked as a ring/band
 * measured from the fixed corner (which reads as concentric "layers" once each feature
 * gets its own fill color). Returns fewer than `count` cells (possibly none) once the
 * grid has no unclaimed cells left.
 */
export function claimNextCells(grid, count) {
    const seed = findSeed(grid);
    if (!seed) return [];

    const candidates = [];
    for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
            const key = cellKey(x, y);
            if (grid.claimed.has(key)) continue;
            candidates.push({ x, y, dist: Math.hypot(x - seed.x, y - seed.y) });
        }
    }
    candidates.sort((a, b) => a.dist - b.dist || (a.x + a.y) - (b.x + b.y) || a.x - b.x);

    const claimed = [];
    for (const cell of candidates) {
        if (claimed.length >= count) break;
        grid.claimed.add(cellKey(cell.x, cell.y));
        claimed.push({ x: cell.x, y: cell.y });
    }
    return claimed;
}

export function isGridFull(grid) {
    return grid.claimed.size >= grid.width * grid.height;
}
