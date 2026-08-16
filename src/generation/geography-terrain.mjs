// Places Table 1-1 terrain rolls onto the grid as clustered blobs, seeded per-type
// (docs/DECISIONS.md "Geography (redesign)"). Pure grid math — no Foundry dependency.
//
// Placement order is fixed regardless of roll order: Swamps -> Mountains -> Hills ->
// Badlands/Plains (interleaved in original roll order) — later types' seed rules depend on
// earlier types already being on the grid (Hills need to know where Mountains ended up).

import {
    createPlacementGrid, freeCells, freeBorderCells, isBorderCell, cellsOfType,
    cellsAdjacentTo, nearestDistance, pickRandomCell, claimBlobFromSeed,
} from "./geography-grid.mjs";

function orFallback(list, fallback) {
    return list.length > 0 ? list : fallback;
}

/** Deterministic "which candidate maximizes its min-distance to targets" pick — not random, so no Roll call; ties go to the first candidate in scan order. */
function farthestFrom(candidates, targets) {
    if (candidates.length === 0 || targets.length === 0) return null;
    let best = candidates[0];
    let bestDist = nearestDistance(best, targets);
    for (const c of candidates.slice(1)) {
        const d = nearestDistance(c, targets);
        if (d > bestDist) { bestDist = d; best = c; }
    }
    return best;
}

/**
 * Swamp #1 seeds from a random free border cell. Swamp #2+: 80% chance to seed from a free
 * border cell adjacent to the *immediately preceding* Swamp's cells; on the 20% roll, or if
 * no such adjacent-border cell exists, falls back to a plain random free border cell (or a
 * random free cell anywhere, if the map has run out of free border cells entirely).
 */
async function seedForSwamp(grid, previousSwampRegion) {
    if (!previousSwampRegion) {
        return pickRandomCell(orFallback(freeBorderCells(grid), freeCells(grid)));
    }

    const roll = await new Roll("1d100").evaluate();
    if (roll.total <= 80) {
        const adjacentBorder = cellsAdjacentTo(grid, previousSwampRegion.cells)
            .filter(c => isBorderCell(grid, c.x, c.y));
        if (adjacentBorder.length > 0) return pickRandomCell(adjacentBorder);
    }
    return pickRandomCell(orFallback(freeBorderCells(grid), freeCells(grid)));
}

/**
 * Mountains #1 seeds from the free border cell that maximizes its minimum distance to any
 * Swamp cell (skipped entirely, falling back to a random free border cell, if no Swamps
 * were placed). Mountains #2+ seed from a random free cell anywhere, no border constraint.
 */
async function seedForMountains(grid, index, swampRegions) {
    if (index > 0) return pickRandomCell(freeCells(grid));

    const border = freeBorderCells(grid);
    if (border.length === 0) return pickRandomCell(freeCells(grid));

    const swampCells = swampRegions.flatMap(r => r.cells);
    return farthestFrom(border, swampCells) ?? (await pickRandomCell(border));
}

/** Every Hills roll seeds from a random free cell adjacent to Mountains, or a random free cell anywhere if there are none (or none are free). */
async function seedForHills(grid) {
    const mountainCells = cellsOfType(grid, "Mountains");
    const adjacent = cellsAdjacentTo(grid, mountainCells);
    return pickRandomCell(orFallback(adjacent, freeCells(grid)));
}

function placeRegion(grid, regions, id, roll, seed) {
    const cells = seed ? claimBlobFromSeed(grid, seed, roll.size, {
        kind: "terrain", terrain: roll.terrain, vegetation: roll.vegetation, regionId: id,
    }) : [];
    const region = { id, type: roll.terrain, vegetation: roll.vegetation, cells };
    regions.push(region);
    return region;
}

/**
 * Places every terrain roll (Table 1-1 rows, not rivers/specials) onto a fresh grid.
 * Because rollGeographyBatch only stops once cumulative terrain `size` meets map capacity,
 * and every rolled blob gets placed here (none skipped), the grid ends up fully covered —
 * no separate "fill gaps" pass is needed. Returns `{ grid, regions }`.
 */
export async function placeTerrainRolls(terrainRolls, mapSize) {
    const grid = createPlacementGrid(mapSize.width, mapSize.height);
    const regions = [];
    let nextId = 1;

    const swampRolls = terrainRolls.filter(r => r.terrain === "Swamps");
    let previousSwampRegion = null;
    for (const roll of swampRolls) {
        const seed = await seedForSwamp(grid, previousSwampRegion);
        previousSwampRegion = placeRegion(grid, regions, nextId++, roll, seed);
    }

    const mountainRolls = terrainRolls.filter(r => r.terrain === "Mountains");
    const swampRegions = regions.filter(r => r.type === "Swamps");
    for (let i = 0; i < mountainRolls.length; i++) {
        const seed = await seedForMountains(grid, i, swampRegions);
        placeRegion(grid, regions, nextId++, mountainRolls[i], seed);
    }

    const hillsRolls = terrainRolls.filter(r => r.terrain === "Hills");
    for (const roll of hillsRolls) {
        const seed = await seedForHills(grid);
        placeRegion(grid, regions, nextId++, roll, seed);
    }

    const badlandsPlainsRolls = terrainRolls.filter(r => r.terrain === "Badlands" || r.terrain === "Plains");
    for (const roll of badlandsPlainsRolls) {
        const seed = await pickRandomCell(freeCells(grid));
        placeRegion(grid, regions, nextId++, roll, seed);
    }

    return { grid, regions };
}
