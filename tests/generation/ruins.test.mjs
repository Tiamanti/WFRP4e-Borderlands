import { describe, it, expect, beforeEach } from "vitest";
import { rollAncientRuins, rollOriginalPurpose, rollSuggestedAge, pickRandomCell } from "../../src/generation/ruins.mjs";
import { AGE_OF_RUINS_TABLE } from "../../src/tables/ruins.mjs";
import { createRegion } from "../../src/generation/region.mjs";

describe("rollOriginalPurpose", () => {
    beforeEach(() => {
        globalThis.__rollQueue = [];
    });

    it("rolls once on the type's own column when it has one", async () => {
        globalThis.__rollQueue = [15]; // Arabyan Fortress is 1-30
        const purpose = await rollOriginalPurpose("Arabyan");
        expect(purpose).toEqual(["Fortress"]);
    });

    it("rolls twice on two independently-chosen columns and combines for Oddity (no column of its own)", async () => {
        // columns = ["Arabyan", "Chaos Cults", "Dwarf", "Khemri", "Recent Human"]
        globalThis.__rollQueue = [
            1, 30, // column pick 1 -> Arabyan; purpose roll 30 -> Fortress (1-30)
            3, 25, // column pick 3 -> Dwarf; purpose roll 25 -> Fortress (1-25)
        ];
        const purpose = await rollOriginalPurpose("Oddity");
        expect(purpose).toEqual(["Fortress", "Fortress"]);
    });
});

describe("rollSuggestedAge", () => {
    beforeEach(() => {
        globalThis.__rollQueue = [];
    });

    it("picks the first matching valid period when the period-pick roll is 1, and returns the queued year", async () => {
        const validPeriods = AGE_OF_RUINS_TABLE.filter(band => band.validTypes.includes("Dwarf"));
        globalThis.__rollQueue = [1, 3500]; // period pick 1 -> first valid period; year roll -> 3500
        const age = await rollSuggestedAge("Dwarf");
        expect(age.period).toBe(validPeriods[0].period);
        expect(age.yearsAgo).toBe(3500);
    });
});

describe("pickRandomCell", () => {
    beforeEach(() => {
        globalThis.__rollQueue = [];
    });

    it("retries on a collision with usedCells until it finds a free cell", async () => {
        globalThis.__rollQueue = [1, 1, 2, 1]; // (0,0) collides, then (1,0) is free
        const cell = await pickRandomCell({ width: 3, height: 3 }, new Set(["0,0"]));
        expect(cell).toEqual({ x: 1, y: 0 });
    });
});

describe("rollAncientRuins", () => {
    beforeEach(() => {
        globalThis.__rollQueue = [];
    });

    it("produces the count of ruins indicated by the Table 1-3 roll, with the queued table results", async () => {
        const region = createRegion();
        globalThis.__rollQueue = [
            5, // count roll -> 1 ruin (Table 1-3, 01-10)
            10, // type roll -> Arabyan (Table 1-4, 01-20)
            1, // menace roll -> Daemon (Arabyan 01-25)
            1, // purpose roll -> Fortress (Arabyan 01-30)
            1, // reason roll -> Civil War (Table 1-8, 1)
            1, 300, // age: period pick 1 -> Historical (Arabyan's first valid period); year -> 300
            1, 1, // cell: x roll 1 -> 0, y roll 1 -> 0
        ];
        const ruins = await rollAncientRuins(region);
        expect(ruins).toEqual([{
            type: "Arabyan", menace: "Daemon", purpose: ["Fortress"], reason: "Civil War",
            age: { period: "Historical", yearsAgo: 300 }, cell: { x: 0, y: 0 },
        }]);
    });

    it("seeds cell collision-avoidance from ruins already recorded in region.ruins.entries", async () => {
        const region = createRegion({ mapSize: { width: 1, height: 2 } });
        region.ruins.entries.push({ cell: { x: 0, y: 0 } });
        globalThis.__rollQueue = [
            5, 10, 100, 1, 1, // count -> 1, type -> Arabyan, menace -> None (96-100), purpose -> Fortress, reason -> Civil War
            1, 300, // age
            1, 1, // first cell attempt -> (0,0), collides with the existing ruin
            1, 2, // second cell attempt -> (0,1), free
        ];
        const ruins = await rollAncientRuins(region);
        expect(ruins[0].cell).toEqual({ x: 0, y: 1 });
    });
});
