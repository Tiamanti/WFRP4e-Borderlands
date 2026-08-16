// SPECS.md / PLAN.md "Relationships phase design" — Tables 2-12 through 2-22 (Renegade
// Crowns, PDF pages 35-43). Like Ancient Ruins, this has no per-step GM decision the way
// Geography's grid-fill does, so it runs as a single batch through the generic runPhase()
// flow rather than its own interactive dialog.
//
// Per PLAN.md's locked-in design: every prince gets *two* relationships, each rolled
// against an independently-chosen random *other* prince (self excluded, repeats across a
// prince's own two rolls — and across other princes' rolls — allowed). The book's own
// tolerance for contradictory results between two princes is the explicit justification;
// see PLAN.md for the full AskUserQuestion trail.

import { lookupBand } from "../tables/ruins.mjs";
import {
    DIPLOMATIC_RELATIONS_TABLE, LENGTH_OF_RELATIONS_TABLE, ALLIANCE_ORIGIN_TABLE,
    CAUSE_TABLES, WAR_CAUSE_TABLE,
} from "../tables/relationships.mjs";
import { createRelationshipsJournal } from "./relationships-journal.mjs";
import { postRelationshipsSummary } from "./relationships-chat.mjs";

/**
 * Picks a uniformly random *other* prince's index — self excluded. Repeats are allowed,
 * both across a single prince's own two relationship rolls and across other princes' rolls
 * (see PLAN.md) — this only ever excludes `excludeIndex` itself.
 */
export async function pickRandomPartner(princes, excludeIndex) {
    const candidates = princes.map((_, i) => i).filter(i => i !== excludeIndex);
    const roll = await new Roll(`1d${candidates.length}`).evaluate();
    return candidates[roll.total - 1];
}

/**
 * Table 2-14's own reinforcement rule: an alliance of 10+ years needs a second Origin roll
 * to explain its longevity ("there must be a story behind it"). The book leaves a further
 * third roll to GM discretion for "particularly old alliances" with no exact threshold
 * given — this applies it at 25+ years (Table 2-13's own next band up) as a judgment call,
 * documented here rather than left implicit.
 */
async function rollAllianceCause(years) {
    const origins = [ALLIANCE_ORIGIN_TABLE[(await new Roll("1d10").evaluate()).total].cause];
    if (years >= 10) origins.push(ALLIANCE_ORIGIN_TABLE[(await new Roll("1d10").evaluate()).total].cause);
    if (years >= 25) origins.push(ALLIANCE_ORIGIN_TABLE[(await new Roll("1d10").evaluate()).total].cause);
    return origins;
}

/**
 * Table 2-22: War redirects into Envy/Fear/Hatred/Vengeance's own cause table for an
 * underlying cause, or resolves immediately on Conquest — see tables/relationships.mjs.
 */
async function rollWarCause() {
    const entry = lookupBand(WAR_CAUSE_TABLE, (await new Roll("1d10").evaluate()).total);
    if (!entry.rerollNature) return { causeOfWar: entry.cause };
    const table = CAUSE_TABLES[entry.rerollNature];
    const underlyingCause = lookupBand(table, (await new Roll("1d10").evaluate()).total).cause;
    return { causeOfWar: entry.cause, underlyingNature: entry.rerollNature, underlyingCause };
}

/**
 * Rolls Table 2-12's nature-specific cause. Rivalry has no cause table at all (the book's
 * own explicit "does not need an exact cause" default-condition exemption), and Alliance/War
 * have their own multi-roll shapes, so this dispatches rather than doing one uniform lookup.
 * Returns `null` for Rivalry, `{ origins: [...] }` for Alliance, `{ causeOfWar,
 * underlyingNature?, underlyingCause? }` for War, and a plain cause string for everything else.
 */
export async function rollRelationshipCause(nature, years) {
    if (nature === "Rivalry") return null;
    if (nature === "Alliance") return { origins: await rollAllianceCause(years) };
    if (nature === "War") return rollWarCause();
    const table = CAUSE_TABLES[nature];
    return lookupBand(table, (await new Roll("1d10").evaluate()).total).cause;
}

/** Rolls one relationship for `princes[princeAIndex]`, paired against a random other prince: nature, length, and nature-specific cause. */
export async function rollSingleRelationship(princes, princeAIndex) {
    const princeBIndex = await pickRandomPartner(princes, princeAIndex);
    const nature = DIPLOMATIC_RELATIONS_TABLE[(await new Roll("1d10").evaluate()).total].relation;
    const lengthEntry = lookupBand(LENGTH_OF_RELATIONS_TABLE, (await new Roll("1d100").evaluate()).total);
    const cause = await rollRelationshipCause(nature, lengthEntry.years);

    return {
        princeAId: princes[princeAIndex].actorId,
        princeBId: princes[princeBIndex].actorId,
        nature, length: lengthEntry.length, cause,
    };
}

/** Rolls two relationships per prince (PLAN.md's locked-in count), each independently paired. */
export async function rollRelationships(princes) {
    const relationships = [];
    for (let i = 0; i < princes.length; i++) {
        relationships.push(await rollSingleRelationship(princes, i));
        relationships.push(await rollSingleRelationship(princes, i));
    }
    return relationships;
}

/**
 * @param {ReturnType<typeof import("./region.mjs").createRegion>} region
 * @returns {Promise<{ relationships: { journalId: string, entries: object[] } }>}
 */
export async function generateRelationships(region) {
    if (region.princes.entries.length < 2) {
        throw new Error("Run the Princes phase first — Relationships need at least two princes to pair up.");
    }

    const newRelationships = await rollRelationships(region.princes.entries);
    const allRelationships = [...region.relationships.entries, ...newRelationships];
    const { journal } = await createRelationshipsJournal(region, region.princes.entries, allRelationships);
    await postRelationshipsSummary(region, newRelationships, region.relationships.entries.length);

    return { relationships: { journalId: journal.id, entries: allRelationships } };
}
