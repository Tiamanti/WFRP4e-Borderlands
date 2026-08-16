// Tables 4-1 through 4-12: Number of Lairs, Types of Monsters, and each monster type's own
// cascade (Renegade Crowns, PDF pages 58-65). Cross-checked with `pdftotext -table`, which
// corrected one real `-layout` misalignment — Table 4-8's Giant column — and confirmed
// every other table read cleanly.

import { lookupBand } from "./ruins.mjs";

export { lookupBand };

/** Table 4-1: Number of Lairs, 1d10 banded, one column per GM-chosen campaign style. */
export const NUMBER_OF_LAIRS_TABLE = [
    { max: 1, few: 1, moderate: 5, many: 10 },
    { max: 3, few: 2, moderate: 6, many: 12 },
    { max: 6, few: 3, moderate: 8, many: 15 },
    { max: 8, few: 4, moderate: 10, many: 18 },
    { max: 9, few: 5, moderate: 11, many: 20 },
    { max: 10, few: 6, moderate: 12, many: 22 },
];

/**
 * "Placing Lairs" (book, page 64) is explicit that no random table could sensibly place a
 * lair without knowledge of the mapped area — the module never places lairs on the scene at
 * all (per PLAN.md's locked-in "journal-only" decision), so this is included on every lair's
 * journal page as GM-facing text instead.
 */
export const PLACEMENT_GUIDANCE = "If this lair has a particular relationship with a community, place it within 1-2 squares of that community (a pure raider can be 3-4 squares out). A lair that keeps to itself should go a couple of squares into difficult terrain, away from any settlement — its isolation may be exactly why it keeps to itself. Avoid placing a lair that would rule a settlement inside an existing principality, unless a state of war with that prince is what you want.";

/**
 * Table 4-2: Types of Monsters, 1d10 banded. House-ruled per direction: the book's own bands
 * are 1-2 Chaos, 3-7 Greenskin, 8 Monster, 9-10 Undead (confirmed via `pdftotext -table`) —
 * Monster's single-roll (8) chance was judged too rare, so Greenskin was narrowed to 3-5 and
 * Monster widened to 6-8, leaving Chaos/Undead untouched.
 */
export const MONSTER_TYPE_TABLE = [
    { max: 2, type: "Chaos" }, { max: 5, type: "Greenskin" },
    { max: 8, type: "Monster" }, { max: 10, type: "Undead" },
];

// --- Chaos branch (Tables 4-3, 4-4, 4-5) ---

/**
 * Table 4-3: Number of Chaos Creatures, 1d10 direct row lookup (not banded). Row 1 (count 1,
 * `rollFollowers: false`) means a solo leader with no Table 4-5 roll at all. Every other row
 * gives `leaderModifier` (added to the Table 4-4 roll) and `followerModifier` — Table 4-5's
 * own row is this value directly (`min(5, 1 + followerModifier)`, its own "5+" notation is
 * that cap), not an independently-rolled die — see rollChaosLair in generation/hazards.mjs.
 */
export const CHAOS_CREATURE_COUNT_TABLE = [
    null,
    { count: 1, leaderModifier: 0, rollFollowers: false },
    { count: 5, leaderModifier: 5, followerModifier: 0 },
    { count: 10, leaderModifier: 10, followerModifier: 1 },
    { count: 20, leaderModifier: 15, followerModifier: 2 },
    { count: 30, leaderModifier: 20, followerModifier: 3 },
    { count: 50, leaderModifier: 20, followerModifier: 4 },
    { count: 75, leaderModifier: 20, followerModifier: 4 },
    { count: 100, leaderModifier: 20, followerModifier: 4 },
    { count: 150, leaderModifier: 20, followerModifier: 4 },
    { count: 200, leaderModifier: 20, followerModifier: 4 },
];

/**
 * Table 4-4: Leader of Chaos Creatures, d100 + Table 4-3's `leaderModifier` — the modifier
 * can push the total as high as 120, so this table's own bands run past 100.
 */
export const CHAOS_LEADER_TABLE = [
    { max: 5, leader: "Daemon" }, { max: 10, leader: "Chaos Warrior" }, { max: 11, leader: "Minotaur" },
    { max: 35, leader: "Mutant" }, { max: 65, leader: "Gor (Beastman)" }, { max: 100, leader: "Bestigor (Beastman)" },
    { max: 105, leader: "Chaos Warrior" }, { max: 110, leader: "Minotaur" }, { max: 120, leader: "Daemon" },
];

/** Table 4-5's column for each Table 4-4 leader — Gor and Bestigor (both Beastman subtypes) share the "Beastman" column. */
export const CHAOS_LEADER_COLUMNS = {
    "Daemon": "Daemon", "Chaos Warrior": "Chaos Warrior", "Minotaur": "Minotaur",
    "Mutant": "Mutant", "Gor (Beastman)": "Beastman", "Bestigor (Beastman)": "Beastman",
};

/** Table 4-5: Chaos Followers — row picked directly by Table 4-3's followerModifier (see CHAOS_CREATURE_COUNT_TABLE), not an independent roll. */
export const CHAOS_FOLLOWERS_TABLE = [
    null,
    { "Beastman": "Beastmen", "Daemon": "Daemons", "Chaos Warrior": "Chaos Warriors", "Minotaur": "Minotaurs", "Mutant": "Mutants" },
    { "Beastman": "Beastmen", "Daemon": "Daemons", "Chaos Warrior": "Chaos Warriors", "Minotaur": "Minotaurs", "Mutant": "Mutants" },
    { "Beastman": "Beastmen and Mutants", "Daemon": "Mutants", "Chaos Warrior": "Chaos Warriors", "Minotaur": "Beastmen", "Mutant": "Mutants and Beastmen" },
    { "Beastman": "Beastmen", "Daemon": "Mutants", "Chaos Warrior": "Beastmen", "Minotaur": "Beastmen", "Mutant": "Mutants" },
    { "Beastman": "Beastmen and Mutants", "Daemon": "Beastmen and Mutants", "Chaos Warrior": "Beastmen", "Minotaur": "Beastmen", "Mutant": "Mutants" },
];

export const CHAOS_LEADER_DESCRIPTIONS = {
    "Daemon": "Chaos incarnate, purest servant of the Ruinous Powers — their goals follow from whichever God they serve (Khorne raids for blood, Tzeentch schemes for rulership and traps knowledge-seekers, Slaanesh seeks rulership to indulge subjects in ever-greater excess, Nurgle raids subtly by spreading plague).",
    "Chaos Warrior": "A former Human elite warrior, wholly open about serving the Dark Gods. Either a raider or seeks rulership (roll separately) — Khorne/Nurgle followers lean raider, Slaanesh/Tzeentch lean rulership, with exceptions either way.",
    "Minotaur": "Tasked by the Dark Gods with guarding a specific location (a Chaos shrine, a tomb, occasionally something useful against Greenskins) — raids only enough to feed, careful not to draw organised reprisals.",
    "Mutant": "Former Humans, as varied in motivation as Humans themselves — small groups usually just want to worship in peace; larger ones may dream of ruling those who scorn them, with mixed Beastman/Mutant groups usually raiding.",
    "Gor (Beastman)": "The common rank-and-file of a Beastman warband — aggressive raiders, uninterested in settled rulership, sometimes tolerating a few Mutants in an inferior role.",
    "Bestigor (Beastman)": "An elite, heavily-armoured Beastman — leads or reinforces a warband with the same raiding aims as ordinary Gors, just with more muscle behind them.",
};

// --- Greenskin branch (Table 4-6) ---

/** Table 4-6: Greenskin Numbers, 1d10 direct row lookup (not banded) per column — roll once per column independently. */
export const GREENSKIN_NUMBERS_TABLE = [
    null,
    { "Snotlings": 0, "Goblins": 0, "Trolls": 0, "Common Orcs": 0, "Black Orcs": 0 },
    { "Snotlings": 10, "Goblins": 5, "Trolls": 0, "Common Orcs": 5, "Black Orcs": 0 },
    { "Snotlings": 25, "Goblins": 10, "Trolls": 0, "Common Orcs": 10, "Black Orcs": 0 },
    { "Snotlings": 100, "Goblins": 25, "Trolls": 0, "Common Orcs": 25, "Black Orcs": 1 },
    { "Snotlings": 150, "Goblins": 50, "Trolls": 0, "Common Orcs": 50, "Black Orcs": 2 },
    { "Snotlings": 250, "Goblins": 100, "Trolls": 1, "Common Orcs": 100, "Black Orcs": 5 },
    { "Snotlings": 500, "Goblins": 250, "Trolls": 2, "Common Orcs": 250, "Black Orcs": 10 },
    { "Snotlings": 750, "Goblins": 500, "Trolls": 5, "Common Orcs": 500, "Black Orcs": 20 },
    { "Snotlings": 1000, "Goblins": 750, "Trolls": 10, "Common Orcs": 750, "Black Orcs": 30 },
    { "Snotlings": 1000, "Goblins": 1000, "Trolls": 20, "Common Orcs": 1000, "Black Orcs": 50 },
];

/** Left-to-right column order — the leader is a member of whichever column, scanning right-to-left, is the first with a nonzero count. */
export const GREENSKIN_COLUMNS = ["Snotlings", "Goblins", "Trolls", "Common Orcs", "Black Orcs"];

// --- Monster branch (Tables 4-7, 4-8) ---

/** Table 4-7: Monster Type, 1d10 banded. */
export const MONSTER_TABLE = [
    { max: 2, monster: "Giant" }, { max: 3, monster: "Great Eagle" }, { max: 4, monster: "Griffon" },
    { max: 6, monster: "Hippogriff" }, { max: 7, monster: "Hydra" }, { max: 8, monster: "Jabberwock" },
    { max: 9, monster: "Manticore" }, { max: 10, monster: "Wyvern" },
];

/**
 * Table 4-8: Monster Attitude, 1d10 banded per monster type — a monster type simply doesn't
 * have bands for an attitude the book marks "--" (e.g. Griffons never Guardian or Tribute),
 * not a gap to fill in.
 */
export const MONSTER_ATTITUDE_TABLE = {
    "Giant": [{ max: 1, attitude: "Guardian" }, { max: 8, attitude: "Raider" }, { max: 10, attitude: "Reclusive" }],
    "Great Eagle": [{ max: 2, attitude: "Guardian" }, { max: 4, attitude: "Raider" }, { max: 9, attitude: "Reclusive" }, { max: 10, attitude: "Tribute" }],
    "Griffon": [{ max: 7, attitude: "Raider" }, { max: 10, attitude: "Reclusive" }],
    "Hippogriff": [{ max: 7, attitude: "Raider" }, { max: 10, attitude: "Reclusive" }],
    "Hydra": [{ max: 1, attitude: "Guardian" }, { max: 6, attitude: "Raider" }, { max: 9, attitude: "Reclusive" }, { max: 10, attitude: "Tribute" }],
    "Jabberwock": [{ max: 7, attitude: "Raider" }, { max: 10, attitude: "Reclusive" }],
    "Manticore": [{ max: 1, attitude: "Guardian" }, { max: 7, attitude: "Raider" }, { max: 9, attitude: "Reclusive" }, { max: 10, attitude: "Tribute" }],
    "Wyvern": [{ max: 1, attitude: "Guardian" }, { max: 7, attitude: "Raider" }, { max: 9, attitude: "Reclusive" }, { max: 10, attitude: "Tribute" }],
};

export const MONSTER_DESCRIPTIONS = {
    "Giant": "Sometimes solitary, generally in small groups — rarely hostile, mostly raiding for food; can become allies with a lot of patience and care.",
    "Great Eagle": "Usually a small family group — intelligent enough to form relationships with locals, though most keep to themselves; inspires respect more than fear.",
    "Griffon": "Lairs alone, too aggressive to sustain a group — little more intelligent than an animal, mostly a nuisance to nearby settlements (carrying off livestock and people), though a few are reclusive.",
    "Hippogriff": "Fills the same niche as a Griffon and behaves the same way.",
    "Hydra": "Little more intelligent than an animal but less mindlessly aggressive than a Griffon — occasionally bribed to leave a village alone, though it rarely lasts since Hydras get greedy. Always lairs alone.",
    "Jabberwock": "Fills the same niche as a Hippogriff.",
    "Manticore": "Behaves much like a Hydra — would rather kill another Manticore than talk to it, so it almost always lairs alone.",
    "Wyvern": "The favoured steed of Orc champions — a bit more intelligent than a Hydra or Manticore, occasionally forming a stable relationship with a Human settlement. Usually lairs alone, but roll a 9 or 10 on 1d10 for a pair.",
};

export const MONSTER_ATTITUDE_DESCRIPTIONS = {
    "Guardian": "Guards something — treasure, something dangerous, or something merely symbolic — and drives off or destroys those who threaten it rather than seeking out the wider world.",
    "Raider": "Attacks the surrounding area for food or treasure, seemingly at random (though the more intelligent monsters have some strategy behind it) — an obvious, ongoing threat.",
    "Reclusive": "Keeps to itself, attacking only those who enter its territory — a known, generally avoidable hazard, unless its territory holds something people want.",
    "Tribute": "Demands tribute (livestock, sometimes worse) in return for leaving local communities alone — whether the community is content with the arrangement depends entirely on what it demands.",
};

// --- Undead branch (Tables 4-9..4-12) ---

/** Table 4-9: Undead Class, 1d10 banded. */
export const UNDEAD_CLASS_TABLE = [
    { max: 2, undeadClass: "Dead Lord" }, { max: 5, undeadClass: "Lone Menace" }, { max: 10, undeadClass: "Shambling Horde" },
];

/** Table 4-10: Dead Lords, 1d10 banded. */
export const DEAD_LORD_TABLE = [
    { max: 4, type: "Mummy" }, { max: 5, type: "Vampire (Blood Dragon)" },
    { max: 6, type: "Vampire (von Carstein Exile)" }, { max: 8, type: "Vampire (Necrarch)" },
    { max: 10, type: "Vampire (Strigoi)" },
];

export const DEAD_LORD_DESCRIPTIONS = {
    "Mummy": "An intelligent, strong-willed Undead lord, almost always tied to an ancient tomb — commands servants and has its own long-term plans, not just waiting to be fought.",
    "Vampire (Blood Dragon)": "A Vampire bloodline built around martial prowess and honour — often surprisingly forthright about its nature, valuing combat prestige.",
    "Vampire (von Carstein Exile)": "A Vampire of the line that once ruled Sylvania — schemers with an eye toward rebuilding lost power, wherever they've ended up.",
    "Vampire (Necrarch)": "A Vampire bloodline obsessed with necromantic scholarship — more interested in dark magic and undeath itself than in courtly intrigue.",
    "Vampire (Strigoi)": "A degenerate, feral Vampire bloodline — closer to a monster than the other bloodlines' courtly pretensions, driven by hunger more than plans.",
};

/** Table 4-11: Lone Menaces, 1d10 banded. */
export const LONE_MENACE_TABLE = [
    { max: 1, menace: "Banshee" }, { max: 3, menace: "Spectre" }, { max: 7, menace: "Wight" }, { max: 10, menace: "Wraith" },
];

export const LONE_MENACE_DESCRIPTIONS = {
    "Banshee": "A tormented spirit whose wail alone can kill — driven by grief or rage rather than any long-term plan.",
    "Spectre": "An incorporeal, hate-filled Undead — passes through walls and armour alike, menacing whoever disturbs its rest.",
    "Wight": "A once-mighty warrior risen as Undead, still wielding weapons and armour with deadly skill.",
    "Wraith": "A powerful incorporeal Undead, colder and more calculating than a Spectre but just as driven by its own singular grievance.",
};

/** Table 4-12's "First Roll" row: which column a Shambling Horde starts on. */
export const SHAMBLING_HORDE_START_TABLE = [
    { max: 2, column: "Dire Wolves" }, { max: 5, column: "Skeletons" },
    { max: 7, column: "Vampire Bats" }, { max: 10, column: "Zombies" },
];

/** Wrap-around order for Table 4-12's four columns — see rollShamblingHorde in generation/hazards.mjs. */
export const SHAMBLING_HORDE_COLUMNS = ["Dire Wolves", "Skeletons", "Vampire Bats", "Zombies"];

/**
 * Table 4-12's main body: one row per banded roll (1 or less .. 10+), giving a headcount per
 * column plus a cumulative `modifierDelta` to the *next* roll (shared across all 4 rolls in
 * one horde, same "resets per horde, not within one" shape as Settlements' Table 3-2).
 */
export const SHAMBLING_HORDE_TABLE = [
    { max: 1, "Dire Wolves": 0, "Skeletons": 0, "Vampire Bats": 0, "Zombies": 0, modifierDelta: 3 },
    { max: 2, "Dire Wolves": 2, "Skeletons": 3, "Vampire Bats": 1, "Zombies": 4, modifierDelta: 2 },
    { max: 3, "Dire Wolves": 4, "Skeletons": 6, "Vampire Bats": 2, "Zombies": 8, modifierDelta: 1 },
    { max: 4, "Dire Wolves": 10, "Skeletons": 15, "Vampire Bats": 5, "Zombies": 20, modifierDelta: 0 },
    { max: 5, "Dire Wolves": 15, "Skeletons": 22, "Vampire Bats": 8, "Zombies": 30, modifierDelta: 0 },
    { max: 6, "Dire Wolves": 20, "Skeletons": 30, "Vampire Bats": 10, "Zombies": 40, modifierDelta: 0 },
    { max: 7, "Dire Wolves": 30, "Skeletons": 40, "Vampire Bats": 20, "Zombies": 50, modifierDelta: 0 },
    { max: 8, "Dire Wolves": 50, "Skeletons": 60, "Vampire Bats": 40, "Zombies": 75, modifierDelta: -1 },
    { max: 9, "Dire Wolves": 70, "Skeletons": 80, "Vampire Bats": 50, "Zombies": 90, modifierDelta: -2 },
    { max: Infinity, "Dire Wolves": 100, "Skeletons": 120, "Vampire Bats": 75, "Zombies": 125, modifierDelta: -3 },
];
