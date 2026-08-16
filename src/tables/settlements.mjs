// Tables 3-1 through 3-7: Number of Villages, Community Features, Economic Resources,
// Resources, Crafts, Oddities, and Settlement Special Features (Renegade Crowns, PDF pages
// 44-51). Cross-checked with `pdftotext -table` — unlike every dense table in Geography/
// Princes/Relationships, no row-shift misprint turned up here; `-table` and `-layout`
// agreed cleanly. See PLAN.md's "Settlements phase design" section for the process this
// data drives.

import { lookupBand } from "./ruins.mjs";

export { lookupBand };

/**
 * Table 3-1: Number of Villages, 1d10 direct lookup (not banded) against a column picked by
 * principality size — see principalitySizeBand, below.
 */
export const VILLAGE_COUNT_TABLE = [
    null,
    { small: 1, medium: 1, large: 1 }, { small: 1, medium: 1, large: 2 },
    { small: 1, medium: 2, large: 3 }, { small: 2, medium: 2, large: 4 },
    { small: 2, medium: 3, large: 4 }, { small: 2, medium: 3, large: 5 },
    { small: 3, medium: 4, large: 5 }, { small: 3, medium: 4, large: 6 },
    { small: 4, medium: 5, large: 7 }, { small: 4, medium: 6, large: 8 },
];

/** "A small principality covers up to 80 squares, a medium one between 80 and 150, and a large one more than 150." */
export function principalitySizeBand(squares) {
    if (squares <= 80) return "small";
    if (squares <= 150) return "medium";
    return "large";
}

/**
 * Table 3-2: Community Features, d100 with a per-settlement cumulative modifier (resets
 * between settlements, not within one — see rollCommunityFeatures in
 * generation/settlements.mjs). Only Economic Resource (+10) and Cultists (-10) change the
 * modifier; Stronghold/Chokepoint/Special leave it as-is. The final band is open-ended
 * ("91+") since the cumulative modifier can push a roll past 100. A total of 0 or below
 * ("if your roll is a negative result, there is no community feature") resolves to no
 * feature at all — handled by the caller, not encoded as a band here.
 */
export const COMMUNITY_FEATURES_TABLE = [
    { max: 6, feature: "EconomicResource", modifierDelta: 10 }, { max: 7, feature: "Stronghold", modifierDelta: 0 },
    { max: 8, feature: "Chokepoint", modifierDelta: 0 }, { max: 9, feature: "Cultists", modifierDelta: -10 },
    { max: 10, feature: "Special", modifierDelta: 0 },
    { max: 15, feature: "EconomicResource", modifierDelta: 10 }, { max: 17, feature: "Stronghold", modifierDelta: 0 },
    { max: 18, feature: "Chokepoint", modifierDelta: 0 }, { max: 19, feature: "Cultists", modifierDelta: -10 },
    { max: 20, feature: "Special", modifierDelta: 0 },
    { max: 25, feature: "EconomicResource", modifierDelta: 10 }, { max: 26, feature: "Stronghold", modifierDelta: 0 },
    { max: 28, feature: "Chokepoint", modifierDelta: 0 }, { max: 29, feature: "Cultists", modifierDelta: -10 },
    { max: 30, feature: "Special", modifierDelta: 0 },
    { max: 36, feature: "EconomicResource", modifierDelta: 10 }, { max: 37, feature: "Stronghold", modifierDelta: 0 },
    { max: 38, feature: "Chokepoint", modifierDelta: 0 }, { max: 39, feature: "Cultists", modifierDelta: -10 },
    { max: 40, feature: "Special", modifierDelta: 0 },
    { max: 45, feature: "EconomicResource", modifierDelta: 10 }, { max: 47, feature: "Stronghold", modifierDelta: 0 },
    { max: 48, feature: "Chokepoint", modifierDelta: 0 }, { max: 49, feature: "Cultists", modifierDelta: -10 },
    { max: 50, feature: "Special", modifierDelta: 0 },
    { max: 55, feature: "EconomicResource", modifierDelta: 10 }, { max: 57, feature: "Stronghold", modifierDelta: 0 },
    { max: 58, feature: "Chokepoint", modifierDelta: 0 }, { max: 59, feature: "Cultists", modifierDelta: -10 },
    { max: 60, feature: "Special", modifierDelta: 0 },
    { max: 65, feature: "EconomicResource", modifierDelta: 10 }, { max: 66, feature: "Stronghold", modifierDelta: 0 },
    { max: 68, feature: "Chokepoint", modifierDelta: 0 }, { max: 69, feature: "Cultists", modifierDelta: -10 },
    { max: 70, feature: "Special", modifierDelta: 0 },
    { max: 75, feature: "EconomicResource", modifierDelta: 10 }, { max: 76, feature: "Stronghold", modifierDelta: 0 },
    { max: 77, feature: "Chokepoint", modifierDelta: 0 }, { max: 79, feature: "Cultists", modifierDelta: -10 },
    { max: 80, feature: "Special", modifierDelta: 0 },
    // 81-90: no Special band this decade — the book's own table, transcribed as-is.
    { max: 84, feature: "EconomicResource", modifierDelta: 10 }, { max: 86, feature: "Stronghold", modifierDelta: 0 },
    { max: 88, feature: "Chokepoint", modifierDelta: 0 }, { max: 90, feature: "Cultists", modifierDelta: -10 },
    // 91+: catch-all, reachable only via the cumulative modifier pushing a roll past 100.
    { max: Infinity, feature: "Special", modifierDelta: 0 },
];

export const COMMUNITY_FEATURE_DESCRIPTIONS = {
    "Stronghold": "Significantly better fortifications than normal — stone walls at least twelve feet high, a wall walk, gate towers, a water source inside the walls, and at least a month's stored food.",
    "Chokepoint": "A place travellers must pass through to go further — a mountain pass, the only bridge over a river. Attracts merchants and control-seeking princes alike.",
    "Cultists": "Hides a significant Cult of the Ruinous Powers — in a homestead, the whole population; in a village or town, a smaller but sometimes still-dominant portion. Usually secretive.",
};

/**
 * Table 3-3: Economic Resources, 1d10 bands with a per-settlement cumulative modifier
 * (Resource +2, Craft +1 — separate from Table 3-2's own modifier chain, tracked
 * independently; see generation/settlements.mjs). Market is "sticky": the first Market
 * result stands, but any *later* Table 3-3 roll for the same settlement that lands on
 * Market is instead treated as Craft — handled by the caller, not encoded as a band delta.
 */
export const ECONOMIC_RESOURCE_TABLE = [
    { max: 4, kind: "Resource", modifierDelta: 2 }, { max: 7, kind: "Craft", modifierDelta: 1 },
    { max: 8, kind: "Oddity", modifierDelta: 0 }, { max: Infinity, kind: "Market", modifierDelta: 0 },
];

/** Table 3-4: Resources, d100 bands. Gemstone/gold/silver mines automatically make the settlement a Stronghold. */
export const RESOURCES_TABLE = [
    { max: 10, resource: "Furs" }, { max: 20, resource: "Medicinal Plants" },
    { max: 30, resource: "Mine, coal" }, { max: 36, resource: "Mine, copper" },
    { max: 46, resource: "Mine, iron" }, { max: 53, resource: "Mine, lead" },
    { max: 55, resource: "Mine, gemstones" }, { max: 57, resource: "Mine, gold" },
    { max: 61, resource: "Mine, silver" }, { max: 72, resource: "Mine, tin" },
    { max: 84, resource: "Quarry, building stone" }, { max: 95, resource: "Quarry, clay" },
    { max: 100, resource: "Quarry, marble" },
];

export const STRONGHOLD_RESOURCES = new Set(["Mine, gemstones", "Mine, gold", "Mine, silver"]);

/** Table 3-5: Crafts, d100 bands. Gem Cutter/Goldsmith automatically make the settlement a Stronghold. */
export const CRAFTS_TABLE = [
    { max: 5, craft: "Armourer" }, { max: 10, craft: "Bowyer" }, { max: 18, craft: "Brewer" },
    { max: 22, craft: "Candlemaker" }, { max: 30, craft: "Carpenter" }, { max: 36, craft: "Cooper" },
    { max: 37, craft: "Gem Cutter" }, { max: 39, craft: "Goldsmith" }, { max: 40, craft: "Gunsmith" },
    { max: 48, craft: "Potter" }, { max: 55, craft: "Shoemaker" }, { max: 64, craft: "Smith" },
    { max: 74, craft: "Tailor" }, { max: 84, craft: "Tanner" }, { max: 95, craft: "Vintner" },
    { max: 100, craft: "Weaponsmith" },
];

export const STRONGHOLD_CRAFTS = new Set(["Gem Cutter", "Goldsmith"]);

/** Table 3-6: Oddities, 1d10 — each entry is a self-contained flavor text, not a short name + separate description. */
export const ODDITIES_TABLE = [
    null,
    { oddity: "An absolutely honest trader in goods of dubious origin — buys for half the selling price, assesses as fairly as he can, and is reputed to have once tracked down a seller to give him extra money." },
    { oddity: "A big pile of excrement the locals worship as a God. Nobody can say why — \"it's just the way it's always been.\"" },
    { oddity: "A competent doctor, willing to work for far less than most medical professionals." },
    { oddity: "Entrance to a set of catacombs reputed to hold vast treasure. Most local businesses cater to adventurers on their way in — very few cater to those on their way out." },
    { oddity: "Home of the most beautiful women in the Borderlands — and some of the most bad-tempered men." },
    { oddity: "A weapon shop run by the local prince, prices 50% higher than normal (the prince takes the cut) — anyone caught using other weapons has his legs broken." },
    { oddity: "The only reliable well for miles around." },
    { oddity: "Pies made from a closely guarded recipe, absolutely wonderful — but they travel poorly and are best eaten fresh from the oven." },
    { oddity: "Site of an ancient battle between two wealthy armies — gold coins still work their way to the surface from time to time." },
    { oddity: "A tavern famous for having actual mattresses on the beds in its guest rooms." },
];

/**
 * Table 3-7: Settlement Special Features, 1d10. "Roll Twice" recurses into Table 3-2 again
 * (capped, same pattern as Princes' Secrets/Quirks — see rollCommunityFeatures in
 * generation/settlements.mjs); Cultists reuses Table 3-2's own Cultists description; Witch/
 * Wizard/Monster/Templars/Hospital/Magical Effect/Monastery are terminal, description-only.
 */
export const SPECIAL_FEATURES_TABLE = [
    null,
    { type: "RollTwice" }, { type: "RollTwice" }, { type: "Cultists" }, { type: "Hospital" },
    { type: "MagicalEffect" }, { type: "Monastery" }, { type: "Monster" }, { type: "Templars" },
    { type: "Witch" }, { type: "Wizard" },
];

/**
 * GM-facing placement text per tier — per the locked-in "journal-only, no scene placement"
 * decision (PLAN.md), the module never places settlements on the Geography scene itself
 * (there's no record of which grid cells belong to which prince's principality for the
 * book's boundary-dependent rules to check against), so this is included on every
 * settlement's journal entry for the GM to act on by hand.
 */
export const PLACEMENT_GUIDANCE = {
    town: "Place in a Fertile Valley if the principality has one; otherwise on a Tor; otherwise by a River, on Plains if possible or Hills if not; otherwise somewhere interesting.",
    village: "Place to fill any remaining Fertile Valleys first, then Tors, then the same kinds of places as a town — its features below may suggest a better spot, so it's fine to place it last.",
    homestead: "Usually a simple fortified home in the mountains, a swamp, or the edge of the badlands — in more hospitable terrain a village would appear instead.",
};

export const SPECIAL_FEATURE_DESCRIPTIONS = {
    "Hospital": "Runs a hospital, most likely staffed by Priestesses of Shallya, offering healing and shelter in return for donations — often vulnerable, and a common target for destruction in the Borderlands.",
    "MagicalEffect": "A persistent, non-dangerous magical effect in or near the settlement — may heal, please, strengthen, transmute, or simply show visions; people choose to live near it regardless.",
    "Monastery": "A monastery of one of the ascetic orders. Orders don't establish monasteries in centres of population — rolled for a town, it belongs to one of that principality's villages or homesteads instead.",
    "Monster": "Afflicted by a powerful individual monster with a particular interest in the settlement — often demanding tribute rather than simply raiding, and incidentally protecting it from other threats.",
    "Templars": "Home to highly trained, devout warriors of an established God (most often Myrmidia or Ulric) — always a Stronghold, since the order fortifies wherever it settles.",
    "Witch": "Home to a self-taught, unlicensed spellcaster who provides services to the community and is generally accepted — though vulnerable if Witch Hunters come calling.",
    "Wizard": "Home to a Wizard, usually a renegade or exiled Imperial Magister, accepted and defended by the community — some keep their presence secret, others advertise it to deter attackers.",
};
