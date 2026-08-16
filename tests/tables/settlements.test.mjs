import { describe, it, expect } from "vitest";
import {
    VILLAGE_COUNT_TABLE, principalitySizeBand, COMMUNITY_FEATURES_TABLE,
    COMMUNITY_FEATURE_DESCRIPTIONS, ECONOMIC_RESOURCE_TABLE, RESOURCES_TABLE,
    STRONGHOLD_RESOURCES, CRAFTS_TABLE, STRONGHOLD_CRAFTS, ODDITIES_TABLE,
    SPECIAL_FEATURES_TABLE, SPECIAL_FEATURE_DESCRIPTIONS, PLACEMENT_GUIDANCE,
} from "../../src/tables/settlements.mjs";

describe("VILLAGE_COUNT_TABLE", () => {
    it("has 10 rows (1d10), one small/medium/large value each", () => {
        expect(VILLAGE_COUNT_TABLE.filter(Boolean)).toHaveLength(10);
        for (const row of VILLAGE_COUNT_TABLE.filter(Boolean)) {
            expect(row.small).toBeTypeOf("number");
            expect(row.medium).toBeTypeOf("number");
            expect(row.large).toBeTypeOf("number");
        }
    });
});

describe("principalitySizeBand", () => {
    it("bands at 80 and 150 squares", () => {
        expect(principalitySizeBand(80)).toBe("small");
        expect(principalitySizeBand(81)).toBe("medium");
        expect(principalitySizeBand(150)).toBe("medium");
        expect(principalitySizeBand(151)).toBe("large");
    });
});

describe("COMMUNITY_FEATURES_TABLE (Table 3-2)", () => {
    it("covers 1-90 explicitly plus an open-ended 91+ catch-all, ending in Special", () => {
        const bounded = COMMUNITY_FEATURES_TABLE.filter(e => e.max !== Infinity);
        expect(bounded.at(-1).max).toBe(90);
        expect(COMMUNITY_FEATURES_TABLE.at(-1)).toEqual({ max: Infinity, feature: "Special", modifierDelta: 0 });
    });

    it("only Economic Resource and Cultists change the modifier", () => {
        for (const entry of COMMUNITY_FEATURES_TABLE) {
            if (entry.feature === "EconomicResource") expect(entry.modifierDelta).toBe(10);
            else if (entry.feature === "Cultists") expect(entry.modifierDelta).toBe(-10);
            else expect(entry.modifierDelta).toBe(0);
        }
    });

    it("has a description for every terminal, non-Economic-Resource feature", () => {
        for (const feature of ["Stronghold", "Chokepoint", "Cultists"]) {
            expect(COMMUNITY_FEATURE_DESCRIPTIONS[feature], feature).toBeTypeOf("string");
        }
    });
});

describe("ECONOMIC_RESOURCE_TABLE (Table 3-3)", () => {
    it("covers 1-8 explicitly plus an open-ended Market catch-all", () => {
        expect(ECONOMIC_RESOURCE_TABLE.map(e => e.kind)).toEqual(["Resource", "Craft", "Oddity", "Market"]);
        expect(ECONOMIC_RESOURCE_TABLE.at(-1).max).toBe(Infinity);
    });
});

describe("RESOURCES_TABLE and CRAFTS_TABLE (Tables 3-4/3-5)", () => {
    it("Resources covers 1-100 with no gaps", () => {
        expect(RESOURCES_TABLE.at(-1).max).toBe(100);
    });

    it("Crafts covers 1-100 with no gaps", () => {
        expect(CRAFTS_TABLE.at(-1).max).toBe(100);
    });

    it("flags gemstone/gold/silver mines and Gem Cutter/Goldsmith as Stronghold triggers", () => {
        expect(STRONGHOLD_RESOURCES).toEqual(new Set(["Mine, gemstones", "Mine, gold", "Mine, silver"]));
        expect(STRONGHOLD_CRAFTS).toEqual(new Set(["Gem Cutter", "Goldsmith"]));
    });
});

describe("ODDITIES_TABLE (Table 3-6)", () => {
    it("has 10 self-contained flavor entries", () => {
        expect(ODDITIES_TABLE.filter(Boolean)).toHaveLength(10);
        for (const entry of ODDITIES_TABLE.filter(Boolean)) expect(entry.oddity).toBeTypeOf("string");
    });
});

describe("SPECIAL_FEATURES_TABLE (Table 3-7)", () => {
    it("has 10 entries (1d10), two of them Roll Twice", () => {
        const entries = SPECIAL_FEATURES_TABLE.filter(Boolean);
        expect(entries).toHaveLength(10);
        expect(entries.filter(e => e.type === "RollTwice")).toHaveLength(2);
    });

    it("has a description for every terminal type except Roll Twice and Cultists (which reuses Table 3-2's description)", () => {
        const terminalTypes = new Set(SPECIAL_FEATURES_TABLE.filter(Boolean).map(e => e.type));
        terminalTypes.delete("RollTwice");
        terminalTypes.delete("Cultists");
        for (const type of terminalTypes) expect(SPECIAL_FEATURE_DESCRIPTIONS[type], type).toBeTypeOf("string");
    });
});

describe("PLACEMENT_GUIDANCE", () => {
    it("has guidance text for every settlement tier", () => {
        for (const tier of ["town", "village", "homestead"]) expect(PLACEMENT_GUIDANCE[tier], tier).toBeTypeOf("string");
    });
});
