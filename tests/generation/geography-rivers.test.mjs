import { describe, it, expect, beforeEach } from "vitest";
import { createPlacementGrid } from "../../src/generation/geography-grid.mjs";
import { walkFromCell, walkRiverPath, pickStartRegion, placeRivers, diagonalKey } from "../../src/generation/geography-rivers.mjs";

function fillGrid(width, height, regions, type = "square") {
    const grid = createPlacementGrid(width, height, type);
    for (const region of regions) {
        for (const cell of region.cells) {
            grid.cells.set(`${cell.x},${cell.y}`, {
                kind: "terrain", terrain: region.type, vegetation: null, regionId: region.id,
            });
        }
    }
    return grid;
}

describe("geography-rivers", () => {
    beforeEach(() => {
        globalThis.__rollQueue = [];
    });

    describe("walkRiverPath", () => {
        it("keeps wandering at least one more step even when step-1 already lands on the border", async () => {
            // Regression test for a live-tested bug: Mountains/Swamps are seeded at the map
            // border, so a river's step-1 move (into an adjacent region) frequently lands on
            // a border cell too — checking "have I arrived at the border" *before* taking any
            // wandering step made those rivers stop dead on the spot instead of crossing the
            // map. The walk must take at least one genuine step past step-1 before it's
            // allowed to call itself "arrived."
            const region1 = { id: 1, type: "Mountains", cells: [{ x: 1, y: 1 }] }; // interior seed
            const region2 = {
                id: 2, type: "Plains",
                cells: [
                    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
                    { x: 0, y: 1 }, { x: 2, y: 1 },
                    { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 },
                ],
            };
            const grid = fillGrid(3, 3, [region1, region2]);
            // source is deterministic (only 1 cell, no roll); step-1 (8 candidates, index 1 ->
            // (0,0), a border corner); one mandatory wandering step from (0,0) (currentDist
            // already 0, so all 3 neighbors are weighted equally; index 1 -> (1,0), also
            // border) -> arrives, appending a border-touch exit point.
            globalThis.__rollQueue = [1, 1];
            const { path } = await walkRiverPath(grid, region1);
            expect(path).toEqual([{ x: 1, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -0.5 }]);
        });

        it("the map border always wins over a Swamp target, even mid-walk", async () => {
            // This grid is only 1 cell tall, so every single cell is technically a border
            // cell (isBorderCell checks y === height - 1 too) — the walk arrives at (2,0) via
            // both rules simultaneously (it's on the border *and* adjacent to the Swamp at
            // (3,0)), and the border rule wins: it flows off the map edge there rather than
            // reaching for the Swamp one more step away.
            const region1 = { id: 1, type: "Mountains", cells: [{ x: 0, y: 0 }] };
            const region2 = { id: 2, type: "Plains", cells: [{ x: 1, y: 0 }, { x: 2, y: 0 }] };
            const region3 = { id: 3, type: "Swamps", cells: [{ x: 3, y: 0 }] };
            const grid = fillGrid(4, 1, [region1, region2, region3]);
            globalThis.__rollQueue = [1, 1];
            const { path } = await walkRiverPath(grid, region1);
            expect(path).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: -0.5 }]);
        });

        it("targets the nearest Swamp when the river didn't start in one, biasing steps that reduce distance, without needing to touch the border first", async () => {
            // Border rows (y=0/y=2) are filled with the same Mountains region as the source,
            // so the elevation rule (never step uphill from Plains) keeps the walk on the
            // interior row until it's genuinely adjacent to the Swamp — isolating Swamp-target
            // behavior from the border-always-wins rule covered by the test above.
            const region1 = { id: 1, type: "Mountains", cells: [{ x: 1, y: 1 }] };
            const grid = fillGrid(6, 3, [
                { id: 1, type: "Mountains", cells: [0, 1, 2, 3, 4, 5].map(x => ({ x, y: 0 })) },
                { id: 1, type: "Mountains", cells: [0, 1, 2, 3, 4, 5].map(x => ({ x, y: 2 })) },
                { id: 1, type: "Mountains", cells: [{ x: 0, y: 1 }, { x: 1, y: 1 }] },
                { id: 2, type: "Plains", cells: [{ x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }] },
                { id: 3, type: "Swamps", cells: [{ x: 5, y: 1 }] },
            ]);
            // step-1 (only legal different-region neighbor: (2,1), Plains); then twice more,
            // each time only one neighbor survives the elevation filter (the Mountains-filled
            // border rows are all uphill from Plains) and is also the 3x-weighted direction
            // toward the Swamp, arriving adjacent to (5,1) while still on the interior row.
            // The Swamp-touch extension lands on (5,1)'s near edge (x: 4.5), not its center.
            globalThis.__rollQueue = [1, 1, 1];
            const { path } = await walkRiverPath(grid, region1);
            expect(path).toEqual([
                { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 4.5, y: 1 },
            ]);
        });

        it("targets the map border instead when the river starts in a Swamp", async () => {
            // Whole grid is one Swamp region, so there's no different-region neighbor to
            // step into (every neighbor shares the same region id) — the walk still takes
            // at least one wandering step before it's allowed to declare arrival. Source is
            // deterministic: every cell is border in this degenerate 1-tall grid, so it falls
            // back to the whole region and picks (1,0), the exact map-center cell.
            const region1 = { id: 1, type: "Swamps", cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }] };
            const grid = fillGrid(3, 1, [region1]);
            globalThis.__rollQueue = [1]; // 1 mandatory wandering step (1d2) -> (0,0)
            const { path } = await walkRiverPath(grid, region1);
            expect(path).toEqual([{ x: 1, y: 0 }, { x: 0, y: 0 }, { x: -0.5, y: -0.5 }]);
        });

        it("returns an empty path if the region has no cells at all", async () => {
            const grid = createPlacementGrid(3, 3);
            const { path } = await walkRiverPath(grid, { id: 1, type: "Plains", cells: [] });
            expect(path).toEqual([]);
        });

        it("prefers a non-border source cell closest to the map's center", async () => {
            const region1 = {
                id: 1, type: "Mountains",
                cells: [{ x: 0, y: 0 }, { x: 4, y: 4 }, { x: 2, y: 2 }, { x: 4, y: 0 }],
            };
            const grid = fillGrid(5, 5, [region1]);
            // (2,2) is the map's exact center and the only non-border cell in the region —
            // picked deterministically, no roll consumed for the source itself. Padded with
            // enough "1"s to let the rest of the walk (uninteresting here) run to completion.
            globalThis.__rollQueue = Array(12).fill(1);
            const { path } = await walkRiverPath(grid, region1);
            expect(path[0]).toEqual({ x: 2, y: 2 });
        });
    });

    describe("walkFromCell — elevation and river-crossing avoidance", () => {
        it("never steps from lower ground onto higher ground (e.g. Hills -> Mountains)", async () => {
            const grid = createPlacementGrid(3, 3);
            grid.cells.set("1,1", { kind: "terrain", terrain: "Hills", regionId: 1 });
            grid.cells.set("2,1", { kind: "terrain", terrain: "Mountains", regionId: 2 }); // uphill neighbor
            for (const [x, y] of [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2], [1, 2], [2, 2]]) {
                grid.cells.set(`${x},${y}`, { kind: "terrain", terrain: "Plains", regionId: 3 });
            }
            globalThis.__rollQueue = [1];
            const { path } = await walkFromCell(grid, { x: 1, y: 1 });
            expect(path).toHaveLength(3); // source + 1 step + border-touch exit point
            expect(path[1]).not.toEqual({ x: 2, y: 1 });
        });

        it("treats Isolated Mountain the same as Mountains — never steps uphill onto it either", async () => {
            const grid = createPlacementGrid(3, 3);
            grid.cells.set("1,1", { kind: "terrain", terrain: "Hills", regionId: 1 });
            grid.cells.set("2,1", { kind: "special", terrain: "Isolated Mountain", regionId: null }); // uphill neighbor
            for (const [x, y] of [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2], [1, 2], [2, 2]]) {
                grid.cells.set(`${x},${y}`, { kind: "terrain", terrain: "Plains", regionId: 3 });
            }
            globalThis.__rollQueue = [1];
            const { path } = await walkFromCell(grid, { x: 1, y: 1 });
            expect(path).toHaveLength(3);
            expect(path[1]).not.toEqual({ x: 2, y: 1 });
        });

        it("never re-enters a cell already used by an earlier river", async () => {
            const grid = createPlacementGrid(3, 1);
            for (const x of [0, 1, 2]) {
                grid.cells.set(`${x},0`, { kind: "terrain", terrain: "Plains", regionId: 1 });
            }
            const usedCells = new Set(["2,0"]); // already claimed by an earlier river
            globalThis.__rollQueue = [1]; // only 1 legal neighbor left: (0,0)
            const { path } = await walkFromCell(grid, { x: 1, y: 0 }, { usedCells });
            expect(path).not.toContainEqual({ x: 2, y: 0 });
            expect(path[1]).toEqual({ x: 0, y: 0 });
        });

        it("never takes a diagonal step that crosses another diagonal through the same 2x2 block, even though it shares no cell with it (square grid only — see the hex counterpart below)", async () => {
            // A 2x2 block, corners labeled clockwise from top-left: 1=(0,0) 2=(1,0) 3=(1,1)
            // 4=(0,1). An earlier river already walked 1 -> 3 (the "\" diagonal). Starting a
            // fresh walk at corner 2 with 1 and 3 already claimed, the only cell left to step
            // to is corner 4 — but 2 -> 4 is the "/" diagonal of the *same* block, which would
            // visually cross the already-used "\" diagonal right through the middle even
            // though it touches neither (0,0) nor (1,1). That candidate must be rejected, so
            // the walk has nowhere legal left to go at all.
            const grid = createPlacementGrid(2, 2);
            for (const [x, y] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
                grid.cells.set(`${x},${y}`, { kind: "terrain", terrain: "Plains", regionId: 1 });
            }
            const usedCells = new Set(["0,0", "1,1"]);
            const usedDiagonals = new Set([diagonalKey({ x: 0, y: 0 }, { x: 1, y: 1 })]);
            const { path, arrived } = await walkFromCell(grid, { x: 1, y: 0 }, { usedCells, usedDiagonals });
            expect(path).toEqual([{ x: 1, y: 0 }]); // no legal step at all — not even the border-touch cell (0,1)
            expect(arrived).toBe(false);
        });

        it("on a hex grid, usedDiagonals is never populated or consulted — the crossing concept doesn't apply", async () => {
            const grid = createPlacementGrid(5, 5, "hex");
            for (let y = 0; y < 5; y++) {
                for (let x = 0; x < 5; x++) grid.cells.set(`${x},${y}`, { kind: "terrain", terrain: "Plains", regionId: 1 });
            }
            const usedDiagonals = new Set();
            globalThis.__rollQueue = Array(10).fill(1);
            await walkFromCell(grid, { x: 2, y: 2 }, { usedDiagonals });
            expect(usedDiagonals.size).toBe(0);
        });
    });

    describe("pickStartRegion", () => {
        it("prefers Mountains > Hills > Swamps > Badlands > Plains", async () => {
            const regions = [
                { id: 1, type: "Plains", cells: [{ x: 0, y: 0 }] },
                { id: 2, type: "Swamps", cells: [{ x: 1, y: 0 }] },
                { id: 3, type: "Mountains", cells: [{ x: 2, y: 0 }] },
            ];
            globalThis.__rollQueue = [1]; // only 1 Mountains candidate
            const picked = await pickStartRegion(regions, new Set());
            expect(picked.id).toBe(3);
        });

        it("skips already-used regions and falls through to the next preference tier", async () => {
            const regions = [
                { id: 1, type: "Mountains", cells: [{ x: 0, y: 0 }] },
                { id: 2, type: "Hills", cells: [{ x: 1, y: 0 }] },
            ];
            globalThis.__rollQueue = [1]; // only 1 Hills candidate once Mountains(1) is excluded
            const picked = await pickStartRegion(regions, new Set([1]));
            expect(picked.id).toBe(2);
        });

        it("falls back to allowing reuse once every region has already been used", async () => {
            const regions = [{ id: 1, type: "Mountains", cells: [{ x: 0, y: 0 }] }];
            globalThis.__rollQueue = [1]; // the reuse-fallback tier finds it again
            const picked = await pickStartRegion(regions, new Set([1]));
            expect(picked.id).toBe(1);
        });

        it("returns null when there are no placed regions at all", async () => {
            const picked = await pickStartRegion([], new Set());
            expect(picked).toBeNull();
        });
    });

    describe("placeRivers", () => {
        it("starts each river in a different region, honoring the preference order", async () => {
            const region1 = { id: 1, type: "Plains", cells: [{ x: 0, y: 0 }] };
            const region2 = { id: 2, type: "Mountains", cells: [{ x: 1, y: 0 }] };
            const region3 = { id: 3, type: "Hills", cells: [{ x: 2, y: 0 }] };
            const grid = fillGrid(3, 1, [region1, region2, region3]);
            // River 1: pick Mountains (1 candidate), source (1 cell, no roll). This 3-cell-wide,
            // 1-tall grid is too small for the walk to ever genuinely arrive (every cell is a
            // border cell, so the mandatory pre-arrival wandering step always dead-ends into a
            // cell whose only neighbor is already used) — walkFromCellUntilArrived burns a full
            // MAX_RIVER_WALK_ATTEMPTS retries (1 roll each, for the step-1 pick) before falling
            // back to the last unfinished attempt. River 2: pick Hills (1 candidate, Mountains
            // excluded), source (1 cell, no roll); its only neighbor is uphill (Mountains), so
            // every retry dead-ends with zero candidates and consumes no rolls at all. Padded
            // generously so neither river's retry churn runs the queue dry.
            globalThis.__rollQueue = Array(30).fill(1);
            const { rivers } = await placeRivers([{}, {}], grid, [region1, region2, region3]);
            expect(rivers).toHaveLength(2);
            expect(rivers[0].startRegionId).toBe(2);
            expect(rivers[1].startRegionId).toBe(3);
        });

        it("skips rivers when there are no placed regions", async () => {
            const grid = createPlacementGrid(3, 3);
            const { rivers } = await placeRivers([{}], grid, []);
            expect(rivers).toEqual([]);
        });

        it("force-starts one river even when no River rolls came up at all, as long as a region exists", async () => {
            const region1 = { id: 1, type: "Plains", cells: [{ x: 0, y: 0 }] };
            const grid = fillGrid(1, 1, [region1]);
            globalThis.__rollQueue = [1]; // pickStartRegion's single-region pick
            const { rivers } = await placeRivers([], grid, [region1]); // zero river rolls
            expect(rivers).toHaveLength(1);
            expect(rivers[0].startRegionId).toBe(1);
        });

        it("still places nothing when there are no River rolls and no regions to start from", async () => {
            const grid = createPlacementGrid(3, 3);
            const { rivers } = await placeRivers([], grid, []);
            expect(rivers).toEqual([]);
        });
    });
});
