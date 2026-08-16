import { describe, it, expect } from "vitest";
import { REGION_PHASES, createRegion, runPhase, isPhaseDone } from "../../src/generation/region.mjs";

describe("region", () => {
    it("creates an empty region with one field per phase", () => {
        const region = createRegion();
        for (const phase of REGION_PHASES) {
            expect(region).toHaveProperty(phase.id);
        }
    });

    it("defaults geography's scene name and map size, and accepts overrides", () => {
        expect(createRegion().geography).toMatchObject({ sceneName: "Borderlands", mapSize: { width: 20, height: 20 } });
        expect(createRegion({ sceneName: "My Region", mapSize: { width: 15, height: 15 } }).geography)
            .toMatchObject({ sceneName: "My Region", mapSize: { width: 15, height: 15 } });
    });

    it("has no journal folder or geography journal until a phase creates one", () => {
        const region = createRegion();
        expect(region.journalFolderId).toBeNull();
        expect(region.geography.journalId).toBeNull();
    });

    it("rejects an unknown phase id", async () => {
        await expect(runPhase(createRegion(), "not-a-phase")).rejects.toThrow(/Unknown Borderlands phase/);
    });

    it("phase generators are stubbed pending table data", async () => {
        const region = createRegion();
        await expect(runPhase(region, "hazards")).rejects.toThrow(/not yet implemented/);
    });

    it("relationships requires at least two princes", async () => {
        const region = createRegion();
        await expect(runPhase(region, "relationships")).rejects.toThrow(/Princes phase first/);
    });

    it("settlements requires the Princes phase to have run", async () => {
        const region = createRegion();
        await expect(runPhase(region, "settlements")).rejects.toThrow(/Princes phase first/);
    });

    it("geography is driven by the Geography Roller dialog, not runPhase", async () => {
        const region = createRegion();
        await expect(runPhase(region, "geography")).rejects.toThrow(/Geography Roller/);
    });

    it("ruins requires Geography's scene to exist first", async () => {
        const region = createRegion();
        await expect(runPhase(region, "ruins")).rejects.toThrow(/Geography phase first/);
    });

    describe("isPhaseDone", () => {
        it("checks geography's log, ruins'/princes' entries, and falls back to array/object-keys for the rest", () => {
            const region = createRegion();
            expect(isPhaseDone(region, "geography")).toBe(false);
            expect(isPhaseDone(region, "ruins")).toBe(false);
            expect(isPhaseDone(region, "princes")).toBe(false);
            expect(isPhaseDone(region, "relationships")).toBe(false);
            expect(isPhaseDone(region, "settlements")).toBe(false);

            region.geography.log.push({ type: "river" });
            region.ruins.entries.push({ type: "Dwarf" });
            region.princes.entries.push({});
            region.relationships.entries.push({});
            region.settlements.entries.push({});

            expect(isPhaseDone(region, "geography")).toBe(true);
            expect(isPhaseDone(region, "ruins")).toBe(true);
            expect(isPhaseDone(region, "princes")).toBe(true);
            expect(isPhaseDone(region, "relationships")).toBe(true);
            expect(isPhaseDone(region, "settlements")).toBe(true);
        });
    });
});
