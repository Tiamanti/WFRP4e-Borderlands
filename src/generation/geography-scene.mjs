// Foundry-side effects for materializing the Geography phase onto a Scene (docs/DECISIONS.md
// "Geography (redesign)"). Kept separate from the pure roll/placement logic in geography.mjs/
// geography-terrain.mjs/geography-rivers.mjs/geography-features.mjs so those stay
// unit-testable without a real Foundry environment.

import { FEATURE_COLORS, VEGETATION_OPACITY, DEFAULT_VEGETATION_OPACITY } from "../tables/geography.mjs";

/**
 * Creates the Scene Geography paints onto (20x20 grid by default), with Global Illumination
 * enabled. Re-running Geography on a region that already has a scene reuses it instead of
 * creating a second one — its existing Drawings are cleared first, matching the "reuse
 * folder/journal, rebuild content" convention already used by Relationships/Settlements'
 * per-owner journal pages.
 */
export async function createGeographyScene(region, { width = 20, height = 20, gridSize = 100 } = {}) {
    const existing = region.geography.sceneId ? game.scenes.get(region.geography.sceneId) : null;
    if (existing) {
        const drawingIds = existing.drawings.map(d => d.id);
        if (drawingIds.length > 0) await existing.deleteEmbeddedDocuments("Drawing", drawingIds);
        return existing;
    }

    const scene = await Scene.create({
        name: region.geography.sceneName ?? "Borderlands",
        grid: { type: CONST.GRID_TYPES.SQUARE, size: gridSize },
        width: width * gridSize,
        height: height * gridSize,
        // Foundry's default 0.25 padding inflates the scene well past the generated grid,
        // which then can't be fully explored/seen by players — this scene has no need for
        // padding around the playable area, so it's turned off entirely.
        padding: 0,
        // Makes the generated map the one players see immediately, without the GM having
        // to remember to activate it by hand.
        active: true,
        // The GM shouldn't need to hand-light a freshly generated map before players can
        // see it — the whole point of this scene is to be immediately explorable.
        environment: { globalLight: { enabled: true } },
    });
    region.geography.sceneId = scene.id;
    return scene;
}

/**
 * One text-labelled Drawing per grid cell (terrain or an overwritten special feature),
 * batched into a single createEmbeddedDocuments call. Drawing, not Tile: core TileDocument
 * always needs an image texture, while DrawingDocument natively supports a plain `text`
 * field — exactly the "label, no art" square this phase needs. If terrain art gets added
 * later, swapping these for image-backed Tiles is contained to this one function.
 */
export async function paintGrid(scene, grid) {
    const gridSize = scene.grid.size;
    const drawings = [];
    for (const [key, cell] of grid.cells) {
        const [x, y] = key.split(",").map(Number);
        const fillColor = FEATURE_COLORS[cell.terrain] ?? "#777777";
        // Color groups by terrain category alone, but two terrain rows can share a category
        // (e.g. "Forested Hills" and "Grassy Hills" are both just "Hills") — the label needs
        // the vegetation prefix too, or same-colored tiles of that category are indistinguishable.
        // `cell.label`, when set (Caves), overrides this with a location-aware description
        // instead — see geography-features.mjs's placeCaves.
        const label = cell.label ?? (cell.vegetation ? `${cell.vegetation} ${cell.terrain}` : cell.terrain);
        // Opacity is the other vegetation cue, denser growth reading as more opaque —
        // Scrubland and any cell with no vegetation qualifier (row 68's plain "Swamps",
        // every overwritten Special Feature) share the same default.
        const fillAlpha = VEGETATION_OPACITY[cell.vegetation] ?? DEFAULT_VEGETATION_OPACITY;
        drawings.push({
            x: x * gridSize,
            y: y * gridSize,
            shape: { type: "r", width: gridSize, height: gridSize },
            text: label,
            fontSize: 14,
            fillType: CONST.DRAWING_FILL_TYPES.SOLID,
            fillColor,
            fillAlpha,
            strokeColor: "#000000",
            strokeWidth: 2,
            strokeAlpha: 0.5,
            flags: { "wfrp4e-borderlands": { terrain: cell.terrain, vegetation: cell.vegetation } },
        });
    }
    if (drawings.length === 0) return [];
    return scene.createEmbeddedDocuments("Drawing", drawings);
}

/** Converts a path (in `toPixel`'s coordinate space) into a bounding-box-relative polygon Drawing shape. */
function pathToShape(path, toPixel) {
    const pixels = path.map(toPixel);
    const xs = pixels.map(p => p.x), ys = pixels.map(p => p.y);
    const minX = Math.min(...xs), minY = Math.min(...ys);
    const maxX = Math.max(...xs), maxY = Math.max(...ys);
    const points = pixels.flatMap(p => [p.x - minX, p.y - minY]);
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY, points };
}

/** One freehand polygon Drawing per river path — drawn through each cell's *center*, river.path being a list of (fractional, at a border exit) cell coordinates. */
export async function paintRivers(scene, rivers) {
    const gridSize = scene.grid.size;
    const toPixel = p => ({ x: p.x * gridSize + gridSize / 2, y: p.y * gridSize + gridSize / 2 });
    const drawings = rivers
        .filter(river => river.path.length > 1)
        .map(river => {
            const { x, y, width, height, points } = pathToShape(river.path, toPixel);
            return {
                x, y,
                shape: { type: "p", width, height, points },
                strokeColor: "#2196f3", strokeWidth: 8, strokeAlpha: 0.9,
                // Smooths the freehand polyline into a curve — rivers wander, so a fully
                // smoothed line reads more naturally than the raw jagged step-by-step path.
                bezierFactor: 1,
                fillType: CONST.DRAWING_FILL_TYPES.NONE,
                flags: { "wfrp4e-borderlands": { feature: "River" } },
            };
        });
    if (drawings.length === 0) return [];
    return scene.createEmbeddedDocuments("Drawing", drawings);
}

/** One freehand polygon Drawing per cliff boundary segment — drawn through each point *as-is* (no cell-centering), since `geography-features.mjs`'s `sharedEdgeCorners` already returns exact grid-line corner coordinates, not cell coordinates. */
export async function paintCliffs(scene, cliffs) {
    const gridSize = scene.grid.size;
    const toPixel = p => ({ x: p.x * gridSize, y: p.y * gridSize });
    const drawings = cliffs
        .filter(cliff => cliff.path.length > 1)
        .map(cliff => {
            const { x, y, width, height, points } = pathToShape(cliff.path, toPixel);
            return {
                x, y,
                shape: { type: "p", width, height, points },
                strokeColor: "#795548", strokeWidth: 10, strokeAlpha: 0.9,
                fillType: CONST.DRAWING_FILL_TYPES.NONE,
                flags: { "wfrp4e-borderlands": { feature: "Cliff" } },
            };
        });
    if (drawings.length === 0) return [];
    return scene.createEmbeddedDocuments("Drawing", drawings);
}
