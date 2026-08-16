// Tables 2-1 through 2-11 (Renegade Crowns, PDF pages 21-35), transcribed with
// `pdftotext -table` and cross-checked against `-layout` (both agreed on every band except
// Table 2-11 — see below). Table 2-1's 7 example statblocks are hand-converted to 4e here,
// once, using Conversion_Rules.pdf (PDF pages 3-13, also `-table`-verified) purely as a
// lookup aid during this transcription — see PLAN.md's Princes phase design for why this
// isn't a runtime lookup engine. Where the source has no clean 2e->4e equivalent (or the
// two source PDFs disagree with each other), the deviation and reasoning are commented
// inline rather than silently guessed at.

import { lookupBand } from "./ruins.mjs";

/** Shared naming convention for a rolled prince — used for the Actor's name and later phases' journal links back to it (e.g. Relationships). */
export function princeDisplayName(prince) {
    return `${prince.title} (${prince.type})`;
}

/** Table 2-1: Type of Prince. */
export const PRINCE_TYPE_TABLE = [
    { max: 30, type: "Bandit" }, { max: 50, type: "Knight" }, { max: 85, type: "Mercenary" },
    { max: 90, type: "Merchant" }, { max: 94, type: "Politician" }, { max: 98, type: "Priest" },
    { max: 100, type: "Wizard" },
];

/**
 * Table 2-1's example statblocks, keyed by `PRINCE_TYPE_TABLE`'s `type`. `characteristics`
 * are already the 4e Human-baseline value — for Human, 2nd Edition -> 4th Edition is
 * "Remain the Same" for all eight of WS/BS/S/T/Agi/Int/WP/Fel (Conversion_Rules.pdf PDF
 * page 3), so the book's printed 2e number *is* the 4e number, a direct transcription. `m`
 * (Movement) is like ise unconverted — all seven Table 2-1 statblocks print Movement 4.
 * Initiative and Dexterity aren't here at all: 2e has neither, both are "Generate New
 * Stats" regardless of race (see race-conversion.mjs), rolled fresh at actor-creation time.
 *
 * `career`/`skills`/`talents` are already 4e names, hand-converted once from the book's 2e
 * example using Conversion_Rules.pdf's Career/Skill/Talent tables. Compound 2e->4e
 * conversions (one 2e Skill/Talent becoming a different 4e Skill *plus* a Talent, e.g.
 * Scale Sheer Surface -> Climb skill + Scale Sheer Surface talent) are already split across
 * `skills`/`talents` below. Duplicate skills created by a compound conversion landing on a
 * skill the statblock already had (e.g. Blather -> Charm, when Charm is already listed) are
 * merged — the Talent half is kept, the redundant Skill isn't listed twice.
 * `guidanceNotes` holds the handful of 2e Skills/Talents with no clean 4e Item at all
 * (Conversion_Rules.pdf's own guidance-text fallback, e.g. Meditation, Lightning Parry) —
 * these become biography text on the generated Actor instead of Items.
 */
export const PRINCE_TYPES = {
    Bandit: {
        characteristics: { ws: 54, bs: 65, s: 47, t: 56, agi: 46, int: 37, wp: 46, fel: 47, m: 4 },
        career: { career: "Outlaw", tier: 3, level: "Outlaw Chief" },
        priorCareers: ["Soldier — Tier 2: Veteran", "Outlaw — Tier 1: Brigand"],
        skills: [
            "Lore (Strategy/Tactics)", "Animal Care", "Leadership", "Lore (The Border Princes)",
            "Stealth", "Consume Alcohol", "Dodge +10%", "Track", "Gamble", "Gossip", "Intimidate",
            "Perception +10%", "Ride", "Climb", "Language (Battle Tongue)", "Language (Thieves' Tongue)",
            "Set Trap", "Ranged (Longbow)", "Melee (Two-Handed)",
        ],
        // Concealment and Silent Move both convert to Stealth (merged, above); Scale Sheer
        // Surface's compound conversion (Climb skill + Scale Sheer Surface talent) below.
        talents: [
            "Accurate Shot", "Fast Shot", "Rapid Reload", "Rover", "Sharpshooter", "Sure Shot",
            "Very Resilient", "Very Strong", "Scale Sheer Surface",
        ],
        guidanceNotes: [
            "Secret Signs (Thief) has no official 4e conversion — consider a custom Language (Thieves' Cant) or an extra Stealth specialisation instead.",
            "Lightning Parry has no direct 4e Talent (4e's core rules don't cap defensive actions the way 2e did) — consider the Riposte Talent or the Melee (Parry) skill with a Defensive-quality weapon instead.",
        ],
        armour: "Medium Armour (Sleeved Mail Shirt and Leather Jack) — AP Head 0, Arms 3, Body 3, Legs 0",
        weapons: "Hand Weapon (Sword), Longbow with 10 Arrows",
        trappings: "Band of Outlaws",
    },
    Knight: {
        characteristics: { ws: 58, bs: 42, s: 49, t: 48, agi: 41, int: 46, wp: 48, fel: 65, m: 4 },
        career: { career: "Noble", tier: 4, level: "Noble Lord" },
        priorCareers: ["Knight — Tier 1: Squire", "Knight — Tier 2: Knight"],
        skills: [
            "Lore (Genealogy/Heraldry)", "Lore (Strategy/Tactics)", "Animal Care", "Animal Training",
            "Charm +10%", "Leadership", "Lore (the Border Princes)", "Dodge +10%", "Evaluate", "Gossip",
            "Perception +10%", "Ride +10%", "Language (Battle Tongue)", "Language (Breton)",
            "Language (Classical)", "Language (Reikspiel)", "Language (Tilean)",
            "Melee (Fencing)", "Melee (Flail)", "Melee (Two-Handed)",
        ],
        talents: ["Etiquette (Nobles)", "Master Orator", "Public Speaking", "Strike Mighty Blow", "Read/Write"],
        guidanceNotes: [
            "Specialist Weapon Group (Cavalry) has no 4e weapon-group skill equivalent (Cavalry isn't a weapon type in 4e) — consider the Ride skill or riding-specific Talents instead.",
        ],
        armour: "Heavy Armour (Full Plate) — AP Head 5, Arms 5, Body 5, Legs 5",
        weapons: "Hand Weapon (Sword), Lance, Flail, Great Hammer",
        trappings: "Warhorse with Chain Barding",
    },
    Mercenary: {
        characteristics: { ws: 67, bs: 50, s: 58, t: 50, agi: 52, int: 40, wp: 45, fel: 56, m: 4 },
        career: { career: "Soldier", tier: 4, level: "Officer" },
        priorCareers: ["Soldier — Tier 1: Recruit", "Soldier — Tier 3: Sergeant"],
        skills: [
            "Lore (Strategy/Tactics)", "Animal Care", "Leadership +10%", "Lore (the Border Princes)",
            "Lore (the Empire)", "Lore (Tilea)", "Dodge +20%", "Gossip", "Intimidate", "Perception",
            "Ride", "Language (Battle Tongue)", "Language (Tilean)", "Swim",
            "Melee (Flail)", "Melee (Two-Handed)", "Melee (Brawling)",
        ],
        talents: ["Menacing", "Fast Shot", "Strike Mighty Blow", "Strike to Stun", "Read/Write"],
        guidanceNotes: [
            "Lightning Parry has no direct 4e Talent — consider the Riposte Talent or the Melee (Parry) skill with a Defensive-quality weapon instead.",
        ],
        armour: "Heavy Armour (Full Plate) — AP Head 5, Arms 5, Body 5, Legs 5",
        weapons: "Flail, Great Sword, Hand Weapon (Sword)",
        trappings: "Unit of Troops",
    },
    Merchant: {
        characteristics: { ws: 34, bs: 40, s: 39, t: 34, agi: 41, int: 67, wp: 55, fel: 53, m: 4 },
        career: { career: "Townsman", tier: 4, level: "Burgomeister" },
        priorCareers: ["Artisan — Tier 1: Apprentice Artisan", "Merchant — Tier 2: Merchant"],
        skills: [
            "Lore (Genealogy/Heraldry)", "Lore (Law)", "Charm +10%", "Leadership", "Lore (the Border Princes)",
            "Lore (the Empire)", "Drive", "Evaluate +20%", "Gossip", "Haggle +20%", "Perception",
            "Perform (Actor)", "Ride", "Language (Guild Tongue)", "Language (Breton)", "Language (Reikspiel)",
            "Trade (Cook)", "Trade (Merchant) +10%",
        ],
        // Blather converts to Charm (already listed via Charm +10%) plus a Blather talent — see below.
        talents: ["Dealmaker", "Master Orator", "Public Speaking", "Savvy", "Schemer", "Etiquette (Criminals)", "Super Numerate", "Blather", "Read/Write"],
        guidanceNotes: [],
        armour: "None",
        weapons: "Hand Weapon (Sword)",
        trappings: "2000 gc capital, Trade Goods worth at least 2000 gc",
    },
    Politician: {
        characteristics: { ws: 56, bs: 42, s: 37, t: 39, agi: 37, int: 55, wp: 54, fel: 70, m: 4 },
        career: { career: "Noble", tier: 4, level: "Noble Lord" },
        priorCareers: ["Bailiff — Tier 1: Tax Collector", "Townsman — Tier 4: Burgomeister"],
        skills: [
            "Lore (Genealogy/Heraldry)", "Lore (History)", "Lore (Law) +10%", "Lore (Strategy/Tactics)",
            "Charm +20%", "Leadership +20%", "Lore (the Border Princes) +10%", "Evaluate", "Gossip",
            "Haggle", "Intimidate", "Perception", "Perform (Actor)", "Ride", "Language (Classical)",
            "Language (Reikspiel)", "Melee (Fencing)",
        ],
        talents: ["Etiquette (Nobles)", "Master Orator", "Public Speaking", "Schemer", "Etiquette (Criminals)", "Blather", "Read/Write"],
        guidanceNotes: [],
        armour: "None",
        weapons: "Foil",
        trappings: "Winning Smile",
    },
    Priest: {
        characteristics: { ws: 55, bs: 42, s: 46, t: 47, agi: 50, int: 48, wp: 64, fel: 50, m: 4 },
        // Conversion_Rules.pdf literally prints "Anointed Priest -> Priest -- Tier 1: Priest",
        // but that collides with the Basic table's own "Initiate -> Priest -- Tier 1: Initiate"
        // (two different 2e careers both claiming Tier 1) and contradicts the statblock's own
        // chain ("ex-Initiate, ex-Priest" implies Anointed Priest comes *after* both). Corrected
        // to Tier 3: High Priest, following the natural Initiate(T1) -> Priest(T2) -> High
        // Priest(T3) progression the book's own career chain and the "Priest" 2e entry
        // ("Priest -> Priest -- Tier 2: Priest") both imply.
        career: { career: "Priest", tier: 3, level: "High Priest" },
        priorCareers: ["Priest — Tier 1: Initiate", "Priest — Tier 2: Priest"],
        skills: [
            "Lore (Astronomy)", "Lore (Strategy/Tactics)", "Lore (Theology) +10%", "Channelling +10%",
            "Charm", "Lore (the Border Princes)", "Lore (the Empire)", "Gossip", "Heal +10%", "Intuition",
            "Perception", "Ride", "Language (Magick)", "Language (Classical)", "Language (Reikspiel)",
        ],
        talents: [
            "Aethyric Attunement", "Invoke", "Lightning Reflexes", "Master Orator", "Petty Magic (Divine)",
            "Public Speaking", "Seasoned Traveller", "Strike to Stun", "Warrior Born", "Magical Sense", "Read/Write",
        ],
        guidanceNotes: [
            "Divine Lore (one) converted to a generic Invoke Talent — pick a specific Prayer/Lore focus for this Priest.",
            "Armoured Caster is no longer a standard 4e Talent — consider keeping it as a house rule to ignore Repelling the Winds penalties, if desired.",
            "Lesser Magic (Aethyric Armour) and Lesser Magic (Blessed Weapon) have no clean 4e equivalent for a Divine caster — omitted as Items.",
            "Add the patron deity's Cult Skills and Talents (WFRP4e core rulebook, Religion & Belief) once a specific God is chosen for this Priest.",
        ],
        armour: "Medium Armour (Full Chain Mail) — AP Head 3, Arms 3, Body 3, Legs 3",
        weapons: "Hand Weapon (as appropriate)",
        trappings: "",
    },
    Wizard: {
        characteristics: { ws: 34, bs: 39, s: 26, t: 40, agi: 42, int: 69, wp: 76, fel: 41, m: 4 },
        career: { career: "Wizard", tier: 3, level: "Master Wizard" },
        priorCareers: ["Wizard — Tier 1: Wizard's Apprentice", "Wizard — Tier 2: Wizard"],
        skills: [
            "Lore (History)", "Lore (Magic) +20%", "Lore (Strategy/Tactics)", "Channelling +20%", "Charm",
            "Lore (the Border Princes)", "Lore (the Empire)", "Gossip", "Intimidate", "Intuition +20%",
            "Perception", "Ride", "Language (Arcane Elf)", "Language (Magic)", "Language (Breton)",
            "Language (Classical)", "Language (Reikspiel)", "Language (Tilean)",
        ],
        // Search converts to Perception, already listed — merged, not duplicated.
        talents: [
            "Aethyric Attunement", "Arcane Magic (Aethyric Armour)", "Arcane Magic (Blessed Weapon)",
            "Fast Hands", "Accurate Shot", "Petty Magic (Arcane)", "Savvy", "Strong-minded",
            "Very Resilient", "Magical Sense", "Read/Write",
        ],
        guidanceNotes: [
            "Arcane Lore (any one) converted to a generic Arcane Magic Talent — pick a specific magic Lore/college for this Wizard.",
            "Meditation has no official 4e ritual-magic rules — consider extra Channelling advances instead.",
            "Add the skill for the appropriate Arcane Lore at +10% once a specific college is chosen (per the book's own note).",
        ],
        armour: "None",
        weapons: "Hand Weapon (as appropriate)",
        trappings: "",
    },
};

/** Table 2-2: Princely Races. The 5 Human cultural flavours all normalize to "Human" for characteristic conversion — see race-conversion.mjs's normalizeRace. */
export const RACE_TABLE = [
    { max: 8, race: "Dwarf" }, { max: 9, race: "Elf" }, { max: 10, race: "Halfling" },
    { max: 40, race: "Human—Border Princes" }, { max: 55, race: "Human—Bretonnian" },
    { max: 70, race: "Human—Empire" }, { max: 85, race: "Human—Tilean" }, { max: 100, race: "Human—Other" },
];

/** Only Priest and Wizard are impossible for Dwarfs/Halflings — book's own "Impossible Combinations" rule. */
export function isImpossibleRaceType(race, princeType) {
    const base = race.startsWith("Human") ? "Human" : race;
    return (base === "Dwarf" || base === "Halfling") && (princeType === "Priest" || princeType === "Wizard");
}

/** Table 2-3: Current Prince Career — flavor only, doesn't feed characteristic conversion (see PLAN.md). */
export const CAREER_STAGE_LEVEL_TABLE = [
    { max: 5, label: "First" }, { max: 15, label: "Second" }, { max: 60, label: "Third" },
    { max: 90, label: "Fourth" }, { max: 97, label: "Fifth" }, { max: 100, label: "Sixth or later" },
];

/** Table 2-4: Prince Stage of Career, 1d10. */
export const CAREER_STAGE_PROGRESS_TABLE = [
    null,
    { label: "Just started" },
    { label: "About one-third completed" }, { label: "About one-third completed" },
    { label: "About one-third completed" }, { label: "About one-third completed" },
    { label: "About two-thirds completed" }, { label: "About two-thirds completed" },
    { label: "About two-thirds completed" }, { label: "About two-thirds completed" },
    { label: "Completed" },
];

/** Table 2-5: Princely Goals, 1d10. */
export const GOAL_TABLE = [
    null,
    { goal: "By My Command" }, { goal: "Marvel At My Wondrousness" }, { goal: "It Must Be Mine!" },
    { goal: "It Must Be Mine!" }, { goal: "For The Love Of The Children" }, { goal: "I Am An Individual" },
    { goal: "Give Me Liberty, Or Give Me A Moment To Run Away" }, { goal: "This Power Is Mine" },
    { goal: "This Power Is Mine" }, { goal: "Money Can Too Buy Happiness" },
];

/** Table 2-6: Princely Principles, 1d10. */
export const PRINCIPLES_TABLE = [
    null,
    { principle: "Death to Monsters!" }, { principle: "Death to Monsters!" }, { principle: "True Nobility" },
    { principle: "Kill the Mutant!" }, { principle: "Kill the Mutant!" }, { principle: "My Word is My Bond" },
    { principle: "Save the Children" }, { principle: "What's that?" }, { principle: "What's that?" },
    { principle: "What's that?" },
];

/** Table 2-7: Princely Styles, 1d10. */
export const STYLE_TABLE = [
    null,
    { style: "Follow Your Instructions" }, { style: "Follow Your Instructions" }, { style: "We're All Friends Here" },
    { style: "I Wouldn't Expect You to Understand" }, { style: "I Wouldn't Expect You to Understand" },
    { style: "Let's Get to Business" }, { style: "Let's Get to Business" },
    { style: "Honestly, You'd Embarrass a Retarded Snotling" }, { style: "You Have Our Permission to Rise" },
    { style: "You Have Our Permission to Rise" },
];

/** Table 2-8: Princely Secrets, 1d10 — a "Roll Twice" result (10) recurses, capped at 4 secrets total (book's own limit). */
export const SECRETS_TABLE = [
    null,
    { secret: "Act of Virtue" }, { secret: "Black Sheep" }, { secret: "Chaos Cultist" },
    { secret: "Foul Murderer" }, { secret: "Open Book" }, { secret: "Secret Agent" },
    { secret: "Strange Hobby" }, { secret: "Traitor" }, { secret: "Wanted Criminal" },
    { secret: "Roll Twice" },
];

/** Table 2-9: Princely Quirks, 1d10 — a "Roll Twice" result (10) recurses, re-rolling future 10s (book's own rule). */
export const QUIRKS_TABLE = [
    null,
    { quirk: "Bizarre Temper" }, { quirk: "Catchphrase" }, { quirk: "Compulsion" },
    { quirk: "Delusion" }, { quirk: "Irrational Hatred" }, { quirk: "Moral Rule" },
    { quirk: "Phobia" }, { quirk: "Religious Fanatic" }, { quirk: "Uncontrollable Appetite" },
    { quirk: "Roll Twice" },
];

/** Table 2-10: Courtiers, 1d10 — court size (0/1/3/4/6/8/10/12/15). */
export const COURTIERS_TABLE = [
    null,
    { count: 0 }, { count: 0 }, { count: 1 }, { count: 3 }, { count: 4 },
    { count: 6 }, { count: 8 }, { count: 10 }, { count: 12 }, { count: 15 },
];

/** Short GM-facing reference text, paraphrased from the book — one paragraph per Table 2-5 result, not per band. */
export const GOAL_DESCRIPTIONS = {
    "By My Command": "Wants absolute, unquestioning obedience — may make life harder than necessary for subjects just to prove that defying him is pointless.",
    "Marvel At My Wondrousness": "Craves honour, glory, and recognition for his deeds; power gained secretly or preserved through anonymity is worthless to him.",
    "It Must Be Mine!": "Wants to rule a large nation, not a pocket-sized fief — constantly eyes weaker neighbours and is willing to risk his current position to grow stronger.",
    "For The Love Of The Children": "Wants to found a lasting dynasty — needs an heir and a realm stable enough to survive a change of ruler.",
    "I Am An Individual": "Wants unquestioned personal freedom; doesn't much care what his subjects do among themselves, but demands instant compliance with his own wishes.",
    "Give Me Liberty, Or Give Me A Moment To Run Away": "Just wants to survive — has come to value his own skin above whatever else drove him to the Borderlands in the first place.",
    "This Power Is Mine": "Wants to remain a prince, even a diminished one — some loss of territory or authority is an acceptable price for a more secure position.",
    "Money Can Too Buy Happiness": "Wants wealth, ideally enough to eventually buy his way out of the Border Princes — willing to work hard for it, but hates being cheated.",
};

/** Short GM-facing reference text, paraphrased from the book — one paragraph per Table 2-6 result, not per band. */
export const PRINCIPLE_DESCRIPTIONS = {
    "Death to Monsters!": "Refuses to ally with monsters — Greenskins, the forces of Chaos, or Humans vile enough to count — and is effectively always at war with them.",
    "True Nobility": "Holds real moral standards: rarely lies, keeps agreements, spares the innocent and the surrendered, and fights fairly — which rarely makes for a long life in the Borderlands.",
    "Kill the Mutant!": "Won't touch the powers of Chaos and actively opposes its Cultists — the closest thing to a moral consensus the region has.",
    "My Word is My Bond": "Keeps agreements and doesn't set subordinates up to fail — at the cost of being more vulnerable to betrayal by less scrupulous rivals.",
    "Save the Children": "Avoids harming the innocent, especially children and non-combatant women, and won't punish a whole village for one person's crime.",
    "What's that?": "Has no real principles — does whatever it takes to survive, which the book notes doesn't actually make him survive any longer on average.",
};

/** Short GM-facing reference text, paraphrased from the book — one paragraph per Table 2-7 result, not per band. */
export const STYLE_DESCRIPTIONS = {
    "Follow Your Instructions": "Gives orders and expects them followed without question, even from advisors wise enough to know better.",
    "We're All Friends Here": "Treats people informally, takes criticism and jokes in good humour, and expects the same courtesy in return.",
    "I Wouldn't Expect You to Understand": "Condescends to everyone, over-explains the obvious, and refuses to justify his own decisions.",
    "Let's Get to Business": "Wants blunt facts and clear plans, not flattery or theatrics — welcomes criticism as long as it's concise and on point.",
    "Honestly, You'd Embarrass a Retarded Snotling": "Insults everyone crudely and colourfully — but still quietly follows good advice buried in the abuse.",
    "You Have Our Permission to Rise": "Carries himself like true nobility — expects deference without needing to belittle anyone, and can graciously credit an advisor's expertise.",
};

/** Short GM-facing reference text, paraphrased from the book — one paragraph per Table 2-8 result, not per band. */
export const SECRET_DESCRIPTIONS = {
    "Act of Virtue": "Did something genuinely noble once — which, in the Borderlands, would be read as a sign of weakness if it ever came out.",
    "Black Sheep": "Comes from a prestigious family that would be badly embarrassed (and might act to silence him) if his current life became widely known.",
    "Chaos Cultist": "Secretly worships one of the Ruinous Powers — no boons granted yet, necessarily, but it already colours his behaviour.",
    "Foul Murderer": "Committed some singularly atrocious crime, well beyond the routine robbery and murder most Border Princes already have on their conscience.",
    "Open Book": "Has no secrets at all — everyone already knows what he's done, though some refuse to believe it, or invent secrets of their own.",
    "Secret Agent": "Is actually working for a distant power — the Empire, a Cult, a wealthy merchant — and may act against his own or his fief's interests on their behalf.",
    "Strange Hobby": "Has an odd, mildly embarrassing personal habit — not evil, just the sort of thing that invites ridicule (and the perception of weakness that comes with it) if discovered.",
    "Traitor": "Betrayed someone in the past, lord or subordinate, and may be hiding from the consequences — or vulnerable to being betrayed in turn once the story gets out.",
    "Wanted Criminal": "Is actively hunted for a crime committed elsewhere, and works hard to keep his pursuers from learning where he is.",
};

/** Short GM-facing reference text, paraphrased from the book — one paragraph per Table 2-9 result, not per band. */
export const QUIRK_DESCRIPTIONS = {
    "Bizarre Temper": "Flies into a rage over something utterly trivial and impossible to predict in advance.",
    "Catchphrase": "Repeats a particular phrase, curse, or proverb constantly, whether or not it actually makes sense in context.",
    "Compulsion": "Insists on carrying out some small personal ritual correctly, and reacts badly — up to and including ordering executions — if interrupted.",
    "Delusion": "Quietly believes something false about the world that occasionally shapes his behaviour, without tipping over into full insanity.",
    "Irrational Hatred": "Despises some person, group, or type of thing far out of proportion to how often it actually crosses his path.",
    "Moral Rule": "Scrupulously follows one narrow personal rule, even when it complicates things considerably.",
    "Phobia": "Is genuinely, deeply afraid of something mundane that most people wouldn't think twice about.",
    "Religious Fanatic": "Holds rigid — sometimes locally heretical — views about his patron deity, and expects others to at least humour them.",
    "Uncontrollable Appetite": "Has an intense, fairly well-known craving for some specific (usually harmless) thing, and puts real effort into indulging it.",
};

/**
 * Table 2-11: Titles, d100 in 20 bands of 5. `-layout` mis-shifted every title down one
 * band (e.g. showing "11-15 Baron" instead of "06-10 Baron"); `-table` mode confirmed the
 * titles are alphabetical across all 20 bands with no gap, which fixes the shift — see PLAN.md.
 */
export const TITLE_TABLE = [
    { max: 5, title: "Autocrat" }, { max: 10, title: "Baron" }, { max: 15, title: "Baronet" },
    { max: 20, title: "Captain" }, { max: 25, title: "Duke/Duchess" }, { max: 30, title: "Earl/Countess" },
    { max: 35, title: "Emperor/Empress" }, { max: 40, title: "Exalted One" }, { max: 45, title: "Gildemeister" },
    { max: 50, title: "Graf/Grafin" }, { max: 55, title: "Holy Father/Mother" }, { max: 60, title: "Imperator" },
    { max: 65, title: "King/Queen" }, { max: 70, title: "Lord Protector" }, { max: 75, title: "Margrave/Margravine" },
    { max: 80, title: "Prince" }, { max: 85, title: "The Boss" }, { max: 90, title: "Tzar/Tzarina" },
    { max: 95, title: "Viscount/Viscountess" }, { max: 100, title: "Warlord" },
];
