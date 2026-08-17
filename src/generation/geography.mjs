// SPECS.md "GEOGRAPHY PROCESS" — Table 1-1 (Geography, PDF p.9) and Table 1-2 (Special
// Features, PDF p.10). Loop: roll 1d100 + running bonus -> terrain/river or (>100) a Table
// 1-2 special feature -> +10 running bonus, except a special feature resets it to 0.
//
// Redesigned (docs/DECISIONS.md "Geography (redesign)") to run as a single batch: every
// roll happens up front (rollGeographyBatch), then the whole set is placed onto a grid at
// once (geography-terrain.mjs/geography-rivers.mjs/geography-features.mjs) so later
// placement rules (Hills hugging Mountains, rivers seeking Swamps, ...) can see terrain that
// hasn't been rolled yet in dice order. generateGeography is the one-shot orchestrator
// (region.mjs's runPhase), same shape as every other phase now.

import { GEOGRAPHY_TABLE, SPECIAL_FEATURES_TABLE } from "../tables/geography.mjs";
import { placeTerrainRolls } from "./geography-terrain.mjs";
import { placeRivers } from "./geography-rivers.mjs";
import { placeIsolatedMountains, placeSpecialFeatures } from "./geography-features.mjs";
import { createGeographyScene, paintGrid, paintRivers, paintCliffs } from "./geography-scene.mjs";
import { createGeographyJournal } from "./geography-journal.mjs";
import { postGeographySummary } from "./geography-chat.mjs";
import { MODULE_ID, SETTINGS } from "../settings.mjs";

/**
 * "Ban Large Geography Regions" setting: on a map under 500 squares, Table 1-1 results of
 * 81-99 (the "1d10 * 20" and "1d10 * 50" size-tier rows) are rerolled entirely — not just
 * capped — since even the smaller of those two tiers can swallow a small map on its own; on
 * 500+ square maps only 91-99 (the "1d10 * 50" tier) is banned. The reroll is a fresh 1d100
 * against the same running bonus, "without increasing the modifier" — a discarded attempt
 * never counts as a step. Capped at 20 attempts as a safety net (mirrors Greenskin's 10-try
 * reroll cap in generation/hazards.mjs) — never realistically hit, since even the narrower
 * 91-99 ban is only a 9% chance per roll.
 */
function isBannedTotal(total, mapSquares) {
    if (total > 100) return false; // Special Features (Table 1-2) are unaffected
    const bannedFrom = mapSquares < 500 ? 81 : 91;
    return total >= bannedFrom && total <= 99;
}

/**
 * Rolls one step of Table 1-1. A total over 100 delegates to rollSpecialFeature (Table 1-2)
 * instead of indexing past the table.
 * @param {number} [runningBonus]
 * @param {{banLargeRegions?: boolean, mapSquares?: number}} [options]
 * @returns {Promise<{roll: number, bonus: number, total: number} & ({type: "river"} | {type: "terrain", terrain: string, vegetation: string|null, size: number} | object)>}
 */
export async function rollGeographyStep(runningBonus = 0, { banLargeRegions = false, mapSquares = Infinity } = {}) {
    let roll, total;
    for (let attempt = 0; attempt < 20; attempt++) {
        roll = await new Roll("1d100").evaluate();
        total = roll.total + runningBonus;
        if (!banLargeRegions || !isBannedTotal(total, mapSquares)) break;
    }

    if (total > 100) {
        const special = await rollSpecialFeature();
        return { roll: roll.total, bonus: runningBonus, total, ...special };
    }

    const entry = GEOGRAPHY_TABLE[total];
    if (entry.type === "river") {
        return { roll: roll.total, bonus: runningBonus, total, type: "river" };
    }

    const sizeRoll = await new Roll(entry.sizeFormula).evaluate();
    return {
        roll: roll.total, bonus: runningBonus, total,
        type: "terrain", terrain: entry.terrain, vegetation: entry.vegetation, size: sizeRoll.total,
    };
}

/**
 * Rolls Table 1-2: Special Features (1d10). Only Caves and Cliff have a size to roll —
 * but Cliff's roll is the escarpment's *height*, not a square count (see `placement` on
 * SPECIAL_FEATURES_TABLE): callers must check `placement` before treating `size` as a
 * number of grid cells to claim.
 */
export async function rollSpecialFeature() {
    const roll = await new Roll("1d10").evaluate();
    const entry = SPECIAL_FEATURES_TABLE[roll.total];
    const size = entry.sizeFormula ? (await new Roll(entry.sizeFormula).evaluate()).total : null;
    return {
        type: "special", feature: entry.feature, placement: entry.placement, size,
        sizeUnit: entry.sizeUnit ?? "squares", description: entry.description,
    };
}

/**
 * Rolls the entire Table 1-1/1-2 sequence up front, before any placement happens. Stops
 * once the cumulative `size` of terrain rolls alone meets or exceeds the map's capacity —
 * Special Feature rolls are excluded from this budget entirely, since every one of them
 * lands on top of already-placed terrain rather than needing its own dedicated space (a
 * locked-in decision; see PLAN.md's Geography redesign). `maxRolls` is a hard safety cap,
 * never realistically hit.
 */
export async function rollGeographyBatch({ width, height, banLargeRegions = false, maxRolls = 1000 } = {}) {
    const mapSquares = width * height;
    const log = [];
    let runningBonus = 0;
    let terrainSquares = 0;

    for (let i = 0; i < maxRolls; i++) {
        const result = await rollGeographyStep(runningBonus, { banLargeRegions, mapSquares });
        log.push(result);
        if (result.type === "terrain") terrainSquares += result.size;
        runningBonus = result.type === "special" ? 0 : runningBonus + 10;
        if (terrainSquares >= mapSquares) break;
    }

    return { log };
}

/**
 * One-shot Geography orchestrator: rolls the full sequence, places it onto a grid (terrain
 * blobs, then Isolated Mountain — ahead of rivers, so it's honored as high ground rivers
 * can't flow uphill onto — then rivers, then every other special feature overwriting on top),
 * paints the result onto a Scene (with Global Illumination on), and files the journal/chat
 * summary. Re-running this on a region that already has a Geography scene reuses it
 * (geography-scene.mjs clears its Drawings first) instead of creating a second one.
 * @param {ReturnType<typeof import("./region.mjs").createRegion>} region
 * @returns {Promise<{ geography: object }>}
 */
export async function generateGeography(region) {
    const { width, height } = region.geography.mapSize;
    const banLargeRegions = game.settings.get(MODULE_ID, SETTINGS.banLargeRegions);
    // Read from the setting only on this region's first Geography run (no scene yet) — a
    // re-run reuses whatever gridShape that first run stored, even if the world setting
    // changes later, same as mapSize already behaves. `createRegion`'s own "square" default is
    // just an unset placeholder, not a prior run's real choice.
    const gridShape = region.geography.sceneId
        ? region.geography.gridShape
        : game.settings.get(MODULE_ID, SETTINGS.defaultGridShape);

    const { log } = await rollGeographyBatch({ width, height, banLargeRegions });
    const terrainRolls = log.filter(entry => entry.type === "terrain");
    const riverRolls = log.filter(entry => entry.type === "river");
    const specialRolls = log.filter(entry => entry.type === "special");

    const { grid, regions } = await placeTerrainRolls(terrainRolls, { width, height, type: gridShape });
    await placeIsolatedMountains(specialRolls, grid);
    const { rivers } = await placeRivers(riverRolls, grid, regions);
    const remainingSpecialRolls = specialRolls.filter(roll => roll.feature !== "Isolated Mountain");
    const { cliffs } = await placeSpecialFeatures(remainingSpecialRolls, grid, regions, rivers);

    const scene = await createGeographyScene(region, { width, height, gridShape });
    await paintGrid(scene, grid);
    await paintRivers(scene, rivers);
    await paintCliffs(scene, cliffs);

    const journal = await createGeographyJournal(region, log, { regions, rivers, cliffs });
    await postGeographySummary(region, log, regions, rivers, cliffs);

    return { geography: { ...region.geography, gridShape, sceneId: scene.id, journalId: journal.id, log } };
}
