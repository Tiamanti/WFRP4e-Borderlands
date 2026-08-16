// Appendix I: Border Prince Names (Tables A-1 through A-12) — place names only. Per
// direction, Princes deliberately don't get a generated personal name at all (left to the
// GM); this module only names settlements. See tables/names.mjs for the source data and the
// race/style mapping rationale.

import { lookupBand } from "../tables/ruins.mjs";
import { NAMING_STYLES, RACE_TO_STYLE, FIRST_ELEMENT_TABLES, SECOND_ELEMENT_TABLES } from "../tables/names.mjs";

/**
 * A prince's naming style, from their race (tables/princes.mjs RACE_TABLE). "Human—Other"
 * has no direct entry in RACE_TO_STYLE — split 50/50 between Estalian and Kislevite, the two
 * styles nothing else maps to, so every table sees use across enough princes.
 */
export async function rollNamingStyleForRace(race) {
    if (RACE_TO_STYLE[race]) return RACE_TO_STYLE[race];
    const roll = await new Roll("1d2").evaluate();
    return roll.total === 1 ? "Estalian" : "Kislevite";
}

/**
 * A settlement's naming style is biased toward its owner's own style (or Flavourful, the
 * "native, unclaimed land" style, for the uncontrolled area's `ownerStyle: null`): 50%
 * chance of that style, 10% chance each for the other five — locked in via AskUserQuestion.
 */
export async function rollSettlementNamingStyle(ownerStyle) {
    const biasStyle = ownerStyle ?? "Flavourful";
    const others = NAMING_STYLES.filter(style => style !== biasStyle);

    const roll = await new Roll("1d100").evaluate();
    if (roll.total <= 50) return biasStyle;

    const index = Math.min(others.length - 1, Math.floor((roll.total - 51) / 10));
    return others[index];
}

/**
 * Rolls a First + Second Element and concatenates them. Flavourful's pair is two whole
 * words, space-joined ("Iron Hold"); every other style's pair is two name fragments joined
 * directly, no separator (Empire "Aber" + "burg" -> "Aberburg") — that's what the book's own
 * trailing/leading hyphens on each fragment represent, already stripped in tables/names.mjs.
 */
export async function rollPlaceName(style) {
    const firstRoll = await new Roll("1d100").evaluate();
    const first = lookupBand(FIRST_ELEMENT_TABLES[style], firstRoll.total).element;

    if (style === "Flavourful") {
        const secondRoll = await new Roll("1d100").evaluate();
        const second = lookupBand(SECOND_ELEMENT_TABLES[style], secondRoll.total).element;
        return `${first} ${second}`;
    }

    const secondRoll = await new Roll("1d10").evaluate();
    const second = SECOND_ELEMENT_TABLES[style][secondRoll.total];
    return `${first}${second}`;
}

/** Rolls a settlement's naming style (biased toward its owner), then a name in that style. */
export async function rollSettlementName(ownerStyle) {
    const style = await rollSettlementNamingStyle(ownerStyle);
    return rollPlaceName(style);
}
