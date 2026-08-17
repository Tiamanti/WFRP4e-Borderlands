// Foundry-side effects for materializing the Geography phase onto a Scene (docs/DECISIONS.md
// "Geography (redesign)"). Kept separate from the pure roll/placement logic in geography.mjs/
// geography-terrain.mjs/geography-rivers.mjs/geography-features.mjs so those stay
// unit-testable without a real Foundry environment.

import { FEATURE_COLORS, VEGETATION_OPACITY, DEFAULT_VEGETATION_OPACITY, RIVER_COLOR, RIVER_FILL_ALPHA } from "../tables/geography.mjs";
import { offsetToCube, cubeToOffset } from "./geography-grid.mjs";

/**
 * Foundry's own raw offset column for one of our logical (x, y) hex cells. Live-tested: an
 * earlier fix tried skipping Foundry's raw row 0 (`hexRowShift`, see docs/DECISIONS.md)
 * expecting row-0 top-clipping, but produced **no visible change at all** — the wrong axis was
 * being adjusted. The actual fix is a *column* shift: on every even logical row (0, 2, 4, ...)
 * a cell's real column needs to start from Foundry's raw column `x + 1`, not `x` — odd rows are
 * left as `x` unchanged. `hexPixelExtent`'s real vertex scan over these actual (shifted)
 * columns then naturally comes out wider than an unshifted scan would (about half a tile, from
 * the even rows' cells needing one extra column of run-up room) — the exact right amount falls
 * out of the live grid's own geometry rather than being hand-computed as a fraction.
 */
export function hexColumnOf(x, y) {
    return y % 2 === 0 ? x + 1 : x;
}

/**
 * The true pixel extent (max x/y — *not* a min-shifted range) of a WxH hex grid, over Foundry's
 * actual (`hexColumnOf`-shifted) columns, under the given real, already-configured
 * `HexagonalGrid` instance — never a separately hand-built one (an earlier version guessed its
 * own `{columns,even}` config and got it wrong; see docs/DECISIONS.md). Still needed because
 * row-to-row spacing is `gridSize * sqrt(3)/2 ~= 0.866 * gridSize` for a pointy-top grid, not a
 * full `gridSize`, so a Scene sized by the naive `height * gridSize` formula the square grid
 * uses is measurably too tall (dead space at the bottom) — and scanning the shifted columns
 * (not `0..width-1`) is what makes this also come out correctly wider to fit even rows' run-up.
 */
function hexPixelExtent(grid, width, height) {
    let maxX = -Infinity, maxY = -Infinity;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            for (const v of grid.getVertices({ i: y, j: hexColumnOf(x, y) })) {
                if (v.x > maxX) maxX = v.x;
                if (v.y > maxY) maxY = v.y;
            }
        }
    }
    return { width: maxX, height: maxY };
}

/**
 * Creates the Scene Geography paints onto (20x20 grid by default), with Global Illumination
 * enabled. `gridShape` ("square" default, or "hex" — pointy-top, odd-row offset, Foundry's
 * `HEXODDR`, the only hex orientation this module supports) sets the Scene's own grid type;
 * every painter below reads it back off the live `scene.grid` instance rather than being told
 * separately, so they can never disagree with what the Scene actually is, and paints its raw
 * (never translated) coordinates — reading every even row from Foundry's raw column `x + 1`
 * (see `hexColumnOf`) so nothing lands with its left point off-canvas — so our Drawings land
 * pixel-identical to Foundry's own grid lines. A hex Scene gets created once at the naive
 * `width * gridSize` size, then immediately resized to its true pixel extent (`hexPixelExtent`)
 * computed against its own freshly-created `scene.grid` — not a size chosen up front —
 * specifically so that measurement can never disagree with what the painters see. Re-running
 * Geography on a region that already has a scene reuses it instead of creating a second one —
 * its existing Drawings are cleared first, matching the "reuse folder/journal, rebuild content"
 * convention already used by Relationships/Settlements' per-owner journal pages.
 */
export async function createGeographyScene(region, { width = 20, height = 20, gridSize = 100, gridShape = "square" } = {}) {
    const existing = region.geography.sceneId ? game.scenes.get(region.geography.sceneId) : null;
    if (existing) {
        const drawingIds = existing.drawings.map(d => d.id);
        if (drawingIds.length > 0) await existing.deleteEmbeddedDocuments("Drawing", drawingIds);
        return existing;
    }

    const scene = await Scene.create({
        name: region.geography.sceneName ?? "Borderlands",
        grid: { type: gridShape === "hex" ? CONST.GRID_TYPES.HEXODDR : CONST.GRID_TYPES.SQUARE, size: gridSize },
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

    if (gridShape === "hex") {
        const extent = hexPixelExtent(scene.grid, width, height);
        await scene.update({ width: extent.width, height: extent.height });
    }
    return scene;
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

/**
 * One text-labelled Drawing per grid cell (terrain or an overwritten special feature),
 * batched into a single createEmbeddedDocuments call. Drawing, not Tile: core TileDocument
 * always needs an image texture, while DrawingDocument natively supports a plain `text`
 * field — exactly the "label, no art" square this phase needs. If terrain art gets added
 * later, swapping these for image-backed Tiles is contained to this one function.
 *
 * On a hex Scene (`scene.grid.isHexagonal`) each cell is a hexagon polygon Drawing instead of
 * a rectangle, using the live grid instance's own `getVertices` — real pixel geometry for
 * whichever hex orientation the Scene actually is, no hand-rolled hex math here. Every hex
 * lookup uses `hexColumnOf` so even rows read from Foundry's raw column `x + 1`.
 */
export async function paintGrid(scene, grid) {
    const gridSize = scene.grid.size;
    const hex = scene.grid.isHexagonal;
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
        const common = {
            text: label,
            fontSize: 14,
            fillType: CONST.DRAWING_FILL_TYPES.SOLID,
            fillColor,
            fillAlpha,
            strokeColor: "#000000",
            strokeWidth: 2,
            strokeAlpha: 0.5,
            flags: { "wfrp4e-borderlands": { terrain: cell.terrain, vegetation: cell.vegetation } },
        };
        if (hex) {
            const vertices = scene.grid.getVertices({ i: y, j: hexColumnOf(x, y) });
            const { x: sx, y: sy, width, height, points } = pathToShape(vertices, p => p);
            drawings.push({ x: sx, y: sy, shape: { type: "p", width, height, points }, ...common });
        } else {
            drawings.push({
                x: x * gridSize, y: y * gridSize,
                shape: { type: "r", width: gridSize, height: gridSize },
                ...common,
            });
        }
    }
    if (drawings.length === 0) return [];
    return scene.createEmbeddedDocuments("Drawing", drawings);
}

/**
 * Sutherland-Hodgman clip of a convex polygon (a real hex's vertices always are) against a
 * single vertical half-plane — `keepGreaterEqual: true` keeps the part with `x >= boundaryX`
 * (a left-edge filler's sliver, everything at/right of the Scene's `x = 0` edge), `false` keeps
 * `x <= boundaryX` (a right-edge filler's sliver, everything at/left of the Scene's own right
 * edge). Inserts an exact edge-intersection point wherever the polygon crosses the boundary, so
 * the clipped result still shares a real edge with the Scene boundary and with its one true
 * neighbor hex — no gap, no overlap.
 */
function clipToHalfPlane(points, boundaryX, keepGreaterEqual) {
    const keep = keepGreaterEqual ? p => p.x >= boundaryX : p => p.x <= boundaryX;
    const result = [];
    for (let i = 0; i < points.length; i++) {
        const curr = points[i];
        const prev = points[(i - 1 + points.length) % points.length];
        const currIn = keep(curr), prevIn = keep(prev);
        if (currIn !== prevIn) {
            const t = (boundaryX - prev.x) / (curr.x - prev.x);
            result.push({ x: boundaryX, y: prev.y + t * (curr.y - prev.y) });
        }
        if (currIn) result.push(curr);
    }
    return result;
}

/** Pixel-space vertex equality, within float slop — used to find the one vertex two adjacent hexes' vertex lists share. */
function samePoint(a, b) {
    return Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01;
}

/** The vertex of `points` with the smallest (`wantMin: true`) or largest y — a hex's own top peak or bottom trough. */
function extremeVertex(points, wantMin) {
    return points.reduce((best, p) => (!best || (wantMin ? p.y < best.y : p.y > best.y)) ? p : best, null);
}

/** Of the (exactly 2, for two genuinely-adjacent hexes) vertices `a` and `b`'s own vertex lists have in common — their one shared edge's two endpoints — the one with the larger (`preferLarger: true`) or smaller y: pass `false` (smaller y, nearer the peaks) for a top-edge notch, `true` (larger y, nearer the troughs) for a bottom-edge notch, so the returned point stays close to the flat Scene edge instead of the shared edge's *other* endpoint, off toward the hexes' own far side. */
function sharedVertex(a, b, preferLarger) {
    let best = null;
    for (const pa of a) {
        for (const pb of b) {
            if (!samePoint(pa, pb)) continue;
            if (!best || (preferLarger ? pa.y > best.y : pa.y < best.y)) best = pa;
        }
    }
    return best;
}

/**
 * Pixel geometry for one `kind: "column"` filler (see geography-border.mjs's hexBorderFillers):
 * Foundry's raw *virtual* hex one column past the row's real edge (`j: 0` for a left/even-row
 * filler, `j: grid.width` for a right/odd-row filler — deliberately not run through
 * `hexColumnOf`, since these are exactly the raw columns real cells never use), clipped down to
 * just the part that actually falls inside the Scene's own bounds (`scene.width` — already the
 * true measured extent, see `hexPixelExtent`) via `clipToHalfPlane`; the rest of that virtual
 * hex lands off-canvas. Returns `null` for a degenerate (<3-point) clip.
 */
function columnFillerPoints(scene, grid, side, y) {
    const column = side === "left" ? 0 : grid.width;
    const vertices = scene.grid.getVertices({ i: y, j: column });
    const clipped = side === "left"
        ? clipToHalfPlane(vertices, 0, true)
        : clipToHalfPlane(vertices, scene.width, false);
    return clipped.length >= 3 ? clipped : null;
}

/**
 * Pixel geometry for one `kind: "notch"` filler: the small triangular gap between two adjacent
 * same-row cells' peaks (top row) or troughs (bottom row) and the flat Scene edge they only
 * touch at a single point each — bounded by each hex's own extreme vertex plus the one vertex
 * they share (their real shared edge's row-center-ward endpoint), built entirely from the two
 * real cells' own vertex lists (`hexColumnOf`, same as every other real-cell lookup — no
 * virtual row needed). Returns `null` if the two cells don't turn out to share a vertex (not
 * expected for genuinely-adjacent cells, but a small grid could ask for `x + 1 >= grid.width`
 * indirectly through bad data — defensive, not load-bearing).
 */
function notchFillerPoints(scene, grid, edge, x, y) {
    const va = scene.grid.getVertices({ i: y, j: hexColumnOf(x, y) });
    const vb = scene.grid.getVertices({ i: y, j: hexColumnOf(x + 1, y) });
    const wantMin = edge === "top"; // top notch: peaks (min y); bottom: troughs (max y)
    const extremeA = extremeVertex(va, wantMin);
    const extremeB = extremeVertex(vb, wantMin);
    // Two adjacent same-row hexes share a full vertical-ish edge (2 vertices, one nearer each
    // hex's own peak, one nearer its own trough) — the notch only needs the one *nearer the
    // peaks* for a top edge (smaller y: `preferLarger: false`) or *nearer the troughs* for a
    // bottom edge (larger y: `preferLarger: true`). Picking the wrong one of the two (an
    // earlier version passed `wantMin` straight through here) drags the triangle all the way
    // down to the far side of the shared edge — live-tested: it visibly reached into the far
    // half of each hex instead of staying a small gap-sized sliver near the flat Scene edge.
    const shared = sharedVertex(va, vb, !wantMin);
    if (!extremeA || !extremeB || !shared) return null;
    return [extremeA, shared, extremeB];
}

/**
 * One filler Drawing per hex border sliver (see geography-border.mjs's hexBorderFillers for
 * why these slivers exist and what color/opacity each gets — this function only turns that
 * data into real pixel geometry, dispatching on `kind`). Unlabeled (blank `text`), same stroke
 * styling as `paintGrid`'s normal cells so a filler reads as a seamless continuation of its
 * real neighbor(s) rather than its own patch. No-ops on a square Scene (`hexBorderFillers`
 * already returns `[]` for a square grid, so `fillers` is empty) or once a given filler's
 * geometry comes out degenerate, skipped per-filler rather than failing the whole batch.
 */
export async function paintHexBorderFillers(scene, grid, fillers) {
    const drawings = [];
    for (const filler of fillers) {
        const points = filler.kind === "column"
            ? columnFillerPoints(scene, grid, filler.side, filler.y)
            : notchFillerPoints(scene, grid, filler.edge, filler.x, filler.y);
        if (!points) continue;
        const { x, y: sy, width, height, points: shapePoints } = pathToShape(points, p => p);
        drawings.push({
            x, y: sy,
            shape: { type: "p", width, height, points: shapePoints },
            text: "",
            fillType: CONST.DRAWING_FILL_TYPES.SOLID,
            fillColor: filler.fillColor,
            fillAlpha: filler.fillAlpha,
            strokeColor: "#000000",
            strokeWidth: 2,
            strokeAlpha: 0.5,
            flags: { "wfrp4e-borderlands": { feature: "HexBorderFiller" } },
        });
    }
    if (drawings.length === 0) return [];
    return scene.createEmbeddedDocuments("Drawing", drawings);
}

/**
 * Real pixel point for one river path point on a hex Scene. An integer-coordinate point is a
 * real path cell — its true hex center (`getCenterPoint`). A fractional point (a
 * `borderExitPoint`/`swampTouchPoint` extension, each axis offset by up to +-0.5 — see
 * geography-rivers.mjs) is the midpoint between the base cell's real center and the real
 * center of the offset cell one step further in the direction each fractional axis points —
 * using the grid's own real center-to-center spacing rather than assuming square grid-line
 * math, so the drawn line still visibly reaches toward the map edge/Swamp tile even though a
 * hex neighbor's true direction doesn't line up with a square's 8 fixed directions. Each row
 * lookup goes through `hexColumnOf` so this stays on the same Foundry columns every other hex
 * painter uses.
 */
function hexRiverPoint(grid) {
    return p => {
        const baseX = Math.round(p.x), baseY = Math.round(p.y);
        const base = grid.getCenterPoint({ i: baseY, j: hexColumnOf(baseX, baseY) });
        if (p.x === baseX && p.y === baseY) return base;
        const refX = baseX + Math.sign(p.x - baseX), refY = baseY + Math.sign(p.y - baseY);
        const ref = grid.getCenterPoint({ i: refY, j: hexColumnOf(refX, refY) });
        return { x: (base.x + ref.x) / 2, y: (base.y + ref.y) / 2 };
    };
}

/** One freehand polygon Drawing per river path — drawn through each cell's *center* (real hex center on a hex Scene, see `hexRiverPoint`), river.path being a list of (fractional, at a border exit) cell coordinates. */
export async function paintRivers(scene, rivers) {
    const gridSize = scene.grid.size;
    const toPixel = scene.grid.isHexagonal
        ? hexRiverPoint(scene.grid)
        : p => ({ x: p.x * gridSize + gridSize / 2, y: p.y * gridSize + gridSize / 2 });
    const drawings = rivers
        .filter(river => river.path.length > 1)
        .map(river => {
            const { x, y, width, height, points } = pathToShape(river.path, toPixel);
            return {
                x, y,
                shape: { type: "p", width, height, points },
                strokeColor: RIVER_COLOR, strokeWidth: 8, strokeAlpha: RIVER_FILL_ALPHA,
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

/**
 * One freehand polygon Drawing per cliff boundary segment. Square: drawn through each point
 * *as-is* (no cell-centering), since `geography-features.mjs`'s `sharedEdgeCorners` already
 * returns exact grid-line corner coordinates, not cell coordinates. Hex: each point is a
 * `{hexes: [cube, cube, cube]}` topological corner (see `sharedEdgeCorners`'s hex branch) —
 * the real vertex pixel is the average of those (up to 3, possibly off-grid) hexes' true
 * centers (`cubeToPoint`), geometrically exact for a regular hex tiling. `corner.hexes` are
 * pure logical cube coordinates from `geography-features.mjs` (grid-shape-agnostic, unaware of
 * Foundry's raw column layout), so each is round-tripped through offset coordinates to apply
 * `hexColumnOf` before asking the live grid for its point, keeping this on the same Foundry
 * columns every other hex painter uses.
 */
export async function paintCliffs(scene, cliffs) {
    const gridSize = scene.grid.size;
    const toPixel = scene.grid.isHexagonal
        ? corner => {
            const points = corner.hexes.map(cube => {
                const offset = cubeToOffset(cube);
                const shifted = offsetToCube(hexColumnOf(offset.x, offset.y), offset.y);
                return scene.grid.cubeToPoint(shifted);
            });
            return {
                x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
                y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
            };
        }
        : p => ({ x: p.x * gridSize, y: p.y * gridSize });
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
