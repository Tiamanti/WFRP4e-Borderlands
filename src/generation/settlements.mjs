// SPECS.md "COMMUNITIES SUMMARY" — Tables 3-1 through 3-7 (Renegade Crowns, PDF pages
// 44-51). Runs once per prince (their principality) plus once more for the uncontrolled
// area, same one-shot batch pattern as Ancient Ruins/Relationships — no per-step GM
// decision the way Geography's grid-fill needs. See PLAN.md's "Settlements phase design"
// section for the full process this mirrors.

import { lookupBand } from "../tables/ruins.mjs";
import {
    VILLAGE_COUNT_TABLE, principalitySizeBand, COMMUNITY_FEATURES_TABLE,
    ECONOMIC_RESOURCE_TABLE, RESOURCES_TABLE, STRONGHOLD_RESOURCES, CRAFTS_TABLE,
    STRONGHOLD_CRAFTS, ODDITIES_TABLE, SPECIAL_FEATURES_TABLE,
} from "../tables/settlements.mjs";
import { createSettlementsJournal } from "./settlements-journal.mjs";
import { postSettlementsSummary } from "./settlements-chat.mjs";
import { rollNamingStyleForRace, rollSettlementName } from "./names.mjs";
import { MODULE_ID, SETTINGS } from "../settings.mjs";

/** Table 3-2 step 1: whether the principality has a town at all ("if the result is over 100"). Never called for the uncontrolled area — "there are no towns between principalities." */
export async function rollTownCheck(principalitySize) {
    const roll = await new Roll("1d100").evaluate();
    return roll.total + principalitySize > 100;
}

/** Table 3-1: 1d10, direct lookup (not banded) against the column for `sizeBand` ("small"|"medium"|"large" — see principalitySizeBand). The uncontrolled area always uses "medium", per the book. */
export async function rollVillageCount(sizeBand) {
    const roll = await new Roll("1d10").evaluate();
    return VILLAGE_COUNT_TABLE[roll.total][sizeBand];
}

/** "1d10 of them are interesting" — same formula for a principality and the uncontrolled area. */
export async function rollHomesteadCount() {
    return (await new Roll("1d10").evaluate()).total;
}

/**
 * Table 3-3 (+ 3-4/3-5/3-6): resolves one Economic Resource hit into a concrete
 * Resource/Craft/Oddity/Market result. `resourceState` (`{ modifier, marketRolled }`) is
 * shared across every Economic Resource roll for one settlement — Table 3-3's cumulative
 * modifier and its "later Market results become Craft" rule both apply per-settlement, not
 * per-roll, and are tracked independently of Table 3-2's own modifier chain.
 */
export async function rollEconomicResourceDetail(resourceState) {
    const roll = await new Roll("1d10").evaluate();
    const band = lookupBand(ECONOMIC_RESOURCE_TABLE, roll.total + resourceState.modifier);
    resourceState.modifier += band.modifierDelta;

    let kind = band.kind;
    if (kind === "Market") {
        if (resourceState.marketRolled) kind = "Craft"; // "treat future results of Market as Craft"
        else resourceState.marketRolled = true;
    }

    if (kind === "Resource") {
        const resource = lookupBand(RESOURCES_TABLE, (await new Roll("1d100").evaluate()).total).resource;
        return { kind, detail: resource, isStronghold: STRONGHOLD_RESOURCES.has(resource) };
    }
    if (kind === "Craft") {
        const craft = lookupBand(CRAFTS_TABLE, (await new Roll("1d100").evaluate()).total).craft;
        return { kind, detail: craft, isStronghold: STRONGHOLD_CRAFTS.has(craft) };
    }
    if (kind === "Oddity") {
        const oddity = ODDITIES_TABLE[(await new Roll("1d10").evaluate()).total].oddity;
        return { kind: "Oddity", detail: oddity, isStronghold: false };
    }
    return { kind: "Market", detail: null, isStronghold: false };
}

/**
 * Table 3-2, resolved into every feature the roll (and its recursion) actually produces —
 * not just one. A roll can chain further rolls in three ways: Chokepoint grants one bonus
 * roll ("a second interesting feature"), capped at one ("ignore further results of
 * Chokepoint" — a second Chokepoint hit contributes nothing and stops the chain rather than
 * granting a third roll); Special's Table 3-7 "Roll Twice" result rolls twice more; and a
 * town's Special "Monastery" result doesn't apply to the town at all — it's handed to
 * `onMonasteryForTown` (see rollOwnerSettlements, which attaches it to the next village or
 * homestead instead) and the town rerolls that slot. `maxFeatures` caps the whole chain,
 * mirroring Princes' Secrets cap — the book's own permission to "ignore [Roll Twice] once
 * the settlement becomes ridiculous," mechanized as a hard stop rather than GM judgment.
 */
export async function rollCommunityFeatures(tier, resourceState, { onMonasteryForTown, maxFeatures = 6 } = {}) {
    const features = [];
    let modifier = 0;
    let chokepointUsed = false;

    async function rollSpecial() {
        const special = SPECIAL_FEATURES_TABLE[(await new Roll("1d10").evaluate()).total];
        if (special.type === "RollTwice") {
            await rollOnce();
            await rollOnce();
        } else if (special.type === "Monastery" && tier === "town" && onMonasteryForTown) {
            onMonasteryForTown();
            await rollOnce(); // "re-roll for the town"
        } else {
            features.push({ type: special.type });
        }
    }

    async function rollOnce() {
        if (features.length >= maxFeatures) return;
        const roll = await new Roll("1d100").evaluate();
        const total = roll.total + modifier;
        if (total <= 0) return; // "if your roll is a negative result, there is no community feature"

        const band = lookupBand(COMMUNITY_FEATURES_TABLE, total);
        modifier += band.modifierDelta;

        if (band.feature === "EconomicResource") {
            features.push(await rollEconomicResourceDetail(resourceState));
        } else if (band.feature === "Stronghold") {
            features.push({ type: "Stronghold" });
        } else if (band.feature === "Chokepoint") {
            if (!chokepointUsed) {
                chokepointUsed = true;
                features.push({ type: "Chokepoint" });
                await rollOnce();
            } // else: ignored entirely, chain ends here
        } else if (band.feature === "Cultists") {
            features.push({ type: "Cultists" });
        } else if (band.feature === "Special") {
            await rollSpecial();
        }
    }

    await rollOnce();
    return features;
}

/**
 * Rolls one settlement's population and features. `onMonasteryForTown` is only consulted
 * for tier "town" — see rollCommunityFeatures. `generateNames` defaults to `false` here
 * (opt-in, keeps this pure function's tests roll-queue-neutral) — `generateSettlements`
 * always passes through the actual "Generate Names" setting (default `true` there), so
 * end-to-end behavior matches the setting regardless of this default.
 */
export async function rollSettlement(tier, ownerId, { onMonasteryForTown, ownerStyle, generateNames = false } = {}) {
    const resourceState = { modifier: 0, marketRolled: false };
    const features = await rollCommunityFeatures(tier, resourceState, { onMonasteryForTown });

    let population;
    if (tier === "town") population = (await new Roll("1000 + (3d10 * 100)").evaluate()).total;
    else if (tier === "village") population = (await new Roll("3d10 * 10").evaluate()).total;
    else population = (await new Roll("3d10").evaluate()).total;

    // "For every full 1,000 people, the town has one economic resource... the number based
    // on population is a minimum" — top up with flat Table 3-3 rolls (continuing the same
    // per-settlement resourceState) until the floor is met; whatever the feature chain
    // already produced counts toward it, so a town whose own Table 3-2 roll came up
    // Economic Resource doesn't get double-counted.
    if (tier === "town") {
        const minimum = Math.max(1, Math.floor(population / 1000));
        const resourceCount = features.filter(f => ["Resource", "Craft", "Oddity", "Market"].includes(f.kind)).length;
        for (let i = resourceCount; i < minimum; i++) {
            features.push(await rollEconomicResourceDetail(resourceState));
        }
    }

    // Gemstone/gold/silver mines and Gem Cutters/Goldsmiths (both flagged on the Economic
    // Resource detail itself) and Templars both auto-flag Stronghold, independent of
    // whether Table 3-2 separately rolled an explicit Stronghold result.
    const isStronghold = features.some(f => f.type === "Stronghold" || f.type === "Templars" || f.isStronghold);

    const settlement = { tier, ownerId, population, features, isStronghold };
    if (generateNames) settlement.name = await rollSettlementName(ownerStyle);
    return settlement;
}

/**
 * Rolls every settlement for one owner — a prince's principality (`principalitySize` in
 * squares) or the uncontrolled area (`principalitySize: null`, `ownerId: null`, always
 * "medium" per the book, and never gets a town check).
 */
export async function rollOwnerSettlements(ownerId, principalitySize, { ownerStyle, generateNames = false } = {}) {
    const settlements = [];
    let pendingMonastery = null;
    const onMonasteryForTown = () => { pendingMonastery = { type: "Monastery" }; };

    if (principalitySize !== null && await rollTownCheck(principalitySize)) {
        settlements.push(await rollSettlement("town", ownerId, { onMonasteryForTown, ownerStyle, generateNames }));
    }

    const sizeBand = principalitySize !== null ? principalitySizeBand(principalitySize) : "medium";
    const villageCount = await rollVillageCount(sizeBand);
    for (let i = 0; i < villageCount; i++) {
        const village = await rollSettlement("village", ownerId, { ownerStyle, generateNames });
        if (pendingMonastery) {
            village.features.push(pendingMonastery);
            pendingMonastery = null;
        }
        settlements.push(village);
    }

    const homesteadCount = await rollHomesteadCount();
    for (let i = 0; i < homesteadCount; i++) {
        const homestead = await rollSettlement("homestead", ownerId, { ownerStyle, generateNames });
        if (pendingMonastery) {
            homestead.features.push(pendingMonastery);
            pendingMonastery = null;
        }
        settlements.push(homestead);
    }

    return settlements;
}

/**
 * @param {ReturnType<typeof import("./region.mjs").createRegion>} region
 * @returns {Promise<{ settlements: { journalId: string, entries: object[] } }>}
 */
export async function generateSettlements(region) {
    if (region.princes.entries.length === 0) {
        throw new Error("Run the Princes phase first — Settlements are generated per principality.");
    }

    const generateNames = game.settings.get(MODULE_ID, SETTINGS.generateNames);

    const newSettlements = [];
    for (const prince of region.princes.entries) {
        // The prince's own naming style is only needed to bias their settlements' names —
        // Princes themselves don't get a generated name at all, per direction.
        const ownerStyle = generateNames ? await rollNamingStyleForRace(prince.race) : undefined;
        newSettlements.push(...await rollOwnerSettlements(prince.actorId, prince.principalitySize, { ownerStyle, generateNames }));
    }
    newSettlements.push(...await rollOwnerSettlements(null, null, { generateNames })); // the uncontrolled area — no owner style to bias toward

    const allSettlements = [...region.settlements.entries, ...newSettlements];
    const { journal } = await createSettlementsJournal(region, region.princes.entries, allSettlements);
    await postSettlementsSummary(region, newSettlements, region.settlements.entries.length, allSettlements);

    return { settlements: { journalId: journal.id, entries: allSettlements } };
}
