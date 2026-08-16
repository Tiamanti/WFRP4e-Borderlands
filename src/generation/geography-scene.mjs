// Foundry-side effects for materializing the Geography phase onto a Scene (PLAN.md §4).
// Kept separate from the pure roll/grid logic in geography.mjs and geography-grid.mjs so
// those stay unit-testable without a real Foundry environment.

/** Creates the Scene Geography paints onto (20x20 grid by default) and records its id on the region. */
export async function createGeographyScene(region, { width = 20, height = 20, gridSize = 100 } = {}) {
    const scene = await Scene.create({
        name: "Borderlands",
        grid: { type: CONST.GRID_TYPES.SQUARE, size: gridSize },
        width: width * gridSize,
        height: height * gridSize,
    });
    region.geography.sceneId = scene.id;
    return scene;
}

/**
 * One text-labelled Drawing per claimed grid cell (not one per feature), so later phases
 * can read terrain-at-cell straight off the scene's drawings instead of a separate
 * lookup structure. Drawing, not Tile: core TileDocument always needs an image texture,
 * while DrawingDocument natively supports a plain `text` field — exactly the "label, no
 * art" square this phase needs. If terrain art gets added later, swapping these for
 * image-backed Tiles is contained to this one function.
 */
export async function placeCellLabels(scene, cells, { terrain, vegetation }) {
    const gridSize = scene.grid.size;
    const drawings = cells.map(({ x, y }) => ({
        x: x * gridSize,
        y: y * gridSize,
        shape: { type: "r", width: gridSize, height: gridSize },
        text: terrain,
        fontSize: 16,
        flags: { "wfrp4e-borderlands": { terrain, vegetation } },
    }));
    return scene.createEmbeddedDocuments("Drawing", drawings);
}
