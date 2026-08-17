import { describe, it, expect, beforeEach } from "vitest";
import { hexBorderFillers } from "../../src/generation/geography-border.mjs";
import { createPlacementGrid } from "../../src/generation/geography-grid.mjs";
import { FEATURE_COLORS, VEGETATION_OPACITY, RIVER_COLOR, RIVER_FILL_ALPHA } from "../../src/tables/geography.mjs";

function setCell(grid, x, y, terrain, vegetation = "Barren") {
    grid.cells.set(`${x},${y}`, { kind: "terrain", terrain, vegetation, regionId: 1 });
}

describe("hexBorderFillers", () => {
    beforeEach(() => {
        globalThis.__rollQueue = [];
    });

    it("returns nothing at all for a square grid", async () => {
        const grid = createPlacementGrid(3, 3, "square");
        setCell(grid, 0, 0, "Mountains");
        const fillers = await hexBorderFillers(grid, []);
        expect(fillers).toEqual([]);
    });

    it("gives every even row a left column filler and every odd row a right column filler, colored/opacity from that row's own bordering cell", async () => {
        const grid = createPlacementGrid(2, 2, "hex");
        // Row 0's and row 1's own pairs are kept same-terrain so the (unrelated, in this test)
        // top/bottom notch fillers never need a tie-break roll, keeping the queue empty and
        // this test focused purely on the column fillers.
        setCell(grid, 0, 0, "Mountains", "Forested"); // row 0 (even) -> left filler
        setCell(grid, 1, 0, "Mountains", "Barren");
        setCell(grid, 0, 1, "Badlands", "Barren");
        setCell(grid, 1, 1, "Badlands", "Grassy"); // row 1 (odd) -> right filler
        const fillers = await hexBorderFillers(grid, []);
        const column = fillers.filter(f => f.kind === "column");
        expect(column).toContainEqual({
            kind: "column", side: "left", y: 0,
            fillColor: FEATURE_COLORS.Mountains, fillAlpha: VEGETATION_OPACITY.Forested,
        });
        expect(column).toContainEqual({
            kind: "column", side: "right", y: 1,
            fillColor: FEATURE_COLORS.Badlands, fillAlpha: VEGETATION_OPACITY.Grassy,
        });
    });

    it("gives a column filler the river's paint when its one bordering cell is a genuine river exit", async () => {
        const grid = createPlacementGrid(3, 3, "hex");
        setCell(grid, 0, 0, "Plains"); // would otherwise smooth to Plains' own color
        const rivers = [{ id: 1, startRegionId: 1, path: [{ x: 1, y: 0 }, { x: 0, y: 0 }] }];
        const fillers = await hexBorderFillers(grid, rivers);
        const column = fillers.filter(f => f.kind === "column");
        expect(column).toContainEqual({ kind: "column", side: "left", y: 0, fillColor: RIVER_COLOR, fillAlpha: RIVER_FILL_ALPHA });
    });

    it("gives a top-row notch (between two adjacent row-0 cells) the shared terrain's paint when they agree", async () => {
        const grid = createPlacementGrid(3, 2, "hex");
        setCell(grid, 0, 0, "Hills", "Grassy");
        setCell(grid, 1, 0, "Hills", "Grassy");
        setCell(grid, 2, 0, "Hills", "Barren"); // kept Hills too so the x=1 notch has no tie to break
        setCell(grid, 0, 1, "Plains");
        setCell(grid, 1, 1, "Plains");
        setCell(grid, 2, 1, "Plains");
        const fillers = await hexBorderFillers(grid, []);
        const notch = fillers.find(f => f.kind === "notch" && f.edge === "top" && f.x === 0);
        expect(notch).toMatchObject({ fillColor: FEATURE_COLORS.Hills, fillAlpha: VEGETATION_OPACITY.Grassy });
    });

    it("breaks a top-row notch tie between 2 differing bordering cells randomly", async () => {
        globalThis.__rollQueue = [1]; // 1d2 -> first of the two tied terrains in scan order
        const grid = createPlacementGrid(2, 1, "hex");
        setCell(grid, 0, 0, "Mountains");
        setCell(grid, 1, 0, "Swamps");
        const fillers = await hexBorderFillers(grid, []);
        const notch = fillers.find(f => f.kind === "notch" && f.edge === "top" && f.x === 0);
        expect(notch.fillColor).toBe(FEATURE_COLORS.Mountains);
    });

    it("gives a bottom-row notch the river's paint when either bordering cell is a genuine river exit", async () => {
        const grid = createPlacementGrid(2, 2, "hex");
        setCell(grid, 0, 0, "Plains");
        setCell(grid, 1, 0, "Plains");
        setCell(grid, 0, 1, "Plains");
        setCell(grid, 1, 1, "Plains");
        const rivers = [{ id: 1, startRegionId: 1, path: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }];
        const fillers = await hexBorderFillers(grid, rivers);
        const notch = fillers.find(f => f.kind === "notch" && f.edge === "bottom" && f.x === 0);
        expect(notch).toMatchObject({ fillColor: RIVER_COLOR, fillAlpha: RIVER_FILL_ALPHA });
    });

    it("only emits one row of notches for a 1-row-tall grid, not a duplicate top+bottom pair", async () => {
        const grid = createPlacementGrid(2, 1, "hex");
        setCell(grid, 0, 0, "Mountains");
        setCell(grid, 1, 0, "Mountains");
        const fillers = await hexBorderFillers(grid, []);
        const notches = fillers.filter(f => f.kind === "notch");
        expect(notches).toHaveLength(1);
        expect(notches[0].edge).toBe("top");
    });

    it("omits a column filler entirely when its bordering cell is unclaimed", async () => {
        const grid = createPlacementGrid(3, 1, "hex");
        const fillers = await hexBorderFillers(grid, []);
        expect(fillers.filter(f => f.kind === "column")).toEqual([]);
    });
});
