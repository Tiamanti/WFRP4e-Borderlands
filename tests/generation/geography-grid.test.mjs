import { describe, it, expect } from "vitest";
import { createGrid, claimNextCells, isGridFull } from "../../src/generation/geography-grid.mjs";

describe("geography-grid", () => {
    it("claims cells in radiating order from the top-left corner", () => {
        const grid = createGrid(3, 3);
        const cells = claimNextCells(grid, 3);
        expect(cells).toEqual([
            { x: 0, y: 0 },
            { x: 0, y: 1 },
            { x: 1, y: 0 },
        ]);
    });

    it("radiates the next claim from the current frontier, not the fixed corner", () => {
        // After (0,0),(0,1),(1,0) are claimed, the nearest unclaimed cell to (0,0) is
        // (1,1) — the next batch should cluster around that frontier point, not resume
        // scanning distance-from-(0,0) (which would instead reach for (0,2)/(2,0)).
        const grid = createGrid(4, 4);
        claimNextCells(grid, 3);
        const second = claimNextCells(grid, 3);
        expect(second).toEqual([
            { x: 1, y: 1 },
            { x: 1, y: 2 },
            { x: 2, y: 1 },
        ]);
    });

    it("never returns an already-claimed cell across multiple calls", () => {
        const grid = createGrid(3, 3);
        const first = claimNextCells(grid, 4);
        const second = claimNextCells(grid, 4);
        const firstKeys = new Set(first.map(c => `${c.x},${c.y}`));
        for (const cell of second) {
            expect(firstKeys.has(`${cell.x},${cell.y}`)).toBe(false);
        }
    });

    it("returns fewer cells than requested once the grid runs out, and reports full", () => {
        const grid = createGrid(2, 2);
        const claimed = claimNextCells(grid, 10);
        expect(claimed).toHaveLength(4);
        expect(isGridFull(grid)).toBe(true);
        expect(claimNextCells(grid, 1)).toEqual([]);
    });
});
