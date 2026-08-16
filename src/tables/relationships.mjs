// Tables 2-12 through 2-22: Diplomatic Relations, Length of Relations, and each relation's
// cause (Renegade Crowns, PDF pages 35-43). Cross-checked with `pdftotext -table`, which
// corrected a one-band row-shift `-layout` mode produced for every cause table (2-15
// through 2-21) — see PLAN.md's Relationships section for the verification trail.

import { lookupBand } from "./ruins.mjs";

export { lookupBand };

export const DIPLOMATIC_RELATIONS_TABLE = [ // Table 2-12, 1d10
    null,
    { relation: "Alliance" }, { relation: "Bitterness" }, { relation: "Contempt" },
    { relation: "Envy" }, { relation: "Fear" }, { relation: "Hatred" },
    { relation: "Respect" }, { relation: "Rivalry" }, { relation: "Vengeance" },
    { relation: "War" },
];

/**
 * Which natures are felt by both princes at once vs. directed one-way from the rolled
 * prince (princeA) at their randomly-picked partner (princeB) — see rollSingleRelationship
 * in generation/relationships.mjs. Per the book's own framing, Alliance/Rivalry/War describe
 * the state of the pair as a whole ("the two are at war," "an alliance"), so both princes'
 * relationships-journal pages show them. Every other nature is one prince's feeling *about*
 * the other (the bitter prince, the envious prince, the one who fears/hates/respects/seeks
 * vengeance on the other) — the target doesn't necessarily feel the same, or even know about
 * it, so only princeA's page shows it (see relationships-journal.mjs).
 */
export const MUTUAL_RELATIONS = ["Alliance", "Rivalry", "War"];

/** Short GM-facing reference text, paraphrased from the book — one paragraph per relation, not per table row. */
export const RELATION_DESCRIPTIONS = {
    "Alliance": "Two princes cooperate toward a shared aim — rare in the Border Princes, and rarely long-lived without a real story behind it.",
    "Bitterness": "A prince feels betrayed or disappointed by the other and wants him to suffer and be publicly proven wrong. Distinct from hatred: less subtle, but no less dangerous.",
    "Contempt": "A prince considers the other weak, foolish, or incompetent — leading him to plan an easy conquest, or simply to discount that prince entirely.",
    "Envy": "A prince wants what the other has, and even more wants him to lose it. Can be nursed for years before bursting into sudden destruction.",
    "Fear": "A prince fears the other's strength — driving avoidance and near-unquestioning obedience, or a preemptive strike to end the threat for good.",
    "Hatred": "A simple desire to destroy the other prince, causing pain along the way — drives some of the region's more pointless, petty wars.",
    "Respect": "One prince respects the other without fearing him — rare in the Borderlands. Can seed an alliance, though it often stays one-sided.",
    "Rivalry": "The default condition in the Border Princes: no particular dislike, just each prince guarding his own security ahead of the other's. Unstable — can drift into open hostility or, less often, real alliance.",
    "Vengeance": "A prince seeks punishment and compensation for a specific wrong the other did him — can consume his judgement, and even his own realm's welfare.",
    "War": "The two are actively at war right now, even if not fighting every day — travel between the principalities is treated with grave suspicion.",
};

/**
 * Table 2-13: Length of Relations (d100 bands). `years` is a plain number for threshold
 * checks (Alliance's reinforcement rerolls at 10+ and 25+ years — see rollAllianceCause in
 * generation/relationships.mjs), kept separate from `length`'s display text.
 */
export const LENGTH_OF_RELATIONS_TABLE = [
    { max: 10, length: "6 months", years: 0.5 },
    { max: 30, length: "1 year", years: 1 },
    { max: 60, length: "2 years", years: 2 },
    { max: 75, length: "5 years", years: 5 },
    { max: 85, length: "10 years", years: 10 },
    { max: 90, length: "15 years", years: 15 },
    { max: 94, length: "20 years", years: 20 },
    { max: 97, length: "25 years", years: 25 },
    { max: 98, length: "30 years", years: 30 },
    { max: 99, length: "40 years", years: 40 },
    { max: 100, length: "50 years", years: 50 },
];

export const ALLIANCE_ORIGIN_TABLE = [ // Table 2-14, 1d10
    null,
    { cause: "Common Enemy" }, { cause: "Diplomacy" }, { cause: "Enlightened Self-Interest" },
    { cause: "Former Comrades" }, { cause: "Fought to Stalemate" }, { cause: "Lovers" },
    { cause: "Met in Battle" }, { cause: "Prophecy" }, { cause: "Relatives" },
    { cause: "Unexpected Aid" },
];

export const ALLIANCE_ORIGIN_DESCRIPTIONS = {
    "Common Enemy": "Both were threatened by the same foe and allied to destroy it. Usually lasts only as long as the foe does, but some princes find real respect along the way.",
    "Diplomacy": "One side really wanted the alliance and won it — flattery, gifts, battle-aid, outright bribes. Both sides now bring something the other values.",
    "Enlightened Self-Interest": "Each does better allied than alone — bordering fiefs surrounded by a common threat, for instance. Circumstances can change, and self-interest can just as easily favour betrayal.",
    "Former Comrades": "Friends before either was a prince — the same mercenary band, the same warband. Having been through hardship together first tends to make for stable alliances.",
    "Fought to Stalemate": "Warred with each other until neither could gain the advantage, and grudging respect grew into alliance. Can dissolve if one side is later badly weakened.",
    "Lovers": "The princes are romantically involved. Extremely solid while it lasts, but can collapse suddenly for reasons no outsider would follow.",
    "Met in Battle": "Fought in the same battle, not necessarily on the same side, and each proved useful to the other at a critical moment. The battlefield alliance continues, for now.",
    "Prophecy": "Both are aware of a prophecy suggesting they're doomed unless they cooperate — whether it names them explicitly or just predicts disaster they can't face alone.",
    "Relatives": "Loyal to each other because blood is thicker than water — could be father and son, or any bond meant to secure lands for family.",
    "Unexpected Aid": "One prince once gave the other vital, unlooked-for help — arriving with reinforcements at the critical moment, exposing a traitor, sheltering him when weak. Gratitude has bound them since.",
};

// Tables 2-15..2-21: d10 bands, 5 causes each (1-2/3-4/5-6/7-8/9-10).

export const BITTERNESS_CAUSE_TABLE = [ // Table 2-15
    { max: 2, cause: "Deal Turned Sour" }, { max: 4, cause: "Spurned Lover" },
    { max: 6, cause: "Stolen Inheritance" }, { max: 8, cause: "Treachery" },
    { max: 10, cause: "Disfavoured Son" },
];

export const BITTERNESS_CAUSE_DESCRIPTIONS = {
    "Deal Turned Sour": "A once-reasonable agreement turned out to benefit one side far more — a land swap that hid a gold mine, a trade deal that enriched only the other fief.",
    "Spurned Lover": "Romantic overtures were rejected outright, or accepted for a time and then cast off. The bitter prince burns to prove the rejection was a terrible mistake.",
    "Stolen Inheritance": "Deprived of an inheritance that should have been his — passed over for another heir, or a loyal retainer overlooked in favour of a son.",
    "Treachery": "Genuinely betrayed — an ally invaded his lands, or a hostage he cared for was killed out of hand. If severe and real, this cause can be a sympathetic one.",
    "Disfavoured Son": "Never loved by his father, always overshadowed by his brothers. Now that he has his own principality, he means to prove them all wrong.",
};

export const CONTEMPT_CAUSE_TABLE = [ // Table 2-16
    { max: 2, cause: "Decadence" }, { max: 4, cause: "Inexperience" },
    { max: 6, cause: "Military Defeat" }, { max: 8, cause: "Virtue" },
    { max: 10, cause: "Weakness" },
];

export const CONTEMPT_CAUSE_DESCRIPTIONS = {
    "Decadence": "Spends too much energy on irrelevant luxuries — a fine palace instead of fortifications, jewellery, dancing girls — rather than the business of rule.",
    "Inexperience": "Little experience of rule or war; the contemptuous lord expects him to make the wrong decisions and fall easily, whether he inherited young or seized his fief on apparent luck.",
    "Military Defeat": "Suffered and survived a serious military defeat — attributed to luck or the opponent's weakness rather than any credit to the survivor.",
    "Virtue": "Displays real principles, especially care for the weak and honesty — read by his contemptuous neighbours as proof he's unsuited to rule in the Borderlands. They may even be right.",
    "Weakness": "Seems weak for some reason — illness, old age, a thin or inexperienced garrison — often triggered by dismissing an experienced mercenary company he could no longer afford or trust.",
};

export const ENVY_CAUSE_TABLE = [ // Table 2-17
    { max: 2, cause: "Beautiful Consort" }, { max: 4, cause: "Glorious Reputation" },
    { max: 6, cause: "Personal Power" }, { max: 8, cause: "Strong Realm" },
    { max: 10, cause: "Vast Wealth" },
];

export const ENVY_CAUSE_DESCRIPTIONS = {
    "Beautiful Consort": "Covets the other prince's wife or husband. If the consort wants nothing to do with the envier, the envy festers; if she'd also rather switch households, matters come to a head fast.",
    "Glorious Reputation": "Envies a reputation that's hard to simply match — beating an invincible warrior in single combat is possible, but stealing a reputation for wisdom takes years of skulduggery.",
    "Personal Power": "Envies the other's personal gifts — a supreme warrior, a powerful Wizard, an unnaturally persuasive tongue. Believing it must be cheated rather than earned, he favours sabotage over hard work.",
    "Strong Realm": "Wants the other's strong realm for himself. Simply seizing it is the obvious plan, but its very strength is what makes that difficult — so he prepares carefully instead.",
    "Vast Wealth": "Resents the other's riches, and however much he dresses it up as a complaint about injustice, what he actually wants is to take that money for himself.",
};

export const FEAR_CAUSE_TABLE = [ // Table 2-18
    { max: 2, cause: "Aggression" }, { max: 4, cause: "Atrocity" },
    { max: 6, cause: "Crushing Victory" }, { max: 8, cause: "Knowledge" },
    { max: 10, cause: "Personal Power" },
];

export const FEAR_CAUSE_DESCRIPTIONS = {
    "Aggression": "Raids his neighbours often and effectively, dealing with any reprisal with ease — neighbours live in fear of a full invasion.",
    "Atrocity": "Did, or does, something truly terrible — slaughtering a village, or a signature act of calculated cruelty — and backs it up with real power.",
    "Crushing Victory": "Defeated a rival far more thoroughly than necessary, even if the rival was weak, signalling substantial power the other princes want kept away from them.",
    "Knowledge": "Always seems to know what's happening in other principalities, even secrets discussed behind closed doors — some whisper of spies, others of Daemons or magic.",
    "Personal Power": "Believed to hold vast, usually supernatural, personal power — an army can defeat a warrior-prince, but perhaps not a Wizard-prince.",
};

export const HATRED_CAUSE_TABLE = [ // Table 2-19
    { max: 2, cause: "Former Friends" }, { max: 4, cause: "Prejudice" },
    { max: 6, cause: "Public Humiliation" }, { max: 8, cause: "Religion" },
    { max: 10, cause: "Treachery" },
];

export const HATRED_CAUSE_DESCRIPTIONS = {
    "Former Friends": "Once friends, even lovers, but something went wrong — trivial in origin, perhaps, but it has grown over time until at least one wants the other dead.",
    "Prejudice": "Simple dislike of \"that sort of person\" — sexism, racism, national prejudice, or hatred of those with (or without) noble ancestry.",
    "Public Humiliation": "Mocked or made to look foolish in public, at a feast or during treaty talks — trivial in origin, but the hatred it produced far outstrips the original act.",
    "Religion": "Irreconcilable religious differences — most starkly a worshipper of the Ruinous Powers, but also rival cult loyalties among people long removed from the mainstream faiths.",
    "Treachery": "Betrayed by the other prince at some point, and now wants him dead — any sense of proportion has long since fallen away.",
};

export const RESPECT_CAUSE_TABLE = [ // Table 2-20
    { max: 2, cause: "Cunning" }, { max: 4, cause: "Lineage" },
    { max: 6, cause: "Power" }, { max: 8, cause: "Survival" },
    { max: 10, cause: "Virtue" },
];

export const RESPECT_CAUSE_DESCRIPTIONS = {
    "Cunning": "Admired for thinking his way out of trouble with information and strategy — often leads toward alliance, or toward imitation if the respecter lacks the military strength to match him.",
    "Lineage": "Respected for descent from many generations of nobility — a respect that may shatter the moment he acts unworthy of it, or prove remarkably durable regardless of his conduct.",
    "Power": "By far the simplest cause — he is extremely strong, moving against him seems futile, and he would be a valuable ally.",
    "Survival": "Has held on as a prince for a very long time despite many threats and apparent weaknesses — respected simply for having endured, though it rarely inspires a wish for alliance.",
    "Virtue": "Respected for upholding principled rule — care for the weak, honesty — in a region that makes virtue difficult, tinged with fear of what he might become if it ever slipped.",
};

export const VENGEANCE_CAUSE_TABLE = [ // Table 2-21
    { max: 2, cause: "Atrocity" }, { max: 4, cause: "Betrayal" },
    { max: 6, cause: "Defeat" }, { max: 8, cause: "Humiliation" },
    { max: 10, cause: "Insult" },
];

export const VENGEANCE_CAUSE_DESCRIPTIONS = {
    "Atrocity": "The other prince did something truly terrible — burned a village with its people inside, or some similarly monstrous act — and has sworn to answer for it even though he wasn't the direct victim.",
    "Betrayal": "Betrayed in a substantial way — an oath-bound ally who never came, or one who broke a treaty and turned on him mid-battle.",
    "Defeat": "Defeated by the other prince and seeks to erase the shame of it by conquering him in turn — a significant loss that changed the terms of the relationship for good.",
    "Humiliation": "Humiliated by the other prince through action, not mere words — mockery at a public feast, contemptuous rejection of an embassy.",
    "Insult": "Insulted by the other prince — a true insult, or simply a failure to pay the respect he felt owed. As a cause for violent vengeance, this one earns little sympathy.",
};

/**
 * Table 2-22: Cause of War, 1d10 bands. Envy/Fear/Hatred/Vengeance redirect into that
 * relation's own cause table (2-17/2-18/2-19/2-21) for a second, underlying-cause roll —
 * see rollWarCause in generation/relationships.mjs. Conquest needs no further roll.
 */
export const WAR_CAUSE_TABLE = [
    { max: 2, cause: "Conquest" },
    { max: 4, cause: "Envy", rerollNature: "Envy" },
    { max: 6, cause: "Fear", rerollNature: "Fear" },
    { max: 8, cause: "Hatred", rerollNature: "Hatred" },
    { max: 10, cause: "Vengeance", rerollNature: "Vengeance" },
];

export const WAR_CAUSE_DESCRIPTIONS = {
    "Conquest": "One prince has simply decided to take part or all of the other's lands — at least one side has planned carefully, and there's a clear aggressor.",
};

/**
 * Per-relation cause table lookup, keyed by Table 2-12's `relation` value. Rivalry and War
 * are deliberately absent: Rivalry has no cause table at all (the book's own explicit
 * "does not need an exact cause" default-condition exemption — see rollRelationshipCause in
 * generation/relationships.mjs), and War uses WAR_CAUSE_TABLE directly, not this map.
 */
export const CAUSE_TABLES = {
    Bitterness: BITTERNESS_CAUSE_TABLE,
    Contempt: CONTEMPT_CAUSE_TABLE,
    Envy: ENVY_CAUSE_TABLE,
    Fear: FEAR_CAUSE_TABLE,
    Hatred: HATRED_CAUSE_TABLE,
    Respect: RESPECT_CAUSE_TABLE,
    Vengeance: VENGEANCE_CAUSE_TABLE,
};

/** Mirrors CAUSE_TABLES, one description dictionary per nature — see relationships-journal.mjs. */
export const CAUSE_DESCRIPTIONS = {
    Bitterness: BITTERNESS_CAUSE_DESCRIPTIONS,
    Contempt: CONTEMPT_CAUSE_DESCRIPTIONS,
    Envy: ENVY_CAUSE_DESCRIPTIONS,
    Fear: FEAR_CAUSE_DESCRIPTIONS,
    Hatred: HATRED_CAUSE_DESCRIPTIONS,
    Respect: RESPECT_CAUSE_DESCRIPTIONS,
    Vengeance: VENGEANCE_CAUSE_DESCRIPTIONS,
};
