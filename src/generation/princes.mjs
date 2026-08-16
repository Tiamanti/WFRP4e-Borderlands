// SPECS.md "PRINCE GENERATION SUMMARY" — Tables 1-3 (reused for count), 2-1..2-11 (Renegade
// Crowns, PDF pages 21-35). Unlike Ancient Ruins, Princes don't get placed onto the
// Geography scene at all (per PLAN.md's locked-in decision — principality is rolled for
// size only, drawn by the GM), so this doesn't require a Geography scene to exist first,
// only `region.geography.sceneName` for the shared Actor folder's name (set at region
// creation regardless of whether Geography has been rolled yet).

import { lookupBand, RUIN_COUNT_TABLE } from "../tables/ruins.mjs";
import {
    PRINCE_TYPE_TABLE, PRINCE_TYPES, RACE_TABLE, isImpossibleRaceType,
    CAREER_STAGE_LEVEL_TABLE, CAREER_STAGE_PROGRESS_TABLE, GOAL_TABLE, PRINCIPLES_TABLE,
    STYLE_TABLE, SECRETS_TABLE, QUIRKS_TABLE, COURTIERS_TABLE, TITLE_TABLE,
} from "../tables/princes.mjs";
import { GEOGRAPHY_TABLE } from "../tables/geography.mjs";
import { NEW_CHARACTERISTIC_DICE } from "../tables/race-conversion.mjs";
import { getOrCreateActorFolder, createPrinceActor } from "./princes-actor.mjs";
import { postPrincesSummary } from "./princes-chat.mjs";

// Table 1-1's terrain size formulas range as high as "1d10 * 50" (max 500), which the book
// never questions since it's just describing a patch of land, not comparing princes against
// each other — but reused unclamped for Principality size, a lucky high roll on one prince
// (observed: 350 squares) next to unlucky low rolls on the others (59 squares *combined*)
// produces exactly the kind of lopsided region the user flagged. Capped per direction.
const MAX_PRINCIPALITY_SIZE = 100;

/**
 * "Principality: roll on Table 1-1, ignore the type of terrain, and roll the indicated
 * dice to generate a size." Every row is either a terrain row (has a `sizeFormula`) or a
 * river row (doesn't) — since this is a single un-bonused 1d100 roll, it can never reach
 * the >100 Special Feature branch, so a plain reroll-on-river is the only edge case.
 */
async function rollPrincipalitySize() {
    let entry;
    do {
        const roll = await new Roll("1d100").evaluate();
        entry = GEOGRAPHY_TABLE[roll.total];
    } while (entry.type !== "terrain");
    const size = (await new Roll(entry.sizeFormula).evaluate()).total;
    return Math.min(size, MAX_PRINCIPALITY_SIZE);
}

/**
 * Table 2-8: a "Roll Twice" result (10) recurses, applying both results — and if either of
 * those is *also* "Roll Twice," recurses again. Capped at `maxSecrets` (book: "four secrets
 * is probably as many as a single prince can reasonably have"), which also bounds the
 * recursion — once the cap is hit, further rolls are skipped rather than re-rolled.
 */
async function rollSecrets(maxSecrets = 4) {
    const secrets = [];
    async function rollOnce() {
        if (secrets.length >= maxSecrets) return;
        const roll = await new Roll("1d10").evaluate();
        const { secret } = SECRETS_TABLE[roll.total];
        if (secret === "Roll Twice") {
            await rollOnce();
            await rollOnce();
        } else {
            secrets.push(secret);
        }
    }
    await rollOnce();
    return secrets;
}

/**
 * Table 2-9: a "Roll Twice" result (10) rolls two quirks instead of one, but — unlike
 * Secrets — those two extra rolls "ignore future rolls of 10" (reroll instead of nesting
 * further), and duplicate quirks are kept ("two different versions of whatever it is").
 */
async function rollSingleIgnoringTens() {
    let roll = await new Roll("1d10").evaluate();
    while (roll.total === 10) roll = await new Roll("1d10").evaluate();
    return QUIRKS_TABLE[roll.total].quirk;
}

async function rollQuirks() {
    const roll = await new Roll("1d10").evaluate();
    if (roll.total !== 10) return [QUIRKS_TABLE[roll.total].quirk];
    return [await rollSingleIgnoringTens(), await rollSingleIgnoringTens()];
}

/**
 * Table 2-1's baseline characteristics, plus freshly-rolled Initiative and Dexterity (2e
 * has neither — always "Generate New Stats," see race-conversion.mjs). Race is
 * deliberately *not* a parameter here: princes are NPCs, and per direction their rolled
 * race (Table 2-2) stays narrative flavor rather than adjusting WS/BS/S/T/etc. Pure,
 * Roll-based, unit-testable. Wounds isn't computed here at all — the wfrp4e system
 * auto-calculates it from S/T/WP once the Actor's characteristics are set (see
 * princes-actor.mjs), using the same "avg size" formula this would otherwise duplicate.
 */
export async function convertCharacteristics(statblock) {
    const characteristics = { ...statblock.characteristics };
    characteristics.initiative = (await new Roll(NEW_CHARACTERISTIC_DICE.initiative).evaluate()).total;
    characteristics.dexterity = (await new Roll(NEW_CHARACTERISTIC_DICE.dexterity).evaluate()).total;
    return characteristics;
}

async function rollSinglePrince() {
    const type = lookupBand(PRINCE_TYPE_TABLE, (await new Roll("1d100").evaluate()).total).type;

    // "If you roll an impossible combination [Dwarf/Halfling Wizard or Priest], simply re-roll the race."
    let race;
    do {
        race = lookupBand(RACE_TABLE, (await new Roll("1d100").evaluate()).total).race;
    } while (isImpossibleRaceType(race, type));

    const careerLevel = lookupBand(CAREER_STAGE_LEVEL_TABLE, (await new Roll("1d100").evaluate()).total).label;
    const careerProgress = CAREER_STAGE_PROGRESS_TABLE[(await new Roll("1d10").evaluate()).total].label;

    const goal = GOAL_TABLE[(await new Roll("1d10").evaluate()).total].goal;
    const principle = PRINCIPLES_TABLE[(await new Roll("1d10").evaluate()).total].principle;
    const style = STYLE_TABLE[(await new Roll("1d10").evaluate()).total].style;
    const secrets = await rollSecrets();
    const quirks = await rollQuirks();

    const courtiers = COURTIERS_TABLE[(await new Roll("1d10").evaluate()).total].count;
    const title = lookupBand(TITLE_TABLE, (await new Roll("1d100").evaluate()).total).title;
    const principalitySize = await rollPrincipalitySize();

    const statblock = PRINCE_TYPES[type];
    const characteristics = await convertCharacteristics(statblock);

    return {
        type, race, characteristics,
        career: statblock.career, priorCareers: statblock.priorCareers,
        skills: statblock.skills, talents: statblock.talents, guidanceNotes: statblock.guidanceNotes,
        armour: statblock.armour, weapons: statblock.weapons, trappings: statblock.trappings,
        careerLevel, careerProgress, goal, principle, style, secrets, quirks, courtiers, title, principalitySize,
    };
}

/** Rolls Table 1-3 for a count (book: "roll on Table 1-3 and use the result as the number of princes"), then a full prince per Tables 2-1..2-11. */
export async function rollPrinces(region) {
    const countRoll = await new Roll("1d100").evaluate();
    const count = lookupBand(RUIN_COUNT_TABLE, countRoll.total).count;

    const princes = [];
    for (let i = 0; i < count; i++) {
        princes.push(await rollSinglePrince());
    }
    return princes;
}

/**
 * @param {ReturnType<typeof import("./region.mjs").createRegion>} region
 * @returns {Promise<{ princes: { entries: object[] } }>}
 */
export async function generatePrinces(region) {
    const newPrinces = await rollPrinces(region);
    const folder = await getOrCreateActorFolder(region); // mutates region.actorFolderId directly, same pattern as journal-folder.mjs
    for (const prince of newPrinces) {
        const actor = await createPrinceActor(region, prince, folder);
        prince.actorId = actor.id; // later phases (Relationships) link back to the prince's Actor
    }
    await postPrincesSummary(region, newPrinces, region.princes.entries.length);

    return { princes: { entries: [...region.princes.entries, ...newPrinces] } };
}
