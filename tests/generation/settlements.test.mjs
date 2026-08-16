import { describe, it, expect, beforeEach } from "vitest";
import {
    rollTownCheck, rollVillageCount, rollHomesteadCount, rollEconomicResourceDetail,
    rollCommunityFeatures, rollSettlement, rollOwnerSettlements,
} from "../../src/generation/settlements.mjs";

describe("rollTownCheck", () => {
    beforeEach(() => { globalThis.__rollQueue = []; });

    it("is true when 1d100 + principality squares exceeds 100", async () => {
        globalThis.__rollQueue = [60];
        expect(await rollTownCheck(50)).toBe(true);
    });

    it("is false otherwise", async () => {
        globalThis.__rollQueue = [5];
        expect(await rollTownCheck(50)).toBe(false);
    });
});

describe("rollVillageCount", () => {
    beforeEach(() => { globalThis.__rollQueue = []; });

    it("looks up Table 3-1's column for the given size band", async () => {
        globalThis.__rollQueue = [3]; // row 3: small 1, medium 2, large 3
        expect(await rollVillageCount("medium")).toBe(2);
    });
});

describe("rollHomesteadCount", () => {
    it("is a plain 1d10 roll", async () => {
        globalThis.__rollQueue = [7];
        expect(await rollHomesteadCount()).toBe(7);
    });
});

describe("rollEconomicResourceDetail", () => {
    beforeEach(() => { globalThis.__rollQueue = []; });

    it("resolves a Resource and applies its +2 modifier", async () => {
        const state = { modifier: 0, marketRolled: false };
        globalThis.__rollQueue = [2, 15]; // Table 3-3 -> Resource (1-4); Table 3-4, 15 -> Medicinal Plants (11-20)
        const detail = await rollEconomicResourceDetail(state);
        expect(detail).toEqual({ kind: "Resource", detail: "Medicinal Plants", isStronghold: false });
        expect(state.modifier).toBe(2);
    });

    it("flags Gem Cutter/Goldsmith crafts as Stronghold triggers, honoring a carried-over modifier", async () => {
        const state = { modifier: 2, marketRolled: false };
        globalThis.__rollQueue = [4, 37]; // base 4 + modifier 2 = 6 -> Craft (5-7); Table 3-5, 37 -> Gem Cutter
        const detail = await rollEconomicResourceDetail(state);
        expect(detail).toEqual({ kind: "Craft", detail: "Gem Cutter", isStronghold: true });
    });

    it("resolves an Oddity as a self-contained flavor string", async () => {
        const state = { modifier: 0, marketRolled: false };
        globalThis.__rollQueue = [8, 3]; // Table 3-3 -> Oddity (8); Table 3-6, 3 -> the doctor entry
        const detail = await rollEconomicResourceDetail(state);
        expect(detail.kind).toBe("Oddity");
        expect(detail.detail).toMatch(/competent doctor/);
    });

    it("treats a settlement's later Market results as Craft", async () => {
        const state = { modifier: 0, marketRolled: false };
        globalThis.__rollQueue = [10]; // first Market result stands
        const first = await rollEconomicResourceDetail(state);
        expect(first).toEqual({ kind: "Market", detail: null, isStronghold: false });

        globalThis.__rollQueue = [9, 56]; // second Market-range roll -> rerouted to Craft; Table 3-5, 56 -> Smith
        const second = await rollEconomicResourceDetail(state);
        expect(second).toEqual({ kind: "Craft", detail: "Smith", isStronghold: false });
    });
});

describe("rollCommunityFeatures", () => {
    beforeEach(() => { globalThis.__rollQueue = []; });

    it("Chokepoint grants exactly one bonus roll, and a second Chokepoint on that reroll is ignored entirely", async () => {
        globalThis.__rollQueue = [8, 8]; // both rolls land on Chokepoint (8)
        const features = await rollCommunityFeatures("village", { modifier: 0, marketRolled: false });
        expect(features).toEqual([{ type: "Chokepoint" }]);
    });

    it("Special's Roll Twice recurses, and a roll that goes negative after cumulative Cultists penalties yields no feature", async () => {
        globalThis.__rollQueue = [
            8, // roll 1: Chokepoint -> triggers one reroll
            10, // roll 2 (chokepoint's reroll): Special
            1, // Table 3-7: Roll Twice
            9, // roll 3 (first of the two): Cultists -> modifier -10
            5, // roll 4 (second of the two): 5 + (-10) = -5 -> no feature
        ];
        const features = await rollCommunityFeatures("village", { modifier: 0, marketRolled: false });
        expect(features).toEqual([{ type: "Chokepoint" }, { type: "Cultists" }]);
    });

    it("resolves an Economic Resource hit inline, mutating the shared resourceState", async () => {
        const resourceState = { modifier: 0, marketRolled: false };
        globalThis.__rollQueue = [3, 2, 5]; // Table 3-2 base 3 -> Economic Resource; Table 3-3 base 2 -> Resource; Table 3-4, 5 -> Furs
        const features = await rollCommunityFeatures("village", resourceState);
        expect(features).toEqual([{ kind: "Resource", detail: "Furs", isStronghold: false }]);
        expect(resourceState.modifier).toBe(2);
    });

    it("redirects a town's Monastery result to onMonasteryForTown instead of the town's own features, then rerolls", async () => {
        let monasteryRedirected = false;
        globalThis.__rollQueue = [
            10, // roll 1: Special
            6, // Table 3-7, 6 -> Monastery
            7, // reroll: Stronghold
        ];
        const features = await rollCommunityFeatures("town", { modifier: 0, marketRolled: false }, {
            onMonasteryForTown: () => { monasteryRedirected = true; },
        });
        expect(monasteryRedirected).toBe(true);
        expect(features).toEqual([{ type: "Stronghold" }]);
    });
});

describe("rollSettlement", () => {
    beforeEach(() => { globalThis.__rollQueue = []; });

    it("tops up a town's economic resources to the population-based minimum, on top of whatever the feature chain already produced", async () => {
        globalThis.__rollQueue = [
            7, // Table 3-2 base -> Stronghold (no Economic Resource from the chain itself)
            3200, // population -> floor(3200 / 1000) = 3 required resources
            1, 1, // top-up 1: Table 3-3 base 1 -> Resource; Table 3-4, 1 -> Furs
            2, 11, // top-up 2: base 2 + modifier 2 = 4 -> still Resource; Table 3-4, 11 -> Medicinal Plants
            1, 1, // top-up 3: base 1 + modifier 4 = 5 -> Craft; Table 3-5, 1 -> Armourer
        ];
        const settlement = await rollSettlement("town", "prince-1");
        expect(settlement.population).toBe(3200);
        expect(settlement.isStronghold).toBe(true);
        expect(settlement.features).toEqual([
            { type: "Stronghold" },
            { kind: "Resource", detail: "Furs", isStronghold: false },
            { kind: "Resource", detail: "Medicinal Plants", isStronghold: false },
            { kind: "Craft", detail: "Armourer", isStronghold: false },
        ]);
    });

    it("rolls village population as 3d10x10 and homestead population as 3d10, with no resource top-up", async () => {
        globalThis.__rollQueue = [7, 150]; // chain base -> Stronghold; population
        const village = await rollSettlement("village", "prince-1");
        expect(village.tier).toBe("village");
        expect(village.population).toBe(150);
        expect(village.features).toEqual([{ type: "Stronghold" }]);
    });

    it("has no name field when generateNames isn't passed (opt-in default)", async () => {
        globalThis.__rollQueue = [7, 150];
        const village = await rollSettlement("village", "prince-1");
        expect(village.name).toBeUndefined();
    });

    it("rolls a name when generateNames is true, biased toward ownerStyle", async () => {
        globalThis.__rollQueue = [
            7, 150, // chain base -> Stronghold; population
            50, 5, 3, // name: style roll <=50 -> Tilean (bias); Tilean First 5 -> "Arn"; Second 3 -> "enze"
        ];
        const village = await rollSettlement("village", "prince-1", { ownerStyle: "Tilean", generateNames: true });
        expect(village.name).toBe("Arnenze");
    });
});

describe("rollOwnerSettlements", () => {
    beforeEach(() => { globalThis.__rollQueue = []; });

    it("generates a town, a village (with a redirected Monastery attached), and a homestead for a principality", async () => {
        globalThis.__rollQueue = [
            60, // town check: 60 + 50 = 110 > 100 -> town exists
            10, 6, 7, // town's feature chain: Special -> Monastery (redirected) -> reroll -> Stronghold
            1500, // town population -> minimum 1 resource
            1, 1, // top-up: Table 3-3 -> Resource; Table 3-4, 1 -> Furs
            1, // village count (Table 3-1, small column, row 1) -> 1
            7, // village's feature chain -> Stronghold
            200, // village population
            1, // homestead count -> 1
            7, // homestead's feature chain -> Stronghold
            15, // homestead population
        ];
        const settlements = await rollOwnerSettlements("prince-1", 50);
        expect(settlements.map(s => s.tier)).toEqual(["town", "village", "homestead"]);
        expect(settlements.every(s => s.ownerId === "prince-1")).toBe(true);
        expect(settlements[1].features).toEqual([{ type: "Stronghold" }, { type: "Monastery" }]);
        expect(settlements[2].features).toEqual([{ type: "Stronghold" }]); // Monastery was consumed by the village, not passed further
    });

    it("skips the town entirely when the town check fails", async () => {
        globalThis.__rollQueue = [
            5, // town check: 5 + 10 = 15, not > 100 -> no town
            1, 7, 100, // village count -> 1; village chain -> Stronghold; population
            1, 7, 10, // homestead count -> 1; homestead chain -> Stronghold; population
        ];
        const settlements = await rollOwnerSettlements("prince-1", 10);
        expect(settlements.map(s => s.tier)).toEqual(["village", "homestead"]);
    });

    it("never rolls a town check for the uncontrolled area (principalitySize: null) and always uses the medium column", async () => {
        globalThis.__rollQueue = [
            1, 7, 50, // village count (medium column, row 1) -> 1; village chain -> Stronghold; population
            1, 7, 5, // homestead count -> 1; homestead chain -> Stronghold; population
        ];
        const settlements = await rollOwnerSettlements(null, null);
        expect(settlements.map(s => s.tier)).toEqual(["village", "homestead"]);
        expect(settlements.every(s => s.ownerId === null)).toBe(true);
    });
});
