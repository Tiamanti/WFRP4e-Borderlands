import { describe, it, expect, beforeEach } from "vitest";
import { rollPrinces, convertCharacteristics } from "../../src/generation/princes.mjs";
import { PRINCE_TYPES } from "../../src/tables/princes.mjs";
import { createRegion } from "../../src/generation/region.mjs";

describe("convertCharacteristics", () => {
    beforeEach(() => {
        globalThis.__rollQueue = [];
    });

    it("keeps the statblock's baseline unchanged and adds freshly-rolled Initiative/Dexterity (race is narrative-only, not applied here)", async () => {
        globalThis.__rollQueue = [55, 45]; // initiative, dexterity
        const characteristics = await convertCharacteristics(PRINCE_TYPES.Bandit);
        expect(characteristics).toEqual({ ...PRINCE_TYPES.Bandit.characteristics, initiative: 55, dexterity: 45 });
    });
});

describe("rollPrinces", () => {
    beforeEach(() => {
        globalThis.__rollQueue = [];
    });

    it("rolls a full prince from the queued table results", async () => {
        const region = createRegion();
        globalThis.__rollQueue = [
            5, // count roll -> 1 (Table 1-3, 01-10)
            10, // type roll -> Bandit (01-30)
            50, // race roll -> Human—Bretonnian (41-55)
            30, // career level roll -> Third (16-60)
            1, // career progress roll -> Just started
            1, // goal roll -> By My Command
            3, // principle roll -> True Nobility
            3, // style roll -> We're All Friends Here
            1, // secret roll -> Act of Virtue (not Roll Twice)
            2, // quirk roll -> Catchphrase (not 10)
            3, // courtiers roll -> 1
            3, // title roll -> Autocrat (01-05)
            1, 40, // principality: Table 1-1 roll 1 -> Plains/Barren terrain row, size roll -> 40
            55, 45, // initiative, dexterity
        ];

        const princes = await rollPrinces(region);

        expect(princes).toEqual([{
            type: "Bandit", race: "Human—Bretonnian",
            characteristics: { ...PRINCE_TYPES.Bandit.characteristics, initiative: 55, dexterity: 45 },
            career: PRINCE_TYPES.Bandit.career, priorCareers: PRINCE_TYPES.Bandit.priorCareers,
            skills: PRINCE_TYPES.Bandit.skills, talents: PRINCE_TYPES.Bandit.talents,
            guidanceNotes: PRINCE_TYPES.Bandit.guidanceNotes,
            armour: PRINCE_TYPES.Bandit.armour, weapons: PRINCE_TYPES.Bandit.weapons, trappings: PRINCE_TYPES.Bandit.trappings,
            careerLevel: "Third", careerProgress: "Just started",
            goal: "By My Command", principle: "True Nobility", style: "We're All Friends Here",
            secrets: ["Act of Virtue"], quirks: ["Catchphrase"],
            courtiers: 1, title: "Autocrat", principalitySize: 40,
        }]);
    });

    it("re-rolls race on an impossible Dwarf/Halfling + Wizard/Priest combination", async () => {
        const region = createRegion();
        globalThis.__rollQueue = [
            5, // count -> 1
            99, // type roll -> Wizard (99-100)
            5, // race roll -> Dwarf (01-08) — impossible with Wizard, re-roll
            50, // race re-roll -> Human—Bretonnian (41-55) — allowed
            1, 1, 1, 1, 1, 1, // careerLevel, careerProgress, goal, principle, style, secret
            1, // quirk
            1, 1, // courtiers, title
            1, 1, // principality roll + size
            10, 10, // initiative, dexterity
        ];

        const princes = await rollPrinces(region);
        expect(princes[0].type).toBe("Wizard");
        expect(princes[0].race).toBe("Human—Bretonnian");
    });

    it("Table 2-8 Roll Twice recurses and applies both results", async () => {
        const region = createRegion();
        globalThis.__rollQueue = [
            5, 10, 50, 1, 1, 1, 1, 1, // count, type, race, careerLevel, careerProgress, goal, principle, style
            10, 2, 3, // secrets: Roll Twice -> Black Sheep, Chaos Cultist
            2, // quirk
            1, 1, // courtiers, title
            1, 1, // principality
            10, 10, // initiative, dexterity
        ];

        const princes = await rollPrinces(region);
        expect(princes[0].secrets).toEqual(["Black Sheep", "Chaos Cultist"]);
    });

    it("Table 2-9 Roll Twice ignores further 10s (re-rolls) instead of recursing again", async () => {
        const region = createRegion();
        globalThis.__rollQueue = [
            5, 10, 50, 1, 1, 1, 1, 1, // count, type, race, careerLevel, careerProgress, goal, principle, style
            1, // secret (not Roll Twice)
            10, 10, 4, 5, // quirks: Roll Twice -> first reroll ignores a 10 -> Delusion(4), second -> Irrational Hatred(5)
            1, 1, // courtiers, title
            1, 1, // principality
            10, 10, // initiative, dexterity
        ];

        const princes = await rollPrinces(region);
        expect(princes[0].quirks).toEqual(["Delusion", "Irrational Hatred"]);
    });
});
