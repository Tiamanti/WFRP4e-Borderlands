import { describe, it, expect, beforeEach } from "vitest";
import {
    createPlacementGrid, isBorderCell, allCells, freeCells, freeBorderCells,
    cellsOfRegion, cellsOfType, neighborsOf, cellsAdjacentTo, nearestDistance,
    distanceToBorder, pickRandomCell, claimBlobFromSeed, cellDistance,
} from "../../src/generation/geography-grid.mjs";

describe("geography-grid", () => {
    beforeEach(() => {
        globalThis.__rollQueue = [];
    });

    it("identifies border cells on all four edges, not the interior", () => {
        const grid = createPlacementGrid(3, 3);
        expect(isBorderCell(grid, 0, 0)).toBe(true);
        expect(isBorderCell(grid, 2, 0)).toBe(true);
        expect(isBorderCell(grid, 0, 2)).toBe(true);
        expect(isBorderCell(grid, 2, 2)).toBe(true);
        expect(isBorderCell(grid, 1, 0)).toBe(true);
        expect(isBorderCell(grid, 1, 1)).toBe(false);
    });

    it("allCells/freeCells/freeBorderCells reflect claimed cells", () => {
        const grid = createPlacementGrid(3, 3);
        expect(allCells(grid)).toHaveLength(9);
        expect(freeCells(grid)).toHaveLength(9);
        expect(freeBorderCells(grid)).toHaveLength(8); // every cell but the center

        grid.cells.set("0,0", { kind: "terrain", terrain: "Plains", regionId: 1 });
        expect(freeCells(grid)).toHaveLength(8);
        expect(freeBorderCells(grid)).toHaveLength(7);
    });

    it("cellsOfRegion and cellsOfType read back stamped metadata", () => {
        const grid = createPlacementGrid(3, 3);
        grid.cells.set("0,0", { kind: "terrain", terrain: "Mountains", regionId: 1 });
        grid.cells.set("1,0", { kind: "terrain", terrain: "Mountains", regionId: 1 });
        grid.cells.set("2,0", { kind: "terrain", terrain: "Hills", regionId: 2 });

        expect(cellsOfRegion(grid, 1)).toEqual(expect.arrayContaining([{ x: 0, y: 0 }, { x: 1, y: 0 }]));
        expect(cellsOfRegion(grid, 1)).toHaveLength(2);
        expect(cellsOfType(grid, "Hills")).toEqual([{ x: 2, y: 0 }]);
    });

    it("neighborsOf is 8-directional and clipped to grid bounds", () => {
        const grid = createPlacementGrid(3, 3);
        expect(neighborsOf(grid, 1, 1)).toHaveLength(8);
        expect(neighborsOf(grid, 0, 0)).toHaveLength(3); // corner: only 3 neighbors exist
    });

    describe("hex grid (pointy-top, odd-row offset)", () => {
        it("neighborsOf is 6-directional on an interior cell, with the correct offset set for an even row", () => {
            const grid = createPlacementGrid(5, 5, "hex");
            const keys = neighborsOf(grid, 2, 2).map(c => `${c.x},${c.y}`).sort();
            expect(keys).toEqual(["1,1", "1,2", "1,3", "2,1", "2,3", "3,2"]);
        });

        it("neighborsOf's offset set shifts on an odd row (odd-r: odd rows offset right)", () => {
            const grid = createPlacementGrid(5, 5, "hex");
            const keys = neighborsOf(grid, 2, 1).map(c => `${c.x},${c.y}`).sort();
            expect(keys).toEqual(["1,1", "2,0", "2,2", "3,0", "3,1", "3,2"]);
        });

        it("neighborsOf is clipped to bounds at a corner", () => {
            const grid = createPlacementGrid(5, 5, "hex");
            const keys = neighborsOf(grid, 0, 0).map(c => `${c.x},${c.y}`).sort();
            expect(keys).toEqual(["0,1", "1,0"]);
        });

        it("cellDistance is hex tile-step distance, not Euclidean, and disagrees with the square metric on the same coordinates", () => {
            const grid = createPlacementGrid(10, 10, "hex");
            const squareGrid = createPlacementGrid(10, 10);
            // (0,0) to (2,2) is 3 hex tile-steps apart, but their Euclidean distance is ~2.83 —
            // the two metrics must disagree here, or the hex branch isn't actually exercised.
            expect(cellDistance(grid, { x: 0, y: 0 }, { x: 2, y: 2 })).toBe(3);
            expect(cellDistance(squareGrid, { x: 0, y: 0 }, { x: 2, y: 2 })).toBeCloseTo(2.828, 2);
            // Adjacent hex neighbors are always exactly 1 apart, same as square's orthogonal case.
            expect(cellDistance(grid, { x: 2, y: 2 }, { x: 1, y: 1 })).toBe(1);
        });
    });

    it("cellsAdjacentTo returns free cells touching a set, excluding the set itself and claimed cells", () => {
        const grid = createPlacementGrid(3, 3);
        grid.cells.set("0,0", { kind: "terrain", terrain: "Mountains", regionId: 1 });
        grid.cells.set("1,0", { kind: "terrain", terrain: "Hills", regionId: 2 }); // already claimed, should be excluded

        const adjacent = cellsAdjacentTo(grid, [{ x: 0, y: 0 }]);
        const keys = adjacent.map(c => `${c.x},${c.y}`).sort();
        expect(keys).toEqual(["0,1", "1,1"]); // (1,0) excluded: already claimed
    });

    it("nearestDistance is Infinity for an empty target set, else the closest Euclidean distance", () => {
        const grid = createPlacementGrid(5, 5);
        expect(nearestDistance(grid, { x: 0, y: 0 }, [])).toBe(Infinity);
        expect(nearestDistance(grid, { x: 0, y: 0 }, [{ x: 3, y: 4 }, { x: 1, y: 0 }])).toBe(1);
    });

    it("distanceToBorder is the min distance to any of the four edges", () => {
        const grid = createPlacementGrid(5, 5);
        expect(distanceToBorder(grid, { x: 2, y: 2 })).toBe(2);
        expect(distanceToBorder(grid, { x: 0, y: 4 })).toBe(0);
        expect(distanceToBorder(grid, { x: 1, y: 3 })).toBe(1);
    });

    describe("pickRandomCell", () => {
        it("returns null for an empty list without rolling", async () => {
            await expect(pickRandomCell([])).resolves.toBeNull();
        });

        it("indexes uniformly via a 1dN roll", async () => {
            globalThis.__rollQueue = [2];
            const result = await pickRandomCell(["a", "b", "c"]);
            expect(result).toBe("b");
        });
    });

    describe("claimBlobFromSeed", () => {
        it("claims cells nearest-to-seed first, stamping the given metadata", () => {
            const grid = createPlacementGrid(3, 3);
            const claimed = claimBlobFromSeed(grid, { x: 1, y: 1 }, 3, { kind: "terrain", terrain: "Hills", regionId: 5 });
            expect(claimed).toContainEqual({ x: 1, y: 1 }); // seed itself, distance 0
            expect(claimed).toHaveLength(3);
            expect(grid.cells.get("1,1")).toEqual({ kind: "terrain", terrain: "Hills", regionId: 5 });
        });

        it("returns fewer cells than requested once the grid runs out", () => {
            const grid = createPlacementGrid(2, 2);
            const claimed = claimBlobFromSeed(grid, { x: 0, y: 0 }, 10, { kind: "terrain", terrain: "Plains", regionId: 1 });
            expect(claimed).toHaveLength(4);
            expect(freeCells(grid)).toHaveLength(0);
        });

        it("never re-claims an already-claimed cell across multiple calls", () => {
            const grid = createPlacementGrid(3, 3);
            const first = claimBlobFromSeed(grid, { x: 0, y: 0 }, 4, { kind: "terrain", terrain: "Plains", regionId: 1 });
            const second = claimBlobFromSeed(grid, { x: 2, y: 2 }, 4, { kind: "terrain", terrain: "Badlands", regionId: 2 });
            const firstKeys = new Set(first.map(c => `${c.x},${c.y}`));
            for (const cell of second) {
                expect(firstKeys.has(`${cell.x},${cell.y}`)).toBe(false);
            }
        });

        it("on a hex grid, claims the seed's 6 tile-step-1 neighbors before anything farther away", () => {
            const grid = createPlacementGrid(5, 5, "hex");
            const claimed = claimBlobFromSeed(grid, { x: 2, y: 2 }, 7, { kind: "terrain", terrain: "Hills", regionId: 1 });
            const keys = claimed.map(c => `${c.x},${c.y}`).sort();
            expect(keys).toEqual(["1,1", "1,2", "1,3", "2,1", "2,2", "2,3", "3,2"]);
        });
    });
});
