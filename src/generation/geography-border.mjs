// The Scene Geography paints onto is always a plain rectangle, but a hex grid's cells aren't —
// pointy-top hexes tiled into offset rows leave two distinct kinds of blank, currently-undrawn
// slivers at the Scene's own boundary (live-tested and confirmed to be the actual "jagged
// edge" defect — an earlier guess that recolored/unlabeled the full border *cells* themselves
// turned out to be a no-op; the real gaps are these never-painted slivers, see
// docs/DECISIONS.md):
//
// - **Column slivers**, left/right: Foundry's raw HEXODDR layout offsets every even logical
//   row (0, 2, 4, ...) one column right of odd rows to fit at all (see geography-scene.mjs's
//   hexColumnOf), leaving Foundry's raw column 0 entirely unpainted on every even row (a
//   left-edge sliver) and, symmetrically, raw column `grid.width` unpainted on every odd row
//   (a right-edge sliver — even rows' extra column is what sets the Scene's true right edge,
//   see hexPixelExtent, so odd rows fall half a hex short of it).
// - **Notch slivers**, top/bottom: a pointy-top hex's own peak (or, upside-down, its trough)
//   only touches the Scene's flat top (or bottom) edge at a single point — between every
//   adjacent same-row pair of cells on row 0 (or the last row), the two hexes' peaks touch the
//   flat edge but the two hexes only actually meet each other lower down, at their shared
//   vertex, leaving a small triangular gap between the flat edge and that shared vertex.
//
// This module only decides which slivers exist and what color/opacity each should be —
// majority of its real bordering cell(s)' terrain (a column sliver always has exactly one, a
// notch sliver always exactly two — ties broken randomly), with that same cell's own
// vegetation-based opacity (matching paintGrid's per-cell fillAlpha), or the river's own
// color/opacity if a bordering cell is where a river genuinely exits the map. The actual pixel
// geometry/clipping needed to paint them lives in geography-scene.mjs (it needs the live
// `scene.grid`). Pure grid math — no Foundry dependency.

import { neighborsOfCube, offsetToCube, cubeToOffset, pickRandomCell } from "./geography-grid.mjs";
import { FEATURE_COLORS, VEGETATION_OPACITY, DEFAULT_VEGETATION_OPACITY, RIVER_COLOR, RIVER_FILL_ALPHA } from "../tables/geography.mjs";

function cellKey(x, y) {
    return `${x},${y}`;
}

/** A river's real grid cells only — mirrors geography-features.mjs's identically-named helper; the trailing fractional border-touch point (see geography-rivers.mjs's borderExitPoint) isn't a real cell. */
function realPathCells(path) {
    return path.filter(c => Number.isInteger(c.x) && Number.isInteger(c.y));
}

/** Every real grid cell any river's walk genuinely ended at (see walkFromCell's arrival check — reaching the border always ends the walk right there, so a river only ever *stops* at a border cell, never passes through one mid-walk). A river can exit through any of the 4 map edges, not just left/right, so this feeds both column and notch fillers. */
function riverExitCells(rivers) {
    const exits = new Set();
    for (const river of rivers) {
        const cells = realPathCells(river.path);
        const last = cells[cells.length - 1];
        if (last) exits.add(cellKey(last.x, last.y));
    }
    return exits;
}

/**
 * The real (in-grid-bounds) neighbors of a possibly off-grid logical `{x, y}` — same 6 cube
 * directions as geography-grid.mjs's neighborsOf, just seeded from a coordinate that can sit
 * outside the grid (the offset<->cube conversion needs no bounds check to stay correct) and
 * filtered to real cells afterward. For every column sliver this module asks about, this comes
 * out to exactly one real neighbor — the row's own bordering cell — since a hex's other 5
 * directions all land either further off-grid or on a row whose own real column already sits
 * flush at that edge (nothing to fill from that row's side).
 */
function realNeighborsOfOffCell(grid, x, y) {
    const cube = offsetToCube(x, y);
    return neighborsOfCube(cube)
        .map(cubeToOffset)
        .filter(n => n.x >= 0 && n.x < grid.width && n.y >= 0 && n.y < grid.height);
}

/**
 * The claimed cell (full `{terrain, vegetation, ...}` data, not just its coordinate) shared by
 * the most of `cells` (ties broken randomly among just the tied terrains, then the first
 * same-terrain cell in scan order stands in for opacity — a cosmetic pick among cells that
 * already agree on `fillColor`). Null if none of `cells` are claimed.
 */
async function pickMajorityCell(cells) {
    const groups = new Map();
    for (const cell of cells) {
        if (!cell?.terrain) continue;
        if (!groups.has(cell.terrain)) groups.set(cell.terrain, []);
        groups.get(cell.terrain).push(cell);
    }
    if (groups.size === 0) return null;

    const best = Math.max(...[...groups.values()].map(g => g.length));
    const tiedTerrains = [...groups.keys()].filter(t => groups.get(t).length === best);
    const winningTerrain = tiedTerrains.length === 1 ? tiedTerrains[0] : await pickRandomCell(tiedTerrains);
    return groups.get(winningTerrain)[0];
}

/** `{ fillColor, fillAlpha }` for a claimed cell, matching paintGrid's own per-cell color/opacity lookup exactly. */
function paintOf(cell) {
    return {
        fillColor: FEATURE_COLORS[cell.terrain] ?? "#777777",
        fillAlpha: VEGETATION_OPACITY[cell.vegetation] ?? DEFAULT_VEGETATION_OPACITY,
    };
}

const RIVER_PAINT = { fillColor: RIVER_COLOR, fillAlpha: RIVER_FILL_ALPHA };

/**
 * One filler descriptor per row's blank column sliver: `{ kind: "column", side: "left", y,
 * fillColor, fillAlpha }` for every even row (the sliver at Foundry's raw column 0),
 * `{ kind: "column", side: "right", y, ... }` for every odd row (the sliver at raw column
 * `grid.width` — see the file header). Colored from its one real bordering cell
 * (`{x: 0, y}` / `{x: grid.width - 1, y}`) — the river color if that cell is a genuine river
 * exit, otherwise the cell's own terrain color/opacity.
 */
async function columnFillers(grid, exits) {
    const fillers = [];
    for (let y = 0; y < grid.height; y++) {
        const even = y % 2 === 0;
        const side = even ? "left" : "right";
        const borderX = even ? 0 : grid.width - 1;
        const virtualX = even ? -1 : grid.width;

        if (exits.has(cellKey(borderX, y))) {
            fillers.push({ kind: "column", side, y, ...RIVER_PAINT });
            continue;
        }
        const neighborCells = realNeighborsOfOffCell(grid, virtualX, y)
            .map(n => grid.cells.get(cellKey(n.x, n.y)))
            .filter(Boolean);
        const winner = await pickMajorityCell(neighborCells);
        if (winner) fillers.push({ kind: "column", side, y, ...paintOf(winner) });
    }
    return fillers;
}

/**
 * One filler descriptor per adjacent same-row cell pair's blank top/bottom notch:
 * `{ kind: "notch", edge: "top"|"bottom", x, y, fillColor, fillAlpha }` — `x`/`y` identify the
 * *left* cell of the pair (`{x, y}`/`{x + 1, y}`, both real). Colored from those two bordering
 * cells' majority terrain (ties, when they differ, broken randomly — the "randomly if there
 * are only 2 different ones" case this module's whole color rule was built around), or the
 * river color if either cell is a genuine river exit. Only the top row (`y = 0`) and the last
 * row (`y = grid.height - 1`) get notches — a 1-row-tall grid gets only one set, not two.
 */
async function notchFillers(grid, exits) {
    const fillers = [];
    const rows = grid.height > 1 ? [["top", 0], ["bottom", grid.height - 1]] : [["top", 0]];
    for (const [edge, y] of rows) {
        for (let x = 0; x < grid.width - 1; x++) {
            const a = grid.cells.get(cellKey(x, y));
            const b = grid.cells.get(cellKey(x + 1, y));

            if (exits.has(cellKey(x, y)) || exits.has(cellKey(x + 1, y))) {
                fillers.push({ kind: "notch", edge, x, y, ...RIVER_PAINT });
                continue;
            }
            const winner = await pickMajorityCell([a, b].filter(Boolean));
            if (winner) fillers.push({ kind: "notch", edge, x, y, ...paintOf(winner) });
        }
    }
    return fillers;
}

/**
 * Every hex border filler needed to visually square off the Scene's boundary — column slivers
 * (left/right) plus notch slivers (top/bottom), see the file header for what each covers.
 * Returns `[]` entirely for a square grid — its Scene border is already flush, nothing to fill.
 */
export async function hexBorderFillers(grid, rivers) {
    if (grid.type !== "hex") return [];
    const exits = riverExitCells(rivers);
    // Sequential, not Promise.all, so the two passes' Roll calls (tie-break dice) stay in a
    // single deterministic order — matters for tests, harmless for real play.
    const columns = await columnFillers(grid, exits);
    const notches = await notchFillers(grid, exits);
    return [...columns, ...notches];
}
