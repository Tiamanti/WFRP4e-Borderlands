import { describe, it, expect, beforeEach } from "vitest";
import { rollGeographyStep, rollSpecialFeature } from "../../src/generation/geography.mjs";

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
        expect(caves.size).toBe(55);

        globalThis.__rollQueue = [7]; // 1d10 = 7 -> Tor, no size to roll
        const tor = await rollSpecialFeature();
        expect(tor.feature).toBe("Tor");
        expect(tor.size).toBeNull();
    });
});
