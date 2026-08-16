import { describe, it, expect } from "vitest";
import { collectFeatureDescriptions } from "../../src/generation/geography-journal.mjs";

describe("collectFeatureDescriptions", () => {
    it("dedupes repeated terrain/vegetation combos into a single labelled entry", () => {
        const log = [
            { type: "terrain", terrain: "Hills", vegetation: "Forested", cells: [{ x: 0, y: 0 }] },
            { type: "terrain", terrain: "Hills", vegetation: "Grassy", cells: [{ x: 1, y: 0 }] },
            { type: "terrain", terrain: "Hills", vegetation: "Forested", cells: [{ x: 2, y: 0 }] }, // repeat, should not duplicate
        ];
        const descriptions = collectFeatureDescriptions(log);
        expect([...descriptions.keys()]).toEqual(["Forested Hills", "Grassy Hills"]);
        expect(descriptions.get("Forested Hills")).toMatch(/./); // non-empty description text
    });

    it("uses the roll's own description for special features, deduped by feature name", () => {
        const log = [
            { type: "special", feature: "Tor", description: "A defensible hill.", cells: [{ x: 0, y: 0 }] },
            { type: "special", feature: "Tor", description: "A defensible hill.", cells: [{ x: 1, y: 1 }] },
        ];
        const descriptions = collectFeatureDescriptions(log);
        expect(descriptions.size).toBe(1);
        expect(descriptions.get("Tor")).toBe("A defensible hill.");
    });

    it("includes a single deduped River entry when rivers were rolled", () => {
        const descriptions = collectFeatureDescriptions([{ type: "river" }, { type: "river" }]);
        expect(descriptions.size).toBe(1);
        expect(descriptions.get("River")).toMatch(/./); // non-empty description text
    });
});
