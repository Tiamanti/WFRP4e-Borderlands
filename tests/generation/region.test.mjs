import { describe, it, expect } from "vitest";
import { REGION_PHASES, createRegion, runPhase } from "../../src/generation/region.mjs";

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
        await expect(runPhase(region, "ruins")).rejects.toThrow(/not yet implemented/);
    });

    it("geography is driven by the Geography Roller dialog, not runPhase", async () => {
        const region = createRegion();
        await expect(runPhase(region, "geography")).rejects.toThrow(/Geography Roller/);
    });
});
