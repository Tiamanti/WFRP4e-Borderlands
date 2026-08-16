// SPECS.md "ANCIENT RUINS PROCESS" — Tables 1-3 through 1-8 (PDF pages 12-19). Unlike
// Geography, this process has no "map full, stop" condition needing a per-step GM
// decision, so it runs as a single batch through the generic runPhase() flow in
// region.mjs instead of its own interactive roller — see PLAN.md's Ancient Ruins design.

import {
    RUIN_COUNT_TABLE, RUIN_TYPE_TABLE, ANCIENT_MENACES_TABLE, ORIGINAL_PURPOSE_TABLE,
    REASON_FOR_RUINS_TABLE, AGE_OF_RUINS_TABLE, lookupBand,
} from "../tables/ruins.mjs";
import { createRuinsJournal, placeRuinNotes } from "./ruins-scene.mjs";
import { postRuinsSummary } from "./ruins-chat.mjs";

function cellKey(cell) {
    return `${cell.x},${cell.y}`;
}

/**
 * Table 1-7 has no column for "Oddity" ruins. Per the book's own suggestion for ruins of
 * "ambiguous... mysterious origin," Oddity rolls twice on two independently-chosen random
 * columns and records both purposes; every other type just rolls its own column once.
 * Always returns an array (length 1, except length 2 for Oddity) so callers don't need
 * type-specific branching.
 */
export async function rollOriginalPurpose(type) {
    const table = ORIGINAL_PURPOSE_TABLE[type];
    if (table) {
        const roll = await new Roll("1d100").evaluate();
        return [lookupBand(table, roll.total).purpose];
    }

    const columns = Object.keys(ORIGINAL_PURPOSE_TABLE);
    const purposes = [];
    for (let i = 0; i < 2; i++) {
        const columnRoll = await new Roll(`1d${columns.length}`).evaluate();
        const column = ORIGINAL_PURPOSE_TABLE[columns[columnRoll.total - 1]];
        const purposeRoll = await new Roll("1d100").evaluate();
        purposes.push(lookupBand(column, purposeRoll.total).purpose);
    }
    return purposes;
}

/**
 * Table 1-6 (Age of Ruins) is explicitly not a random table in the book ("you should
 * choose the precise age of your ruins... to create a viable history"). This still rolls
 * a suggested age — uniformly picks one of the ruin type's valid periods, then a specific
 * year within it — but every ruin's journal page frames it as a suggestion the GM can
 * freely overwrite, not a final answer.
 */
export async function rollSuggestedAge(type) {
    const validPeriods = AGE_OF_RUINS_TABLE.filter(band => band.validTypes.includes(type));
    const periodRoll = await new Roll(`1d${validPeriods.length}`).evaluate();
    const period = validPeriods[periodRoll.total - 1];

    const range = period.yearsAgoMax - period.yearsAgoMin + 1;
    const yearRoll = await new Roll(`${period.yearsAgoMin} + 1d${range} - 1`).evaluate();
    return { period: period.period, yearsAgo: yearRoll.total };
}

/**
 * Per the book's own Location guidance ("if you still have a free choice... scatter them
 * across the map"), each ruin lands on a uniformly random cell, deduplicated against
 * `usedCells`. Falls back to a linear scan if random attempts keep colliding (only
 * realistic for pathologically small `mapSize` values, e.g. in tests).
 */
export async function pickRandomCell(mapSize, usedCells) {
    for (let attempt = 0; attempt < 20; attempt++) {
        const xRoll = await new Roll(`1d${mapSize.width}`).evaluate();
        const yRoll = await new Roll(`1d${mapSize.height}`).evaluate();
        const cell = { x: xRoll.total - 1, y: yRoll.total - 1 };
        if (!usedCells.has(cellKey(cell))) return cell;
    }

    for (let y = 0; y < mapSize.height; y++) {
        for (let x = 0; x < mapSize.width; x++) {
            if (!usedCells.has(cellKey({ x, y }))) return { x, y };
        }
    }
    throw new Error("No unused cell available for ruin placement.");
}

/** Rolls Table 1-3 for a count, then Tables 1-4/1-5/1-7/1-8 and a suggested age for each ruin. */
export async function rollAncientRuins(region) {
    const countRoll = await new Roll("1d100").evaluate();
    const count = lookupBand(RUIN_COUNT_TABLE, countRoll.total).count;

    const usedCells = new Set(region.ruins.entries.map(ruin => cellKey(ruin.cell)));
    const ruins = [];
    for (let i = 0; i < count; i++) {
        const type = lookupBand(RUIN_TYPE_TABLE, (await new Roll("1d100").evaluate()).total).type;
        const menace = lookupBand(ANCIENT_MENACES_TABLE[type], (await new Roll("1d100").evaluate()).total).menace;
        const purpose = await rollOriginalPurpose(type);
        const reason = REASON_FOR_RUINS_TABLE[(await new Roll("1d10").evaluate()).total].reason;
        const age = await rollSuggestedAge(type);
        const cell = await pickRandomCell(region.geography.mapSize, usedCells);
        usedCells.add(cellKey(cell));
        ruins.push({ type, menace, purpose, reason, age, cell });
    }
    return ruins;
}

/**
 * @param {ReturnType<typeof import("./region.mjs").createRegion>} region
 * @returns {Promise<{ ruins: { journalId: string, entries: object[] } }>}
 */
export async function generateAncientRuins(region) {
    if (!region.geography.sceneId) {
        throw new Error("Run the Geography phase first — Ancient Ruins are placed onto the Geography scene.");
    }

    const newRuins = await rollAncientRuins(region);
    const scene = game.scenes.get(region.geography.sceneId);
    const { journal, pages } = await createRuinsJournal(region, newRuins);
    await placeRuinNotes(scene, journal, newRuins, pages);
    await postRuinsSummary(region, newRuins, region.ruins.entries.length);

    return { ruins: { journalId: journal.id, entries: [...region.ruins.entries, ...newRuins] } };
}
