// Paths Table 1-1 river rolls across the placed terrain grid as a biased random walk from
// high ground toward the nearest Swamp (or the map border) — docs/DECISIONS.md "Geography
// (redesign)". Pure grid math — no Foundry dependency. Rivers never claim grid cells; they're
// a line drawn over the terrain, painted separately by geography-scene.mjs's paintRivers.

import {
    isBorderCell, neighborsOf, cellsOfType, nearestDistance, distanceToBorder, pickRandomCell,
} from "./geography-grid.mjs";
import { ELEVATION_TIER } from "../tables/geography.mjs";

export const RIVER_PREFERENCE = ["Mountains", "Hills", "Swamps", "Badlands", "Plains"];

/** Safety cap on walkFromCellUntilArrived's retries — mirrors the "Ban Large Geography Regions" reroll cap elsewhere in this phase; never realistically hit outside a pathological grid shape. */
const MAX_RIVER_WALK_ATTEMPTS = 20;

function cellKey(x, y) {
    return `${x},${y}`;
}

/** Whether `cell` is on, or diagonally/orthogonally touching, one of `swampCells`. */
function isAtOrAdjacentToSwamp(cell, swampCells) {
    return nearestDistance(cell, swampCells) <= Math.SQRT2 + 1e-9;
}

/** The single closest of `targets` to `cell` (ties go to the first in scan order). */
function nearestOf(cell, targets) {
    let best = targets[0];
    let bestDist = Math.hypot(cell.x - best.x, cell.y - best.y);
    for (const t of targets.slice(1)) {
        const d = Math.hypot(cell.x - t.x, cell.y - t.y);
        if (d < bestDist) { bestDist = d; best = t; }
    }
    return best;
}

/**
 * The point on `swampCell`'s own edge (or corner, for a diagonal approach) nearest `from` —
 * pulls the swamp cell's center back half a cell along each axis the approach came from
 * (fractional coordinate, same convention as `borderExitPoint`), so the drawn river visibly
 * touches the Swamp tile's boundary instead of running all the way through to its center.
 */
function swampTouchPoint(from, swampCell) {
    const dx = Math.sign(swampCell.x - from.x);
    const dy = Math.sign(swampCell.y - from.y);
    return { x: swampCell.x - dx * 0.5, y: swampCell.y - dy * 0.5 };
}

function elevationOf(grid, cell) {
    const terrain = grid.cells.get(cellKey(cell.x, cell.y))?.terrain;
    return ELEVATION_TIER[terrain] ?? 0;
}

/**
 * Canonical key for a diagonal step between two diagonally-adjacent cells: the 2x2 block's
 * top-left corner plus which of the block's two diagonals ("\" top-left-to-bottom-right, or
 * "/" bottom-left-to-top-right) the step follows. Two diagonal steps through the *same* block
 * on *opposite* diagonals visually cross in the middle even though they share no cell —
 * `usedDiagonals` (built from this key) is how `stepCandidates` catches that a plain
 * cell-level `usedCells` check can't.
 */
export function diagonalKey(a, b) {
    const minX = Math.min(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const dir = (a.x - b.x) * (a.y - b.y) > 0 ? "\\" : "/";
    return `${minX},${minY},${dir}`;
}

/** The other diagonal of the same 2x2 block a step between `a`/`b` passes through — the one that would visually cross it. */
function oppositeDiagonalKey(a, b) {
    const minX = Math.min(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const dir = (a.x - b.x) * (a.y - b.y) > 0 ? "/" : "\\";
    return `${minX},${minY},${dir}`;
}

/** Legal next-step candidates from `current`: 8-directional neighbors, minus any already used by a river (this one or an earlier one), minus any that would climb to a higher elevation tier (Plains/Badlands/Swamps < Hills < Mountains — rivers never flow uphill), minus any diagonal step that would visually cross an already-used diagonal through the same 2x2 block (see `diagonalKey`), optionally minus a specific region id (the mandatory step-1 "leave the source region" move). */
function stepCandidates(grid, current, usedCells, usedDiagonals, excludeRegionId = null) {
    let candidates = neighborsOf(grid, current.x, current.y);
    if (excludeRegionId != null) {
        candidates = candidates.filter(n => grid.cells.get(cellKey(n.x, n.y))?.regionId !== excludeRegionId);
    }
    candidates = candidates.filter(n => !usedCells.has(cellKey(n.x, n.y)));
    candidates = candidates.filter(n => elevationOf(grid, n) <= elevationOf(grid, current));
    candidates = candidates.filter(n => {
        if (n.x === current.x || n.y === current.y) return true; // orthogonal step — no crossing block
        return !usedDiagonals.has(oppositeDiagonalKey(current, n));
    });
    return candidates;
}

/**
 * Straight-line pixel-space extension for a river that terminated at the map border: the
 * walk itself stops at a border *cell*, which paints short of the actual edge once drawn
 * through cell centers, so this appends one more path point projected onto whichever edge(s)
 * that cell touches (fractional cell-coordinate, e.g. `x: -0.5` for the left edge) — the
 * same `+ gridSize/2` cell-centering conversion `geography-scene.mjs`'s paintRivers uses for
 * every other point lands this one exactly on the pixel border.
 */
function borderExitPoint(grid, cell) {
    let x = cell.x, y = cell.y;
    if (cell.x === 0) x = -0.5;
    else if (cell.x === grid.width - 1) x = grid.width - 0.5;
    if (cell.y === 0) y = -0.5;
    else if (cell.y === grid.height - 1) y = grid.height - 0.5;
    return { x, y };
}

/**
 * Biased random walk from `source` toward its preferred target (nearest Swamp, unless the
 * river started in a Swamp itself, in which case the preferred target is the map border —
 * same fallback if there are no Swamps at all). Each step weights the 8 neighbor directions
 * that reduce distance to that preferred target 3x more likely than the rest (a judgment
 * call — the brief only said "random, not direct line" — see docs/DECISIONS.md), so the path
 * wanders but trends toward the goal. Never re-enters a cell already used by this river or an
 * earlier one, never takes a diagonal step that would visually cross an already-used diagonal
 * through the same 2x2 block (a river can't slip through the "X" left by an earlier crossing
 * diagonal pair just because it never lands on the same cell — see `diagonalKey`), and never
 * steps uphill (`stepCandidates`) — a step with no legal candidates ends the walk there, same
 * as running out of room, reported back as `arrived: false` (see
 * walkFromCellUntilArrived, which retries a walk that dead-ends like this, including one
 * that's boxed in because every remaining direction would mean crossing itself or another
 * river). Capped at `width + height` steps as a safety net against a pathological grid shape.
 *
 * **The map border is always a valid place to arrive, regardless of the preferred target** —
 * a river biased toward the nearest Swamp that reaches the map edge first just flows off the
 * map there rather than being forced to keep hunting for a Swamp it may never legally reach.
 *
 * The arrival check runs *after* each step is taken, not before — Mountains/Swamps seeds
 * are themselves placed at the map border (docs/DECISIONS.md), so a river's source (or the
 * cell its mandatory "step into an adjacent region" move lands on) is frequently already a
 * border cell; checking for arrival before ever taking a wandering step made those rivers
 * stop dead on the spot instead of actually crossing the map (a live-tested bug). Requiring
 * at least one real step first means the border can only be reached by genuinely walking
 * there. Genuinely arriving appends one more point so the drawn line visibly touches the
 * target, not just stops short at a cell center: a fractional `borderExitPoint` projected
 * onto the map edge for a border arrival (checked first), or a fractional `swampTouchPoint`
 * on the near edge (or corner) of the nearest Swamp cell — not its center — for a Swamp
 * arrival that stopped only *adjacent* to it rather than on it.
 *
 * `usedCells` (a `Set` of `"x,y"` keys, mutated in place) tracks every cell any river has
 * already claimed — shared across a whole `placeRivers` batch so later rivers route around
 * earlier ones, and seeded with `source` so a river can't immediately double back onto itself.
 * `usedDiagonals` (a `Set` of `diagonalKey` strings, mutated in place alongside it) tracks
 * every diagonal step any river has taken — two diagonal steps can pass through the same 2x2
 * block on opposite diagonals without ever sharing a cell, which would otherwise let a river
 * visually cross itself or another river right through the middle of that block.
 *
 * @returns {Promise<{path: {x: number, y: number}[], arrived: boolean}>}
 */
export async function walkFromCell(grid, source, { avoidRegionId = null, startType = null, usedCells = new Set(), usedDiagonals = new Set() } = {}) {
    const path = [source];
    let current = source;
    usedCells.add(cellKey(current.x, current.y));

    if (avoidRegionId != null) {
        const differentRegion = stepCandidates(grid, current, usedCells, usedDiagonals, avoidRegionId);
        if (differentRegion.length > 0) {
            const next = await pickRandomCell(differentRegion);
            if (next.x !== current.x && next.y !== current.y) usedDiagonals.add(diagonalKey(current, next));
            current = next;
            path.push(current);
            usedCells.add(cellKey(current.x, current.y));
        }
    }

    const swampCells = cellsOfType(grid, "Swamps");
    const targetIsSwamp = startType !== "Swamps" && swampCells.length > 0;
    const distanceToTarget = cell => targetIsSwamp ? nearestDistance(cell, swampCells) : distanceToBorder(grid, cell);
    // The map border is always a valid place for a river to end, even one biased toward a
    // Swamp — a river that reaches the map edge before ever reaching a Swamp just flows off
    // the map there, same as any other river, rather than being forced to keep hunting for a
    // Swamp it may never legally reach.
    const hasArrived = cell => isBorderCell(grid, cell.x, cell.y) || (targetIsSwamp && isAtOrAdjacentToSwamp(cell, swampCells));

    const maxSteps = grid.width + grid.height;
    let arrived = false;
    for (let step = 0; step < maxSteps; step++) {
        const candidates = stepCandidates(grid, current, usedCells, usedDiagonals);
        if (candidates.length === 0) break;

        const currentDist = distanceToTarget(current);
        const weighted = [];
        for (const n of candidates) {
            const weight = distanceToTarget(n) < currentDist ? 3 : 1;
            for (let i = 0; i < weight; i++) weighted.push(n);
        }

        const next = await pickRandomCell(weighted);
        if (!next) break;
        if (next.x !== current.x && next.y !== current.y) usedDiagonals.add(diagonalKey(current, next));
        path.push(next);
        current = next;
        usedCells.add(cellKey(current.x, current.y));

        if (hasArrived(current)) { arrived = true; break; }
    }

    if (arrived) {
        if (isBorderCell(grid, current.x, current.y)) {
            path.push(borderExitPoint(grid, current));
        } else {
            const onSwamp = grid.cells.get(cellKey(current.x, current.y))?.terrain === "Swamps";
            if (!onSwamp) path.push(swampTouchPoint(current, nearestOf(current, swampCells)));
        }
    }

    return { path, arrived };
}

/**
 * Retries walkFromCell from the same `source` (only its internal random walk differs between
 * attempts — the source itself is picked once, outside this loop) until it genuinely reaches
 * its target, up to `MAX_RIVER_WALK_ATTEMPTS` times — a river that dead-ends partway (boxed
 * in by elevation/crossing constraints, or hitting the step cap) doesn't read as a real
 * river, so the whole attempt is discarded and re-walked rather than kept short. Each
 * attempt gets its own scratch copy of `usedCells`/`usedDiagonals` so a failed attempt's
 * claims don't permanently block later rivers; only a successful attempt's claims are
 * committed back into the caller's Sets. Falls back to the last (unfinished) attempt if every
 * retry fails, rather than producing nothing.
 */
export async function walkFromCellUntilArrived(grid, source, options = {}) {
    let lastPath = [source];
    for (let attempt = 0; attempt < MAX_RIVER_WALK_ATTEMPTS; attempt++) {
        const attemptUsedCells = new Set(options.usedCells ?? []);
        const attemptUsedDiagonals = new Set(options.usedDiagonals ?? []);
        const { path, arrived } = await walkFromCell(grid, source, {
            ...options, usedCells: attemptUsedCells, usedDiagonals: attemptUsedDiagonals,
        });
        lastPath = path;
        if (arrived) {
            if (options.usedCells) for (const key of attemptUsedCells) options.usedCells.add(key);
            if (options.usedDiagonals) for (const key of attemptUsedDiagonals) options.usedDiagonals.add(key);
            return path;
        }
    }
    return lastPath;
}

/** Euclidean distance from `cell` to the grid's own center point. */
function distanceToCenter(grid, cell) {
    return Math.hypot(cell.x - (grid.width - 1) / 2, cell.y - (grid.height - 1) / 2);
}

/**
 * Deterministically picks a river's source cell within `regionCells`: never a map-edge cell
 * when a non-edge one exists, and among those, whichever is closest to the map's center
 * (ties go to the first candidate in scan order) — mirrors `geography-terrain.mjs`'s
 * Mountains-farthest-from-Swamp deterministic pick, a documented judgment call (the brief
 * said "prefer," not an exact mechanic). Falls back to the region's own border cells only
 * if it has no interior cells at all.
 */
function pickSourceCell(grid, regionCells) {
    const nonBorder = regionCells.filter(c => !isBorderCell(grid, c.x, c.y));
    const pool = nonBorder.length > 0 ? nonBorder : regionCells;
    let best = pool[0];
    let bestDist = distanceToCenter(grid, best);
    for (const c of pool.slice(1)) {
        const d = distanceToCenter(grid, c);
        if (d < bestDist) { bestDist = d; best = c; }
    }
    return best;
}

/** A single river's full path: source cell within `startRegion` (see pickSourceCell), then walkFromCellUntilArrived to its target. */
export async function walkRiverPath(grid, startRegion, usedCells = new Set(), usedDiagonals = new Set()) {
    if (startRegion.cells.length === 0) return { path: [] };
    const source = pickSourceCell(grid, startRegion.cells);
    const path = await walkFromCellUntilArrived(grid, source, {
        avoidRegionId: startRegion.id, startType: startRegion.type, usedCells, usedDiagonals,
    });
    return { path };
}

/**
 * Picks a river's starting region: preference order Mountains > Hills > Swamps > Badlands >
 * Plains, uniformly random among same-preference candidates, skipping any region id in
 * `usedRegionIds`. Falls through to the next preference tier if the current one is
 * exhausted; if every region has already been used (more river rolls than regions), falls
 * back to allowing reuse.
 */
export async function pickStartRegion(regions, usedRegionIds) {
    for (const type of RIVER_PREFERENCE) {
        const candidates = regions.filter(r => r.type === type && r.cells.length > 0 && !usedRegionIds.has(r.id));
        const picked = await pickRandomCell(candidates);
        if (picked) return picked;
    }
    for (const type of RIVER_PREFERENCE) {
        const candidates = regions.filter(r => r.type === type && r.cells.length > 0);
        const picked = await pickRandomCell(candidates);
        if (picked) return picked;
    }
    return pickRandomCell(regions.filter(r => r.cells.length > 0));
}

/**
 * Places every rolled river (in roll order), each starting in a different placed region
 * than any earlier river (per-preference-tier, see pickStartRegion), and routed around every
 * cell (and diagonal crossing) any earlier river in this batch already used (see
 * walkFromCell's `usedCells`/`usedDiagonals`).
 * **Guarantees at least one river** even if `riverRolls` came up empty (no River results on
 * Table 1-1 this generation) — a map with zero rivers reads as a generation gap, not a
 * legitimate outcome, so one extra river is force-started the normal way if the loop above
 * placed none and at least one region exists to start it in. Returns `{ rivers }`.
 */
export async function placeRivers(riverRolls, grid, regions) {
    const rivers = [];
    const usedRegionIds = new Set();
    const usedCells = new Set();
    const usedDiagonals = new Set();

    for (const _roll of riverRolls) {
        const region = await pickStartRegion(regions, usedRegionIds);
        if (!region) continue; // no placed regions at all — pathological/tiny map
        usedRegionIds.add(region.id);
        const { path } = await walkRiverPath(grid, region, usedCells, usedDiagonals);
        rivers.push({ id: rivers.length + 1, startRegionId: region.id, path });
    }

    if (rivers.length === 0) {
        const region = await pickStartRegion(regions, usedRegionIds);
        if (region) {
            usedRegionIds.add(region.id);
            const { path } = await walkRiverPath(grid, region, usedCells, usedDiagonals);
            rivers.push({ id: rivers.length + 1, startRegionId: region.id, path });
        }
    }
    return { rivers };
}
