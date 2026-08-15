import { describe, it, expect } from "vitest";
import { REGION_PHASES, createRegion, runPhase } from "../../src/generation/region.mjs";

describe("region", () => {
    it("creates an empty region with one field per phase", () => {
        const region = createRegion();
        for (const phase of REGION_PHASES) {
            expect(region).toHaveProperty(phase.id);
        }
    });

    it("rejects an unknown phase id", async () => {
        await expect(runPhase(createRegion(), "not-a-phase")).rejects.toThrow(/Unknown Borderlands phase/);
    });

    it("phase generators are stubbed pending table data", async () => {
        const region = createRegion();
        await expect(runPhase(region, "geography")).rejects.toThrow(/not yet implemented/);
    });
});
