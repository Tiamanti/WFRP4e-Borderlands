import { describe, it, expect } from "vitest";
import {
    lookupBand, RUIN_COUNT_TABLE, RUIN_TYPE_TABLE, ANCIENT_MENACES_TABLE, ORIGINAL_PURPOSE_TABLE,
} from "../../src/tables/ruins.mjs";

describe("lookupBand", () => {
    it("returns the band whose max is >= the roll, at the low end, high end, and a boundary", () => {
        expect(lookupBand(RUIN_COUNT_TABLE, 1).count).toBe(1);
        expect(lookupBand(RUIN_COUNT_TABLE, 10).count).toBe(1); // boundary: last roll still in the first band
        expect(lookupBand(RUIN_COUNT_TABLE, 11).count).toBe(2); // boundary: first roll in the next band
        expect(lookupBand(RUIN_COUNT_TABLE, 100).count).toBe(10);
    });
});

describe("ruins table transcription sanity", () => {
    it("every Ancient Menaces column (Table 1-5) covers the full 1-100 range", () => {
        for (const column of Object.values(ANCIENT_MENACES_TABLE)) {
            expect(column.at(-1).max).toBe(100);
        }
    });

    it("every Original Purpose column (Table 1-7) covers the full 1-100 range", () => {
        for (const column of Object.values(ORIGINAL_PURPOSE_TABLE)) {
            expect(column.at(-1).max).toBe(100);
        }
    });

    it("Ruin Type table (1-4) has all six types and covers the full 1-100 range", () => {
        expect(RUIN_TYPE_TABLE.map(entry => entry.type))
            .toEqual(["Arabyan", "Chaos Cults", "Dwarf", "Khemri", "Recent Human", "Oddity"]);
        expect(RUIN_TYPE_TABLE.at(-1).max).toBe(100);
    });

    it("Original Purpose table has no Oddity column (handled by a double-roll instead)", () => {
        expect(ORIGINAL_PURPOSE_TABLE.Oddity).toBeUndefined();
    });
});
