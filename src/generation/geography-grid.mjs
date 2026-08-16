// Pure grid math for the Geography phase's auto-fill placement (PLAN.md §3). No Foundry
// dependency, so it's directly unit-testable without stubbing anything.

/**
 * Precomputes every cell of a width x height grid, ordered by distance from the
 * top-left corner (0,0), ascending (ties broken by x+y, then x). Claiming cells in this
 * order produces the expanding-quarter-circle fill pattern the Geography phase paints
 * onto the Scene.
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

/**
 * Claims the next `count` unclaimed cells in radiating order. Returns fewer than
 * `count` cells (possibly none) once the grid has no unclaimed cells left — this is the
 * automatic replacement for the book's manual "map is full, stop" check.
 */
export function claimNextCells(grid, count) {
    const claimed = [];
    for (const cell of grid.order) {
        if (claimed.length >= count) break;
        const key = cellKey(cell.x, cell.y);
        if (grid.claimed.has(key)) continue;
        grid.claimed.add(key);
        claimed.push({ x: cell.x, y: cell.y });
    }
    return claimed;
}

export function isGridFull(grid) {
    return grid.claimed.size >= grid.width * grid.height;
}
