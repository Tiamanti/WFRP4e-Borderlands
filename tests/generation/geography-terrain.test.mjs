import { describe, it, expect, beforeEach } from "vitest";
import { placeTerrainRolls } from "../../src/generation/geography-terrain.mjs";

function terrainRoll(terrain, size = 1, vegetation = "Barren") {
    return { type: "terrain", terrain, vegetation, size };
}

describe("placeTerrainRolls", () => {
    beforeEach(() => {
        globalThis.__rollQueue = [];
    });

    it("seeds the first Swamp from a random free border cell", async () => {
        globalThis.__rollQueue = [3]; // 1d8 border-cell index 3 -> (2,0) on a 3x3 grid
        const { regions } = await placeTerrainRolls([terrainRoll("Swamps")], { width: 3, height: 3 });
        expect(regions[0].cells).toEqual([{ x: 2, y: 0 }]);
    });

    it("seeds a later Swamp adjacent to the previous one's border cells on an 80%-or-under roll", async () => {
        // 1st swamp lands at (0,2) on a 5x5 grid (1d16 index 8 in row-major border order);
        // 2nd swamp's 1d100 roll (50, <=80) takes the adjacent-border branch, then 1d2 picks
        // between its two border-adjacent candidates (0,1)/(0,3).
        globalThis.__rollQueue = [8, 50, 2];
        const { regions } = await placeTerrainRolls(
            [terrainRoll("Swamps"), terrainRoll("Swamps")],
            { width: 5, height: 5 },
        );
        expect(regions[0].cells).toEqual([{ x: 0, y: 2 }]);
        expect(regions[1].cells).toEqual([{ x: 0, y: 3 }]);
    });

    it("falls back to a plain random border cell on the 20%+ roll", async () => {
        globalThis.__rollQueue = [8, 85, 1]; // 1st swamp at (0,2); 2nd rolls 85 (>80) -> fallback border pick
        const { regions } = await placeTerrainRolls(
            [terrainRoll("Swamps"), terrainRoll("Swamps")],
            { width: 5, height: 5 },
        );
        expect(regions[1].cells).toHaveLength(1);
    });

    it("seeds the first Mountains from the free border cell farthest from any Swamp (no roll needed — deterministic pick)", async () => {
        globalThis.__rollQueue = [1]; // Swamp #1 -> (0,0) on a 5x5 grid (1d16 index 1)
        const { regions } = await placeTerrainRolls(
            [terrainRoll("Swamps"), terrainRoll("Mountains")],
            { width: 5, height: 5 },
        );
        expect(regions[0].cells).toEqual([{ x: 0, y: 0 }]);
        expect(regions[1].cells).toEqual([{ x: 4, y: 4 }]); // farthest border cell from (0,0)
    });

    it("seeds the first Mountains from a random free border cell when there are no Swamps", async () => {
        globalThis.__rollQueue = [1]; // 1d8 border index 1 -> (0,0) on a 3x3 grid
        const { regions } = await placeTerrainRolls([terrainRoll("Mountains")], { width: 3, height: 3 });
        expect(regions[0].cells).toEqual([{ x: 0, y: 0 }]);
    });

    it("seeds a 2nd+ Mountains from a random free cell anywhere, no border constraint", async () => {
        globalThis.__rollQueue = [1, 5]; // Mountains #1 -> (0,0); Mountains #2 -> 1d8 free cells (excluding (0,0)) index 5
        const { regions } = await placeTerrainRolls(
            [terrainRoll("Mountains"), terrainRoll("Mountains")],
            { width: 3, height: 3 },
        );
        expect(regions[1].cells).toHaveLength(1);
        expect(regions[1].cells[0]).not.toEqual({ x: 0, y: 0 });
    });

    it("seeds Hills from a random free cell adjacent to Mountains", async () => {
        globalThis.__rollQueue = [1, 2]; // Mountains -> (0,0) on 3x3; Hills -> 1d3 among its 3 adjacent free cells, index 2
        const { regions } = await placeTerrainRolls(
            [terrainRoll("Mountains"), terrainRoll("Hills")],
            { width: 3, height: 3 },
        );
        expect(regions[0].type).toBe("Mountains");
        expect(regions[1].type).toBe("Hills");
        expect(regions[1].cells).toEqual([{ x: 0, y: 1 }]);
    });

    it("falls back to a random free cell for Hills when there are no Mountains", async () => {
        globalThis.__rollQueue = [4];
        const { regions } = await placeTerrainRolls([terrainRoll("Hills")], { width: 3, height: 3 });
        expect(regions[0].cells).toHaveLength(1);
    });

    it("seeds Badlands/Plains from a random free cell, no constraint", async () => {
        globalThis.__rollQueue = [2, 5];
        const { regions } = await placeTerrainRolls(
            [terrainRoll("Badlands"), terrainRoll("Plains")],
            { width: 3, height: 3 },
        );
        expect(regions[0].type).toBe("Badlands");
        expect(regions[1].type).toBe("Plains");
        expect(regions[0].cells).toHaveLength(1);
        expect(regions[1].cells).toHaveLength(1);
    });

    it("processes types in a fixed order (Swamps, Mountains, Hills, Badlands/Plains) regardless of roll order", async () => {
        globalThis.__rollQueue = [1, 1, 2, 3, 4];
        const { regions } = await placeTerrainRolls(
            [terrainRoll("Plains"), terrainRoll("Mountains"), terrainRoll("Swamps"), terrainRoll("Hills")],
            { width: 4, height: 4 },
        );
        expect(regions.map(r => r.type)).toEqual(["Swamps", "Mountains", "Hills", "Plains"]);
    });

    it("truncates a blob once the grid runs out of free cells, but still records the region", async () => {
        globalThis.__rollQueue = [1];
        const { regions } = await placeTerrainRolls([terrainRoll("Plains", 100)], { width: 2, height: 2 });
        expect(regions[0].cells).toHaveLength(4);
    });

    describe("hex grid (pointy-top, odd-row offset)", () => {
        it("seeds the first Mountains from the border cell farthest from any Swamp under hex tile-step distance, not Euclidean", async () => {
            // Swamp #1 -> (0,0) on a 5x5 grid, same seed roll as the square-grid equivalent
            // test above. Under hex distance the farthest border cell from (0,0) is (4,3) —
            // *not* (4,4), the square-grid answer — confirming the hex branch is actually
            // driving this pick, not just falling through to Euclidean math.
            globalThis.__rollQueue = [1];
            const { regions } = await placeTerrainRolls(
                [terrainRoll("Swamps"), terrainRoll("Mountains")],
                { width: 5, height: 5, type: "hex" },
            );
            expect(regions[0].cells).toEqual([{ x: 0, y: 0 }]);
            expect(regions[1].cells).toEqual([{ x: 4, y: 3 }]);
        });

        it("seeds Hills from a random free cell adjacent to Mountains, using the grid's 6-neighbor hex adjacency", async () => {
            // Mountains #1 -> (0,0) on a 3x3 hex grid (1d8 border index 1, same convention as
            // the square-grid equivalent test above). (0,0)'s only two in-bounds hex neighbors
            // on a 3x3 grid are (1,0) and (0,1) (every other cube direction falls off the
            // grid) — Hills' 1d2 roll of 1 picks the first, (1,0).
            globalThis.__rollQueue = [1, 1];
            const { regions } = await placeTerrainRolls(
                [terrainRoll("Mountains"), terrainRoll("Hills")],
                { width: 3, height: 3, type: "hex" },
            );
            expect(regions[0].type).toBe("Mountains");
            expect(regions[0].cells).toEqual([{ x: 0, y: 0 }]);
            expect(regions[1].type).toBe("Hills");
            expect(regions[1].cells).toEqual([{ x: 1, y: 0 }]);
        });
    });
});
