// SPECS.md "GEOGRAPHY PROCESS" — Table 1-1 (Geography, PDF p.9) and Table 1-2 (Special Features, PDF p.10).
// Loop: roll 1d100 + running bonus -> terrain/river or (>100) a Table 1-2 special feature
// -> +10 running bonus, except a special feature resets it to 0.
//
// These are pure roll functions only — placement onto the Scene and running-bonus/grid-full
// bookkeeping are owned by apps/geography-roller.mjs (PLAN.md §2, §5).

import { GEOGRAPHY_TABLE, SPECIAL_FEATURES_TABLE } from "../tables/geography.mjs";

/**
 * Rolls one step of Table 1-1. A total over 100 delegates to rollSpecialFeature (Table 1-2)
 * instead of indexing past the table.
 * @returns {Promise<{roll: number, bonus: number, total: number} & ({type: "river"} | {type: "terrain", terrain: string, vegetation: string|null, size: number} | object)>}
 */
export async function rollGeographyStep(runningBonus = 0) {
    const roll = await new Roll("1d100").evaluate();
    const total = roll.total + runningBonus;

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

/** Rolls Table 1-2: Special Features (1d10). Only Caves and Cliff have a size to roll. */
export async function rollSpecialFeature() {
    const roll = await new Roll("1d10").evaluate();
    const entry = SPECIAL_FEATURES_TABLE[roll.total];
    const size = entry.sizeFormula ? (await new Roll(entry.sizeFormula).evaluate()).total : null;
    return {
        type: "special", feature: entry.feature, size,
        sizeUnit: entry.sizeUnit ?? "squares", description: entry.description,
    };
}

/**
 * Geography is an interactive, Scene-painting loop (apps/geography-roller.mjs), not a
 * single roll-and-return phase like the others, so it can't be driven by the generic
 * runPhase() in region.mjs. Kept here only so region.mjs's phase registry has a `run` to
 * reference — open GeographyRoller from the wizard instead of calling this directly.
 */
export async function generateGeography() {
    throw new Error("Geography is driven by the Geography Roller dialog (open it from the wizard's Geography row), not runPhase.");
}
