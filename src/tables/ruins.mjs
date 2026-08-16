// Table 1-3: Ancient Ruins, 1-4: Ruin Type, 1-5: Ancient Menaces, 1-6: Age of Ruins,
// 1-7: Original Purpose of Ruins, 1-8: Reason for Ruins (Renegade Crowns, PDF pages
// 12-19). Cross-checked with `pdftotext -table`: every column of the 1-5 and 1-7
// matrices sums to exactly 100 (see PLAN.md), which confirms the transcription.

/** First entry whose `max` is >= roll, scanning in ascending order. */
export function lookupBand(table, roll) {
    return table.find(entry => roll <= entry.max);
}

export const RUIN_COUNT_TABLE = [ // Table 1-3
    { max: 10, count: 1 }, { max: 22, count: 2 }, { max: 34, count: 3 },
    { max: 47, count: 4 }, { max: 60, count: 5 }, { max: 72, count: 6 },
    { max: 83, count: 7 }, { max: 92, count: 8 }, { max: 98, count: 9 },
    { max: 100, count: 10 },
];

/** Table 1-4 — canonical type names, reused as keys in every table below. */
export const RUIN_TYPE_TABLE = [
    { max: 20, type: "Arabyan" }, { max: 30, type: "Chaos Cults" },
    { max: 45, type: "Dwarf" }, { max: 65, type: "Khemri" },
    { max: 90, type: "Recent Human" }, { max: 100, type: "Oddity" },
];

// Table 1-5, keyed by RUIN_TYPE_TABLE's `type`. Column headers in the book are
// shorthand ("Chaos", "Human", "Oddities") — normalized to the same keys as above.
export const ANCIENT_MENACES_TABLE = {
    "Arabyan": [{ max: 25, menace: "Daemon" }, { max: 55, menace: "Degenerate Tribe" }, { max: 75, menace: "Plague" }, { max: 85, menace: "Swarm" }, { max: 95, menace: "Undead" }, { max: 100, menace: "None" }],
    "Chaos Cults": [{ max: 20, menace: "Daemon" }, { max: 25, menace: "Degenerate Tribe" }, { max: 35, menace: "Golem" }, { max: 50, menace: "Plague" }, { max: 65, menace: "Swarm" }, { max: 85, menace: "Undead" }, { max: 95, menace: "Weapon" }, { max: 100, menace: "None" }],
    "Dwarf": [{ max: 5, menace: "Daemon" }, { max: 30, menace: "Golem" }, { max: 55, menace: "Plague" }, { max: 75, menace: "Swarm" }, { max: 95, menace: "Weapon" }, { max: 100, menace: "None" }],
    "Khemri": [{ max: 15, menace: "Daemon" }, { max: 40, menace: "Degenerate Tribe" }, { max: 50, menace: "Plague" }, { max: 60, menace: "Swarm" }, { max: 85, menace: "Undead" }, { max: 95, menace: "Weapon" }, { max: 100, menace: "None" }],
    "Recent Human": [{ max: 15, menace: "Daemon" }, { max: 40, menace: "Degenerate Tribe" }, { max: 60, menace: "Plague" }, { max: 70, menace: "Swarm" }, { max: 85, menace: "Undead" }, { max: 95, menace: "Weapon" }, { max: 100, menace: "None" }],
    "Oddity": [{ max: 15, menace: "Daemon" }, { max: 30, menace: "Degenerate Tribe" }, { max: 45, menace: "Golem" }, { max: 60, menace: "Plague" }, { max: 75, menace: "Swarm" }, { max: 80, menace: "Undead" }, { max: 95, menace: "Weapon" }, { max: 100, menace: "None" }],
};

/** Table 1-7 — no "Oddity" column; see rollOriginalPurpose in generation/ruins.mjs. */
export const ORIGINAL_PURPOSE_TABLE = {
    "Arabyan": [{ max: 30, purpose: "Fortress" }, { max: 60, purpose: "Outpost" }, { max: 70, purpose: "Settlement" }, { max: 90, purpose: "Temple" }, { max: 100, purpose: "Tomb" }],
    "Chaos Cults": [{ max: 20, purpose: "Fortress" }, { max: 25, purpose: "Outpost" }, { max: 30, purpose: "Settlement" }, { max: 80, purpose: "Temple" }, { max: 100, purpose: "Tomb" }],
    "Dwarf": [{ max: 25, purpose: "Fortress" }, { max: 60, purpose: "Outpost" }, { max: 80, purpose: "Settlement" }, { max: 90, purpose: "Temple" }, { max: 100, purpose: "Tomb" }],
    "Khemri": [{ max: 20, purpose: "Fortress" }, { max: 50, purpose: "Outpost" }, { max: 60, purpose: "Settlement" }, { max: 70, purpose: "Temple" }, { max: 100, purpose: "Tomb" }],
    "Recent Human": [{ max: 20, purpose: "Fortress" }, { max: 50, purpose: "Outpost" }, { max: 75, purpose: "Settlement" }, { max: 90, purpose: "Temple" }, { max: 100, purpose: "Tomb" }],
};

export const REASON_FOR_RUINS_TABLE = [ // Table 1-8, 1d10
    null,
    { reason: "Civil War" }, { reason: "Enigma" }, { reason: "Famine" }, { reason: "Magic" },
    { reason: "Military Attack" }, { reason: "Natural Decay" }, { reason: "Natural Disaster" },
    { reason: "Plague" }, { reason: "Policy" }, { reason: "Resource Loss" },
];

/** Table 1-6 — reference bands, not a d100 roll (the book says to choose, not roll). */
export const AGE_OF_RUINS_TABLE = [
    { period: "Dawn of Time", yearsAgoMin: 3000, yearsAgoMax: 5000, validTypes: ["Dwarf", "Oddity"] },
    { period: "Ancient Wars", yearsAgoMin: 1500, yearsAgoMax: 3000, validTypes: ["Chaos Cults", "Dwarf", "Khemri", "Oddity"] },
    { period: "Historical", yearsAgoMin: 300, yearsAgoMax: 1500, validTypes: ["Arabyan", "Chaos Cults", "Dwarf", "Khemri", "Oddity"] },
    { period: "Old", yearsAgoMin: 100, yearsAgoMax: 300, validTypes: ["Arabyan", "Chaos Cults", "Dwarf", "Recent Human", "Oddity"] },
    { period: "Recent", yearsAgoMin: 0, yearsAgoMax: 100, validTypes: ["Chaos Cults", "Recent Human", "Oddity"] },
];

/** Short GM-facing reference text, paraphrased from the book — one paragraph per ruin, not per table row. */
export const RUIN_TYPE_DESCRIPTIONS = {
    "Arabyan": "Human-built remains from the Sultan of Araby's old invasions of the Old World — domed roofs, onion arches, brick construction, abstract (not Chaos) decoration.",
    "Chaos Cults": "Former strongholds of Ruinous Powers cultists, almost always hidden — mostly underground, occasionally in isolated valleys, badlands, or swamps.",
    "Dwarf": "Outposts and holds of a once-larger Dwarf presence — always underground, extremely well-built and usually in excellent condition unless deliberately wrecked.",
    "Khemri": "Monumental remains of the ancient Nehekharan (Khemri) civilisation — massive stonework, sometimes a visible pyramid, maze-like floor plans with old traps.",
    "Recent Human": "The most common ruin type — recently abandoned or destroyed human settlements, almost always above ground and usually not worth marking unless something of note remains.",
    "Oddity": "Anything that doesn't fit the other categories — Greenskin structures, eccentric wizard's towers, heretical temples, or things stranger still (stone circles, barrow mounds, out-of-place ruins).",
};

export const MENACE_DESCRIPTIONS = {
    "Daemon": "A Chaos daemon bound in place — the nature and strength of the binding (and how easily it can be broken) matters as much as the daemon itself.",
    "Degenerate Tribe": "Inbred descendants of the original inhabitants, cut off from the outside world and only dimly understanding the ruin they live in.",
    "Golem": "A self-moving magical construct, usually built to guard the site; whether it can be controlled depends on how its command method survived.",
    "Plague": "A disease trapped in the ruin for centuries, released when it's disturbed — may or may not still be contagious.",
    "Swarm": "A mass of small dangerous creatures too numerous to fight one at a time — has to be isolated, contained, or destroyed at its source.",
    "Undead": "Mindless Undead are just obstacles; intelligent Undead have their own plans and may be negotiated with (or feared far more).",
    "Weapon": "A powerful magic weapon whose mere existence draws every prince and hopeful conqueror in the region toward the ruin.",
    "None": "No ancient menace remains — the ruin may still hold treasure or history, but nothing dangerous lurks there.",
};

export const PURPOSE_DESCRIPTIONS = {
    "Fortress": "A military stronghold — spartan, heavily fortified, supplied from elsewhere rather than self-sufficient.",
    "Outpost": "A fortified, self-sufficient foothold in hostile territory, built for colonisation or to guard a trade route.",
    "Settlement": "A farmstead, village, town, or city — defended, but built more for daily life than for war.",
    "Temple": "A place of worship, built solidly enough to often survive as a ruin; larger ones housed priests and attendants too.",
    "Tomb": "A resting place for the dead, sometimes elaborate — usually sealed with no intent to be reopened.",
};

export const REASON_DESCRIPTIONS = {
    "Civil War": "Internal factions fought each other — no external enemy, so remains tend to look like one uniform 'side.'",
    "Enigma": "No corpses, no clear cause — belongings left behind as if everyone simply vanished.",
    "Famine": "The population starved — orderly remains, empty food stores, valuables likely taken by those who left in time.",
    "Magic": "Destruction came directly from magic, with clear supernatural evidence (petrification, transmutation, etc.) — otherwise it's an Enigma instead.",
    "Military Attack": "Defeated by an outside force — expect battle damage and remains from both sides.",
    "Natural Decay": "A slow decline as the population lost the resources or skills to sustain the site, shrinking until only ruins were left.",
    "Natural Disaster": "Sudden destruction by flood, earthquake, fire, eruption, or similar — most belongings remain, buried or damaged.",
    "Plague": "Disease wiped out or scattered the population — may look like Civil War damage but without battle-related wounds.",
    "Policy": "Deliberately abandoned — too remote to sustain, or evacuated ahead of an expected failure; usually stripped of portables.",
    "Resource Loss": "A key resource (a mine, water source, trade river) was suddenly lost, triggering a fast exodus and slow decline of stragglers.",
};
