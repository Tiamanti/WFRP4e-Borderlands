import { describe, it, expect, beforeEach } from "vitest";
import { createPlacementGrid } from "../../src/generation/geography-grid.mjs";
import { placeIsolatedMountains, placeSpecialFeatures } from "../../src/generation/geography-features.mjs";

/** Stamps every region's cells onto a grid as claimed terrain, for fully-controlled test setups. */
function fillGrid(width, height, regions, type = "square") {
    const grid = createPlacementGrid(width, height, type);
    for (const region of regions) {
        for (const cell of region.cells) {
            grid.cells.set(`${cell.x},${cell.y}`, {
                kind: "terrain", terrain: region.type, vegetation: region.vegetation ?? null, regionId: region.id,
            });
        }
    }
    return grid;
}

describe("placeSpecialFeatures", () => {
    beforeEach(() => {
        globalThis.__rollQueue = [];
    });

    it("Caves: places floor(size/10) entrances (min 1), each within `size` distance of the first", async () => {
        const grid = createPlacementGrid(5, 5);
        globalThis.__rollQueue = [1, 5, 3]; // first entrance, then 2 more within radius
        await placeSpecialFeatures([{ feature: "Caves", size: 37 }], grid, [], []);
        const caveCells = [...grid.cells.values()].filter(c => c.terrain === "Caves");
        expect(caveCells).toHaveLength(3);
    });

    it("Caves: a size under 10 still places exactly 1 entrance", async () => {
        const grid = createPlacementGrid(3, 3);
        globalThis.__rollQueue = [1];
        await placeSpecialFeatures([{ feature: "Caves", size: 5 }], grid, [], []);
        const caveCells = [...grid.cells.values()].filter(c => c.terrain === "Caves");
        expect(caveCells).toHaveLength(1);
    });

    it("Caves: each entrance's label names the terrain it replaced", async () => {
        const grid = fillGrid(5, 5, [{
            id: 1, type: "Hills", vegetation: "Grassy",
            cells: [
                { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 },
                { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 },
                { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 },
                { x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 },
                { x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 },
            ],
        }]);
        globalThis.__rollQueue = [1]; // 1 entrance
        await placeSpecialFeatures([{ feature: "Caves", size: 5 }], grid, [], []);
        const cave = [...grid.cells.values()].find(c => c.terrain === "Caves");
        expect(cave.label).toBe("Cave entrance in Grassy Hills");
    });

    it("Fertile Valley: never lands on a map-edge cell when an interior cell qualifies", async () => {
        // Every cell is Plains (never disqualified by the Swamps check) on a 3x3 grid, whose
        // only interior cell is (1,1) — proves the border exclusion, not just the Swamps one.
        const grid = fillGrid(3, 3, [{
            id: 1, type: "Plains",
            cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }],
        }]);
        globalThis.__rollQueue = [1]; // only 1 interior candidate: (1,1)
        await placeSpecialFeatures([{ feature: "Fertile Valley" }], grid, [], []);
        expect(grid.cells.get("1,1").terrain).toBe("Fertile Valley");
    });

    it("Isolated Mountain: never lands on a map-edge cell when an interior cell qualifies", async () => {
        const grid = fillGrid(3, 3, [{
            id: 1, type: "Plains",
            cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }],
        }]);
        globalThis.__rollQueue = [1];
        // Placed via placeIsolatedMountains, not placeSpecialFeatures — it runs before rivers.
        await placeIsolatedMountains([{ feature: "Isolated Mountain" }], grid);
        expect(grid.cells.get("1,1").terrain).toBe("Isolated Mountain");
    });

    it("Cliff: excludes a border pair in favor of an interior one", async () => {
        const grid = createPlacementGrid(4, 3);
        grid.cells.set("1,1", { kind: "terrain", terrain: "Mountains", regionId: 1 }); // interior
        grid.cells.set("2,1", { kind: "terrain", terrain: "Hills", regionId: 2 }); // interior, adjacent to (1,1)
        grid.cells.set("0,0", { kind: "terrain", terrain: "Plains", regionId: 3 }); // border
        grid.cells.set("1,0", { kind: "terrain", terrain: "Badlands", regionId: 4 }); // border, adjacent to (0,0)
        globalThis.__rollQueue = [1]; // only 1 candidate pair once the border pair is excluded
        const { cliffs } = await placeSpecialFeatures([{ feature: "Cliff" }], grid, [], []);
        expect(cliffs).toHaveLength(1);
        // The path traces the shared edge's own corner points, not the two cell centers.
        expect(cliffs[0].path).toEqual([{ x: 2, y: 1 }, { x: 2, y: 2 }]);
    });

    it("Cliff: traces the entire shared boundary between two regions, not just one cell-pair", async () => {
        const grid = createPlacementGrid(4, 4);
        // Two regions sharing a 2-cell-long vertical boundary (both pairs interior).
        grid.cells.set("1,1", { kind: "terrain", terrain: "Mountains", regionId: 1 });
        grid.cells.set("1,2", { kind: "terrain", terrain: "Mountains", regionId: 1 });
        grid.cells.set("2,1", { kind: "terrain", terrain: "Hills", regionId: 2 });
        grid.cells.set("2,2", { kind: "terrain", terrain: "Hills", regionId: 2 });
        globalThis.__rollQueue = [1]; // picks either of the 2 same-region-pair candidates as the seed
        const { cliffs } = await placeSpecialFeatures([{ feature: "Cliff" }], grid, [], []);
        expect(cliffs).toHaveLength(1);
        // Both segments' shared-edge corners, deduplicated into one continuous 3-point line.
        expect(cliffs[0].path).toEqual([{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }]);
    });

    it("Cliff: stops the traced line where a third blob interrupts the border, instead of jumping to a disconnected stretch of the same two regions", async () => {
        // Mountains borders Hills along two separate stretches, split by a Badlands blob
        // wedged in the middle (a regression case: the old implementation collected every
        // Mountains/Hills corner point on the map and sorted them into one straight line,
        // drawing a cliff straight across the intervening Badlands).
        const grid = createPlacementGrid(5, 4);
        grid.cells.set("1,1", { kind: "terrain", terrain: "Mountains", regionId: 1 });
        grid.cells.set("2,1", { kind: "terrain", terrain: "Mountains", regionId: 1 });
        grid.cells.set("3,1", { kind: "terrain", terrain: "Mountains", regionId: 1 });
        grid.cells.set("1,2", { kind: "terrain", terrain: "Hills", regionId: 2 });
        grid.cells.set("2,2", { kind: "terrain", terrain: "Badlands", regionId: 3 });
        grid.cells.set("3,2", { kind: "terrain", terrain: "Hills", regionId: 2 });
        globalThis.__rollQueue = [1]; // seeds on the (1,1)-(1,2) Mountains/Hills pair
        const { cliffs } = await placeSpecialFeatures([{ feature: "Cliff" }], grid, [], []);
        expect(cliffs).toHaveLength(1);
        // Stops at the corner where Badlands wedges in — never reaches the far (3,1)-(3,2)
        // Mountains/Hills stretch on the other side of it.
        expect(cliffs[0].path).toEqual([{ x: 1, y: 2 }, { x: 2, y: 2 }]);
    });

    it("Cliff: traces the boundary between two adjacent cells of different regions", async () => {
        const grid = fillGrid(2, 1, [
            { id: 1, type: "Mountains", cells: [{ x: 0, y: 0 }] },
            { id: 2, type: "Hills", cells: [{ x: 1, y: 0 }] },
        ]);
        globalThis.__rollQueue = [1];
        await placeSpecialFeatures([{ feature: "Cliff" }], grid, [], []);
        // Cliffs are a boundary line (returned via the dispatcher), not a grid overwrite.
        expect(grid.cells.get("0,0").terrain).toBe("Mountains");
        expect(grid.cells.get("1,0").terrain).toBe("Hills");
    });

    describe("Cliff on a hex grid — corner-as-3-cube-coordinates math", () => {
        it("traces the 2-corner boundary between a single adjacent hex pair", async () => {
            // (2,2) and (3,2) are cube-adjacent on a 5x5 hex grid. Each corner of their
            // shared edge is identified by the 3 cube coordinates of the (up to 3) hexes
            // meeting there — here both corners include (2,2) and (3,2) themselves plus one
            // more real or virtual neighbor apiece, confirmed by running the actual
            // neighbor-intersection math (`neighborsOfCube(A) ∩ neighborsOfCube(B)`).
            const grid = fillGrid(5, 5, [
                { id: 1, type: "Mountains", cells: [{ x: 2, y: 2 }] },
                { id: 2, type: "Hills", cells: [{ x: 3, y: 2 }] },
            ], "hex");
            globalThis.__rollQueue = [1];
            const { cliffs } = await placeSpecialFeatures([{ feature: "Cliff" }], grid, [], []);
            expect(cliffs).toHaveLength(1);
            expect(cliffs[0].path).toEqual([
                { hexes: [{ q: 1, r: 2, s: -3 }, { q: 2, r: 2, s: -4 }, { q: 2, r: 1, s: -3 }] },
                { hexes: [{ q: 1, r: 2, s: -3 }, { q: 2, r: 2, s: -4 }, { q: 1, r: 3, s: -4 }] },
            ]);
        });

        it("walks a connected multi-segment chain across a 2x2 block of two regions, correctly linking corners by shared hexes", async () => {
            // A 2-cell Mountains blob against a 2-cell Hills blob traces a single connected
            // 4-corner / 3-segment chain — every consecutive pair of corners in the path
            // shares exactly 2 of its 3 cube coordinates (the two hexes bounding that real
            // edge), which is what proves `walkBoundaryChain`'s generic "compare by .key"
            // walk is correctly stitching hex corners together, not just square ones.
            const grid = fillGrid(5, 5, [
                { id: 1, type: "Mountains", cells: [{ x: 2, y: 2 }, { x: 2, y: 3 }] },
                { id: 2, type: "Hills", cells: [{ x: 3, y: 2 }, { x: 3, y: 3 }] },
            ], "hex");
            globalThis.__rollQueue = [1];
            const { cliffs } = await placeSpecialFeatures([{ feature: "Cliff" }], grid, [], []);
            expect(cliffs).toHaveLength(1);
            const path = cliffs[0].path;
            expect(path).toHaveLength(4);
            const cubeKey = h => `${h.q},${h.r}`;
            const cornerKeys = path.map(c => new Set(c.hexes.map(cubeKey)));
            for (let i = 1; i < cornerKeys.length; i++) {
                const shared = [...cornerKeys[i - 1]].filter(k => cornerKeys[i].has(k));
                expect(shared).toHaveLength(2); // consecutive corners share exactly the edge's 2 hexes
            }
            // Every corner is a physically distinct vertex — no accidental collapsing/looping.
            const allKeys = path.map(c => [...c.hexes.map(cubeKey)].sort().join("|"));
            expect(new Set(allKeys).size).toBe(4);
        });
    });

    it("Fertile Valley: avoids Swamps when any non-Swamp cell is available", async () => {
        const grid = fillGrid(2, 1, [
            { id: 1, type: "Swamps", cells: [{ x: 0, y: 0 }] },
            { id: 2, type: "Plains", cells: [{ x: 1, y: 0 }] },
        ]);
        globalThis.__rollQueue = [1]; // only 1 non-Swamp candidate
        await placeSpecialFeatures([{ feature: "Fertile Valley" }], grid, [], []);
        expect(grid.cells.get("1,0").terrain).toBe("Fertile Valley");
        expect(grid.cells.get("0,0").terrain).toBe("Swamps");
    });

    it("Geyser: placed at the source of a random existing river", async () => {
        const grid = createPlacementGrid(5, 5);
        const rivers = [{ id: 1, path: [{ x: 2, y: 2 }, { x: 2, y: 3 }] }];
        globalThis.__rollQueue = [1]; // pick the (only) river
        await placeSpecialFeatures([{ feature: "Geyser" }], grid, [], rivers);
        expect(grid.cells.get("2,2").terrain).toBe("Geyser");
    });

    it("Geyser: with no rivers, places at a random cell and starts a brand-new river there", async () => {
        const grid = fillGrid(3, 1, [{ id: 1, type: "Plains", cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }] }]);
        const rivers = [];
        globalThis.__rollQueue = [2]; // pick cell (1,0) among the 3 free cells
        await placeSpecialFeatures([{ feature: "Geyser" }], grid, [], rivers);
        expect(grid.cells.get("1,0").terrain).toBe("Geyser");
        expect(rivers).toHaveLength(1);
    });

    it("Isolated Mountain: avoids Mountains when a non-Mountains cell is available", async () => {
        const grid = fillGrid(2, 1, [
            { id: 1, type: "Mountains", cells: [{ x: 0, y: 0 }] },
            { id: 2, type: "Plains", cells: [{ x: 1, y: 0 }] },
        ]);
        globalThis.__rollQueue = [1];
        await placeIsolatedMountains([{ feature: "Isolated Mountain" }], grid);
        expect(grid.cells.get("1,0").terrain).toBe("Isolated Mountain");
    });

    it("Isolated Mountain: placeSpecialFeatures ignores it (placed earlier, before rivers, via placeIsolatedMountains)", async () => {
        const grid = fillGrid(2, 1, [
            { id: 1, type: "Plains", cells: [{ x: 0, y: 0 }] },
            { id: 2, type: "Plains", cells: [{ x: 1, y: 0 }] },
        ]);
        await placeSpecialFeatures([{ feature: "Isolated Mountain" }], grid, [], []);
        expect(grid.cells.get("0,0").terrain).toBe("Plains");
        expect(grid.cells.get("1,0").terrain).toBe("Plains");
    });

    it("Pool: avoids Swamps and any cell on a river's path", async () => {
        const grid = fillGrid(3, 1, [
            { id: 1, type: "Swamps", cells: [{ x: 0, y: 0 }] },
            { id: 2, type: "Plains", cells: [{ x: 1, y: 0 }, { x: 2, y: 0 }] },
        ]);
        const rivers = [{ id: 1, path: [{ x: 1, y: 0 }] }];
        globalThis.__rollQueue = [1]; // only (2,0) qualifies
        await placeSpecialFeatures([{ feature: "Pool" }], grid, [], rivers);
        expect(grid.cells.get("2,0").terrain).toBe("Pool");
    });

    it("Tor: on the 70% roll, restricted to Plains cells when any exist", async () => {
        const grid = fillGrid(2, 1, [
            { id: 1, type: "Plains", cells: [{ x: 0, y: 0 }] },
            { id: 2, type: "Badlands", cells: [{ x: 1, y: 0 }] },
        ]);
        globalThis.__rollQueue = [5, 1]; // 1d10=5 (<=7, preference kicks in), 1d1=1 picks the only Plains cell
        await placeSpecialFeatures([{ feature: "Tor" }], grid, [], []);
        expect(grid.cells.get("0,0").terrain).toBe("Tor");
    });

    it("Tor: falls back to any cell when there are no Plains at all", async () => {
        const grid = fillGrid(2, 1, [
            { id: 1, type: "Badlands", cells: [{ x: 0, y: 0 }] },
            { id: 2, type: "Mountains", cells: [{ x: 1, y: 0 }] },
        ]);
        globalThis.__rollQueue = [9, 2]; // preference roll irrelevant (no Plains candidates); 1d2 picks any cell
        await placeSpecialFeatures([{ feature: "Tor" }], grid, [], []);
        const torCells = [...grid.cells.values()].filter(c => c.terrain === "Tor");
        expect(torCells).toHaveLength(1);
    });

    it("Volcano: on the 70% roll, restricted to Badlands/Plains cells when any exist", async () => {
        const grid = fillGrid(2, 1, [
            { id: 1, type: "Badlands", cells: [{ x: 0, y: 0 }] },
            { id: 2, type: "Mountains", cells: [{ x: 1, y: 0 }] },
        ]);
        globalThis.__rollQueue = [3, 1]; // 1d10=3 (<=7), 1d1=1 picks the only Badlands/Plains cell
        await placeSpecialFeatures([{ feature: "Volcano" }], grid, [], []);
        expect(grid.cells.get("0,0").terrain).toBe("Volcano");
    });

    it("Waterfall: sited at the first change of terrain type along an existing river", async () => {
        const grid = fillGrid(2, 1, [
            { id: 1, type: "Mountains", cells: [{ x: 0, y: 0 }] },
            { id: 2, type: "Plains", cells: [{ x: 1, y: 0 }] },
        ]);
        const rivers = [{ id: 1, path: [{ x: 0, y: 0 }, { x: 1, y: 0 }] }];
        globalThis.__rollQueue = [1]; // pick the (only) river
        await placeSpecialFeatures([{ feature: "Waterfall" }], grid, [], rivers);
        expect(grid.cells.get("1,0").terrain).toBe("Waterfall");
    });

    it("Waterfall: generates a river first when none exist yet", async () => {
        const grid = fillGrid(4, 4, [
            { id: 1, type: "Mountains", cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }] },
            {
                id: 2, type: "Plains", cells: [
                    { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 },
                    { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 },
                ],
            },
        ]);
        const regions = [
            { id: 1, type: "Mountains", cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }] },
            { id: 2, type: "Plains", cells: [{ x: 2, y: 0 }] },
        ];
        const rivers = [];
        // pickStartRegion picks the only Mountains region (1d1); walkRiverPath's source pick (1d2) and
        // its first different-region step (1d2) land it at (0,0) -> (0,1), a Mountains -> Plains boundary
        // (found on the very first scan, so it doesn't matter where the mandatory extra wandering step lands).
        globalThis.__rollQueue = [1, 1, 1, 1];
        await placeSpecialFeatures([{ feature: "Waterfall" }], grid, regions, rivers);
        expect(rivers).toHaveLength(1);
        const waterfallCells = [...grid.cells.values()].filter(c => c.terrain === "Waterfall");
        expect(waterfallCells).toHaveLength(1);
    });

    it("Whirlpool: generates a river first when none exist yet, then picks a random point on it", async () => {
        const grid = fillGrid(4, 4, [
            { id: 1, type: "Mountains", cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }] },
            {
                id: 2, type: "Plains", cells: [
                    { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 },
                    { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 },
                ],
            },
        ]);
        const regions = [
            { id: 1, type: "Mountains", cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }] },
            { id: 2, type: "Plains", cells: [{ x: 2, y: 0 }] },
        ];
        const rivers = [];
        globalThis.__rollQueue = [1, 1, 1, 1, 2]; // fallback river generation (4 rolls), then 1d3 to pick a path point
        await placeSpecialFeatures([{ feature: "Whirlpool" }], grid, regions, rivers);
        expect(rivers).toHaveLength(1);
        const whirlpoolCells = [...grid.cells.values()].filter(c => c.terrain === "Whirlpool");
        expect(whirlpoolCells).toHaveLength(1);
    });

    it("dispatches multiple rolls in order, accumulating cliffs", async () => {
        const grid = fillGrid(2, 1, [
            { id: 1, type: "Mountains", cells: [{ x: 0, y: 0 }] },
            { id: 2, type: "Hills", cells: [{ x: 1, y: 0 }] },
        ]);
        globalThis.__rollQueue = [1, 1]; // Cliff pair pick; Fertile Valley pick
        const { cliffs } = await placeSpecialFeatures(
            [{ feature: "Cliff" }, { feature: "Fertile Valley" }],
            grid, [], [],
        );
        expect(cliffs).toHaveLength(1);
    });
});
