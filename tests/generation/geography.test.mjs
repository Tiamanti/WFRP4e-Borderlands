import { describe, it, expect, beforeEach } from "vitest";
import { rollGeographyStep, rollSpecialFeature, rollGeographyBatch } from "../../src/generation/geography.mjs";

describe("geography rolls", () => {
    beforeEach(() => {
        globalThis.__rollQueue = [];
    });

    it("returns a river entry for a table total that's a river row", async () => {
        globalThis.__rollQueue = [10]; // 1d100 = 10 -> River (Table 1-1)
        const result = await rollGeographyStep(0);
        expect(result.type).toBe("river");
        expect(result.total).toBe(10);
    });

    it("returns a terrain entry with a rolled size for a normal row", async () => {
        globalThis.__rollQueue = [1, 42]; // 1d100 = 1 -> Barren Plains; size roll = 42
        const result = await rollGeographyStep(0);
        expect(result.type).toBe("terrain");
        expect(result.terrain).toBe("Plains");
        expect(result.vegetation).toBe("Barren");
        expect(result.size).toBe(42);
    });

    it("delegates to a special feature when the total is over 100", async () => {
        globalThis.__rollQueue = [95, 3]; // 95 + 10 bonus = 105 -> special; 1d10 = 3 -> Fertile Valley
        const result = await rollGeographyStep(10);
        expect(result.type).toBe("special");
        expect(result.feature).toBe("Fertile Valley");
        expect(result.size).toBeNull();
    });

    it("rolls a size only for special features that have one (Caves/Cliff)", async () => {
        globalThis.__rollQueue = [1, 55]; // 1d10 = 1 -> Caves; size roll = 55
        const caves = await rollSpecialFeature();
        expect(caves.feature).toBe("Caves");
        expect(caves.placement).toBe("area");
        expect(caves.size).toBe(55);

        globalThis.__rollQueue = [7]; // 1d10 = 7 -> Tor, no size to roll
        const tor = await rollSpecialFeature();
        expect(tor.feature).toBe("Tor");
        expect(tor.placement).toBe("single");
        expect(tor.size).toBeNull();
    });

    it("marks Cliff as a boundary feature — its roll is a height, not a square count", async () => {
        globalThis.__rollQueue = [2, 650]; // 1d10 = 2 -> Cliff; height roll = 650 (feet)
        const cliff = await rollSpecialFeature();
        expect(cliff.feature).toBe("Cliff");
        expect(cliff.placement).toBe("boundary");
        expect(cliff.size).toBe(650);
        expect(cliff.sizeUnit).toBe("feet");
    });

    describe("banLargeRegions", () => {
        it("does nothing when the option is off (default)", async () => {
            globalThis.__rollQueue = [85, 40]; // 85 would be banned if the option were on
            const result = await rollGeographyStep(0);
            expect(result.total).toBe(85);
        });

        it("rerolls 81-99 without increasing the bonus, on a map under 500 squares", async () => {
            globalThis.__rollQueue = [85, 2, 50]; // 85 banned (small map) -> reroll; 2 -> Plains Scrubland; size 50
            const result = await rollGeographyStep(0, { banLargeRegions: true, mapSquares: 400 });
            expect(result.roll).toBe(2);
            expect(result.bonus).toBe(0); // the discarded 85 never bumped the bonus
            expect(result.total).toBe(2);
        });

        it("only bans 91-99 on a map of 500+ squares — 81-90 rolls through untouched", async () => {
            globalThis.__rollQueue = [85, 40]; // 85 not banned on a large map
            const result = await rollGeographyStep(0, { banLargeRegions: true, mapSquares: 600 });
            expect(result.total).toBe(85);
        });

        it("still rerolls 91-99 on a map of 500+ squares", async () => {
            globalThis.__rollQueue = [95, 2, 50]; // 95 banned even on a large map -> reroll; 2 -> Plains Scrubland; size 50
            const result = await rollGeographyStep(0, { banLargeRegions: true, mapSquares: 600 });
            expect(result.total).toBe(2);
        });

        it("never treats a >100 total (Special Feature) as banned", async () => {
            globalThis.__rollQueue = [95, 3]; // 95 + 10 bonus = 105 -> special, untouched by the ban; 1d10 3 -> Fertile Valley
            const result = await rollGeographyStep(10, { banLargeRegions: true, mapSquares: 400 });
            expect(result.type).toBe("special");
            expect(result.feature).toBe("Fertile Valley");
        });
    });

    describe("rollGeographyBatch", () => {
        it("stops once cumulative terrain size alone meets map capacity", async () => {
            globalThis.__rollQueue = [1, 4]; // 1d100=1 -> Plains Barren; size roll = 4, meets a 2x2=4 map
            const { log } = await rollGeographyBatch({ width: 2, height: 2 });
            expect(log).toHaveLength(1);
            expect(log[0].type).toBe("terrain");
        });

        it("excludes river and special feature rolls from the terrain-size budget", async () => {
            // Roll 1: total 10 -> River (no size, doesn't count). Roll 2: total 1+10 bonus =
            // 11 -> Plains, size roll 2, meets a 1x2=2 map only once this 2nd roll lands.
            globalThis.__rollQueue = [10, 1, 2];
            const { log } = await rollGeographyBatch({ width: 1, height: 2 });
            expect(log).toHaveLength(2);
            expect(log[0].type).toBe("river");
            expect(log[1].type).toBe("terrain");
        });

        it("stops at maxRolls as a safety cap even if capacity was never reached", async () => {
            globalThis.__rollQueue = [1, 1, 1, 1, 1, 1]; // 3 terrain rolls of size 1 each — far under a 100x100 map
            const { log } = await rollGeographyBatch({ width: 100, height: 100, maxRolls: 3 });
            expect(log).toHaveLength(3);
        });
    });
});
