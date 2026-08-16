// SPECS.md "HAZARDS SUMMARY" — Tables 4-1 through 4-12 (Renegade Crowns, PDF pages 58-65).
// Table 4-1's lair count is GM-chosen (Few/Moderate/Many), not random — the wizard prompts
// for that via apps/lair-style-dialog.mjs *before* calling runPhase("hazards", style), the
// same way Geography opens its own interactive step instead of the generic one-shot flow.
// See PLAN.md's "Hazards phase design" section for the full process this mirrors.

import { lookupBand } from "../tables/ruins.mjs";
import {
    NUMBER_OF_LAIRS_TABLE, MONSTER_TYPE_TABLE, CHAOS_CREATURE_COUNT_TABLE, CHAOS_LEADER_TABLE,
    CHAOS_LEADER_COLUMNS, CHAOS_FOLLOWERS_TABLE, GREENSKIN_NUMBERS_TABLE, GREENSKIN_COLUMNS,
    MONSTER_TABLE, MONSTER_ATTITUDE_TABLE, UNDEAD_CLASS_TABLE, DEAD_LORD_TABLE,
    LONE_MENACE_TABLE, SHAMBLING_HORDE_START_TABLE, SHAMBLING_HORDE_COLUMNS, SHAMBLING_HORDE_TABLE,
} from "../tables/hazards.mjs";
import { GOAL_TABLE, PRINCIPLES_TABLE, STYLE_TABLE } from "../tables/princes.mjs";
import { rollSpecialFeature } from "./geography.mjs";
import { rollSecrets, rollQuirks } from "./princes.mjs";
import { createHazardsJournal } from "./hazards-journal.mjs";
import { postHazardsSummary } from "./hazards-chat.mjs";

/** Table 4-1: 1d10 against the GM-chosen style's column. */
export async function rollNumberOfLairs(style) {
    const roll = await new Roll("1d10").evaluate();
    return lookupBand(NUMBER_OF_LAIRS_TABLE, roll.total)[style];
}

/** Table 4-2: 1d10, dispatches every lair into one of four branches. */
export async function rollMonsterType() {
    const roll = await new Roll("1d10").evaluate();
    return lookupBand(MONSTER_TYPE_TABLE, roll.total).type;
}

/**
 * Chaos branch (Tables 4-3, 4-4, 4-5). Table 4-3's row 1 (count 1, `rollFollowers: false`)
 * means a solo leader with no Table 4-5 roll at all; every other row's `followerModifier`
 * *is* Table 4-5's row directly (`min(5, 1 + followerModifier)`), not an independent roll —
 * see CHAOS_CREATURE_COUNT_TABLE's own comment. A Chaos Warrior leader additionally gets the
 * book's explicit raider/rulership sub-roll (1d10, ≤7 raider, ≥8 rulership).
 */
export async function rollChaosLair() {
    const countEntry = CHAOS_CREATURE_COUNT_TABLE[(await new Roll("1d10").evaluate()).total];
    const count = countEntry.count;

    const leaderRoll = await new Roll("1d100").evaluate();
    const leader = lookupBand(CHAOS_LEADER_TABLE, leaderRoll.total + countEntry.leaderModifier).leader;

    let aim = null;
    if (leader === "Chaos Warrior") {
        aim = (await new Roll("1d10").evaluate()).total <= 7 ? "Raider" : "Rulership";
    }

    let followers = null;
    if (countEntry.rollFollowers !== false) {
        const row = Math.min(5, 1 + countEntry.followerModifier);
        followers = CHAOS_FOLLOWERS_TABLE[row][CHAOS_LEADER_COLUMNS[leader]];
    }

    return { type: "Chaos", count, leader, aim, followers };
}

/** Table 4-6: one direct (unbanded) 1d10 roll per creature-type column. */
async function rollGreenskinCounts() {
    const counts = {};
    for (const column of GREENSKIN_COLUMNS) {
        const roll = await new Roll("1d10").evaluate();
        counts[column] = GREENSKIN_NUMBERS_TABLE[roll.total][column];
    }
    return counts;
}

/**
 * Greenskin branch (Table 4-6). All five columns rolling 0 ("start again from Snotlings")
 * retries the whole set — capped at a handful of attempts, for safety against a pathological
 * roll queue in tests rather than because the book allows infinite rerolls. The leader is
 * the rightmost (highest-tier) column with a nonzero count — "most bands of Greenskins are
 * led by Orcs." A lair over 1000 total rolls a raiding-area size by rolling on Table 1-2
 * (the book's own literal instruction — reuses rollSpecialFeature the same way Princes
 * reuses Table 1-1 for principality size), recorded as text only, no scene placement.
 */
export async function rollGreenskinLair() {
    let counts;
    let total;
    for (let attempt = 0; attempt < 10; attempt++) {
        counts = await rollGreenskinCounts();
        total = Object.values(counts).reduce((sum, n) => sum + n, 0);
        if (total > 0) break;
    }

    const leader = [...GREENSKIN_COLUMNS].reverse().find(column => counts[column] > 0) ?? null;

    let raidingArea = null;
    if (total > 1000) {
        const special = await rollSpecialFeature();
        raidingArea = { feature: special.feature, size: special.size, sizeUnit: special.sizeUnit };
    }

    return { type: "Greenskin", counts, total, leader, raidingArea };
}

/** Per-monster-type headcount — a hardcoded formula per type, not a shared table (see tables/hazards.mjs's MONSTER_DESCRIPTIONS for why each type's number differs). */
async function rollMonsterHeadcount(monster) {
    if (monster === "Giant") {
        // "Roll 1d10/2" with no stated minimum — floored at 1 since a Giant *lair* with zero
        // Giants doesn't make sense; judgment call, flagged rather than silently applied.
        return Math.max(1, Math.floor((await new Roll("1d10").evaluate()).total / 2));
    }
    if (monster === "Great Eagle") {
        return Math.ceil((await new Roll("1d10").evaluate()).total / 3);
    }
    if (monster === "Wyvern") {
        return (await new Roll("1d10").evaluate()).total >= 9 ? 2 : 1;
    }
    return 1; // Griffon, Hippogriff, Hydra, Jabberwock, Manticore are all explicitly solitary
}

/** Monster branch (Tables 4-7, 4-8). */
export async function rollMonsterLair() {
    const monster = lookupBand(MONSTER_TABLE, (await new Roll("1d10").evaluate()).total).monster;
    const count = await rollMonsterHeadcount(monster);
    const attitude = lookupBand(MONSTER_ATTITUDE_TABLE[monster], (await new Roll("1d10").evaluate()).total).attitude;
    return { type: "Monster", monster, count, attitude };
}

/**
 * Table 4-12: picks a starting column (the "First Roll" row), then rolls exactly once per
 * column — 4 rolls total, wrapping around from the starting column — each banded against a
 * shared cumulative modifier that carries across all 4 (resets per horde, not within one,
 * same shape as Settlements' Table 3-2 chain). Afterward: curse check
 * `1d10 + floor(total / 25) >= 10`. Reused both for standalone Shambling Hordes and as a
 * Dead Lord's servants.
 */
export async function rollShamblingHorde() {
    const counts = {};
    let modifier = 0;

    const startColumn = lookupBand(SHAMBLING_HORDE_START_TABLE, (await new Roll("1d10").evaluate()).total).column;
    const startIndex = SHAMBLING_HORDE_COLUMNS.indexOf(startColumn);

    for (let i = 0; i < SHAMBLING_HORDE_COLUMNS.length; i++) {
        const column = SHAMBLING_HORDE_COLUMNS[(startIndex + i) % SHAMBLING_HORDE_COLUMNS.length];
        const roll = await new Roll("1d10").evaluate();
        const row = lookupBand(SHAMBLING_HORDE_TABLE, roll.total + modifier);
        counts[column] = (counts[column] ?? 0) + row[column];
        modifier += row.modifierDelta;
    }

    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    const curseRoll = await new Roll("1d10").evaluate();
    const cursed = curseRoll.total + Math.floor(total / 25) >= 10;

    return { counts, total, cursed };
}

/**
 * Dead Lord (Table 4-10): always gets a Shambling Horde as servants, plus a full
 * Princes-style personality (Goal/Principle/Style/Secrets/Quirks, reusing Princes' own
 * tables and Roll-Twice-recursive rollers directly) — the book explicitly suggests this
 * ("there is no reason not to use the rules for generating princes"), and the module
 * auto-generates it per the locked-in decision (PLAN.md). No Actor: unlike Princes' 7
 * hand-converted archetypes, the book gives no 2e statblock for these to convert from.
 */
async function rollDeadLord() {
    const deadLordType = lookupBand(DEAD_LORD_TABLE, (await new Roll("1d10").evaluate()).total).type;
    const servants = await rollShamblingHorde();

    const goal = GOAL_TABLE[(await new Roll("1d10").evaluate()).total].goal;
    const principle = PRINCIPLES_TABLE[(await new Roll("1d10").evaluate()).total].principle;
    const style = STYLE_TABLE[(await new Roll("1d10").evaluate()).total].style;
    const secrets = await rollSecrets();
    const quirks = await rollQuirks();

    return { deadLordType, servants, personality: { goal, principle, style, secrets, quirks } };
}

async function rollLoneMenace() {
    return { menace: lookupBand(LONE_MENACE_TABLE, (await new Roll("1d10").evaluate()).total).menace };
}

/** Undead branch (Tables 4-9..4-12): dispatches to Dead Lord, Lone Menace, or a standalone Shambling Horde. */
export async function rollUndeadLair() {
    const undeadClass = lookupBand(UNDEAD_CLASS_TABLE, (await new Roll("1d10").evaluate()).total).undeadClass;

    if (undeadClass === "Dead Lord") return { type: "Undead", undeadClass, ...(await rollDeadLord()) };
    if (undeadClass === "Lone Menace") return { type: "Undead", undeadClass, ...(await rollLoneMenace()) };
    return { type: "Undead", undeadClass, horde: await rollShamblingHorde() };
}

/** Table 4-2 dispatch: rolls one full lair of whichever monster type comes up. */
export async function rollLair() {
    const monsterType = await rollMonsterType();
    if (monsterType === "Chaos") return rollChaosLair();
    if (monsterType === "Greenskin") return rollGreenskinLair();
    if (monsterType === "Monster") return rollMonsterLair();
    return rollUndeadLair();
}

/** Rolls Table 4-1 for a count against the GM-chosen style, then a full lair per that count. */
export async function rollLairs(style) {
    const count = await rollNumberOfLairs(style);
    const lairs = [];
    for (let i = 0; i < count; i++) {
        lairs.push(await rollLair());
    }
    return lairs;
}

/**
 * @param {ReturnType<typeof import("./region.mjs").createRegion>} region
 * @param {"few"|"moderate"|"many"} style
 * @returns {Promise<{ hazards: { journalId: string, entries: object[] } }>}
 */
export async function generateHazards(region, style) {
    if (!style) {
        throw new Error("Choose a campaign style (Few/Moderate/Many) first — Table 4-1's lair count is GM-chosen, not random.");
    }

    const newLairs = await rollLairs(style);
    const { journal } = await createHazardsJournal(region, newLairs, region.hazards.entries.length);
    await postHazardsSummary(region, newLairs, region.hazards.entries.length);

    return { hazards: { journalId: journal.id, entries: [...region.hazards.entries, ...newLairs] } };
}
