import { describe, it, expect, beforeEach } from "vitest";
import {
    rollNumberOfLairs, rollMonsterType, rollChaosLair, rollGreenskinLair, rollMonsterLair,
    rollShamblingHorde, rollUndeadLair, rollLair, rollLairs, generateHazards,
} from "../../src/generation/hazards.mjs";

beforeEach(() => { globalThis.__rollQueue = []; });

describe("rollNumberOfLairs", () => {
    it("looks up Table 4-1's column for the GM-chosen style", async () => {
        globalThis.__rollQueue = [3]; // band max 3 -> few: 2, moderate: 6, many: 12
        expect(await rollNumberOfLairs("few")).toBe(2);
    });
});

describe("rollMonsterType", () => {
    it("bands 1d10 into one of the four branches", async () => {
        globalThis.__rollQueue = [5];
        expect(await rollMonsterType()).toBe("Greenskin");
    });
});

describe("rollChaosLair", () => {
    it("row 1 (solo leader) skips the followers roll but still rolls the Chaos Warrior aim sub-roll", async () => {
        globalThis.__rollQueue = [
            1, // Table 4-3 row 1: count 1, rollFollowers: false
            8, // Table 4-4: 8 + 0 -> Chaos Warrior (6-10)
            5, // aim sub-roll: <=7 -> Raider
        ];
        const lair = await rollChaosLair();
        expect(lair).toEqual({ type: "Chaos", count: 1, leader: "Chaos Warrior", aim: "Raider", followers: null });
    });

    it("derives Table 4-5's followers row directly from Table 4-3's followerModifier, no independent roll", async () => {
        globalThis.__rollQueue = [
            3, // Table 4-3 row 3: count 10, leaderModifier 10, followerModifier 1
            40, // Table 4-4: 40 + 10 -> Gor (Beastman) (35-65)
        ];
        const lair = await rollChaosLair();
        expect(lair).toEqual({ type: "Chaos", count: 10, leader: "Gor (Beastman)", aim: null, followers: "Beastmen" });
    });

    it("Chaos Warrior aim >=8 is Rulership, and a modifier-inflated roll past 100 still resolves", async () => {
        globalThis.__rollQueue = [
            2, // Table 4-3 row 2: count 5, leaderModifier 5, followerModifier 0
            100, // Table 4-4: 100 + 5 = 105 -> Chaos Warrior (105 band)
            9, // aim sub-roll: >=8 -> Rulership
        ];
        const lair = await rollChaosLair();
        expect(lair.leader).toBe("Chaos Warrior");
        expect(lair.aim).toBe("Rulership");
        expect(lair.followers).toBe("Chaos Warriors");
    });
});

describe("rollGreenskinLair", () => {
    it("retries the whole set of 5 column rolls when everything comes up zero", async () => {
        globalThis.__rollQueue = [
            1, 1, 1, 1, 1, // attempt 1: all row 1 -> total 0, retry
            2, 1, 1, 1, 1, // attempt 2: Snotlings row 2 -> 10, everything else 0
        ];
        const lair = await rollGreenskinLair();
        expect(lair.total).toBe(10);
        expect(lair.leader).toBe("Snotlings");
        expect(lair.raidingArea).toBeNull();
    });

    it("rolls a Table 1-2 raiding area when the total exceeds 1000", async () => {
        globalThis.__rollQueue = [
            10, 10, 10, 10, 10, // row 10 for every column -> total 3070
            1, 500, // Table 1-2: 1 -> Caves (sizeFormula "1d100"), size roll 500
        ];
        const lair = await rollGreenskinLair();
        expect(lair.total).toBe(3070);
        expect(lair.leader).toBe("Black Orcs");
        expect(lair.raidingArea).toEqual({ feature: "Caves", size: 500, sizeUnit: "squares" });
    });
});

describe("rollMonsterLair", () => {
    it("Giant's headcount is floor(1d10/2), floored at a minimum of 1", async () => {
        globalThis.__rollQueue = [1, 1, 5]; // monster 1 -> Giant; headcount roll 1 -> floor(0.5) -> max(1,0) -> 1; attitude 5 -> Raider
        const lair = await rollMonsterLair();
        expect(lair).toEqual({ type: "Monster", monster: "Giant", count: 1, attitude: "Raider" });
    });

    it("Great Eagle's headcount is ceil(1d10/3)", async () => {
        globalThis.__rollQueue = [3, 4, 10]; // monster 3 -> Great Eagle; headcount roll 4 -> ceil(4/3) = 2; attitude 10 -> Tribute
        const lair = await rollMonsterLair();
        expect(lair.monster).toBe("Great Eagle");
        expect(lair.count).toBe(2);
        expect(lair.attitude).toBe("Tribute");
    });

    it("Wyvern is solitary below 9, a pair on 9 or 10", async () => {
        globalThis.__rollQueue = [10, 9, 1]; // monster 10 -> Wyvern; headcount roll 9 -> pair; attitude 1 -> Guardian
        const lair = await rollMonsterLair();
        expect(lair.monster).toBe("Wyvern");
        expect(lair.count).toBe(2);
    });

    it("solitary monsters (e.g. Griffon) roll no headcount die at all", async () => {
        globalThis.__rollQueue = [4, 8]; // monster 4 -> Griffon; attitude 8 -> Reclusive (no headcount roll consumed)
        const lair = await rollMonsterLair();
        expect(lair.monster).toBe("Griffon");
        expect(lair.count).toBe(1);
        expect(lair.attitude).toBe("Reclusive");
    });
});

describe("rollShamblingHorde", () => {
    it("starts on the rolled column, wraps around all 4 columns, and carries a cumulative modifier into the curse check", async () => {
        globalThis.__rollQueue = [
            3, // start column roll -> Skeletons (2 < 3 <= 5)
            4, // Skeletons: total 4 -> band max4, modifierDelta 0
            2, // Vampire Bats: total 2 -> band max2, modifierDelta 2
            1, // Zombies: total 1 + 2 = 3 -> band max3, modifierDelta 1
            1, // Dire Wolves: total 1 + 3 = 4 -> band max4
            9, // curse roll: 9 + floor(34/25)=1 -> 10 -> cursed
        ];
        const horde = await rollShamblingHorde();
        expect(horde.counts).toEqual({ Skeletons: 15, "Vampire Bats": 1, Zombies: 8, "Dire Wolves": 10 });
        expect(horde.total).toBe(34);
        expect(horde.cursed).toBe(true);
    });

    it("stays under the curse threshold on a low roll", async () => {
        globalThis.__rollQueue = [1, 1, 1, 1, 1, 1];
        const horde = await rollShamblingHorde();
        expect(horde.total).toBe(40);
        expect(horde.cursed).toBe(false);
    });
});

describe("rollUndeadLair", () => {
    it("Lone Menace branch", async () => {
        globalThis.__rollQueue = [3, 7]; // undead class 3 -> Lone Menace; menace 7 -> Wight
        const lair = await rollUndeadLair();
        expect(lair).toEqual({ type: "Undead", undeadClass: "Lone Menace", menace: "Wight" });
    });

    it("standalone Shambling Horde branch", async () => {
        globalThis.__rollQueue = [8, 1, 1, 1, 1, 1, 1]; // undead class 8 -> Shambling Horde, then its own 6 rolls
        const lair = await rollUndeadLair();
        expect(lair.type).toBe("Undead");
        expect(lair.undeadClass).toBe("Shambling Horde");
        expect(lair.horde.total).toBe(40);
    });

    it("Dead Lord branch auto-generates a full Prince-style personality plus its own Shambling Horde servants", async () => {
        globalThis.__rollQueue = [
            1, // undead class 1 -> Dead Lord
            4, // Table 4-10: 4 -> Mummy
            1, 1, 1, 1, 1, 1, // servants: rollShamblingHorde's 6 rolls
            1, // Goal: "By My Command"
            1, // Principle: "Death to Monsters!"
            1, // Style: "Follow Your Instructions"
            1, // Secrets: 1 -> "Act of Virtue" (not Roll Twice)
            1, // Quirks: 1 -> "Bizarre Temper"
        ];
        const lair = await rollUndeadLair();
        expect(lair.undeadClass).toBe("Dead Lord");
        expect(lair.deadLordType).toBe("Mummy");
        expect(lair.servants.total).toBe(40);
        expect(lair.personality).toEqual({
            goal: "By My Command",
            principle: "Death to Monsters!",
            style: "Follow Your Instructions",
            secrets: ["Act of Virtue"],
            quirks: ["Bizarre Temper"],
        });
    });
});

describe("rollLair", () => {
    it("dispatches to the Chaos branch", async () => {
        globalThis.__rollQueue = [1, 1, 40]; // monster type 1 -> Chaos; count row 1 (no followers); leader 40+0 -> Gor (Beastman)
        expect((await rollLair()).type).toBe("Chaos");
    });

    it("dispatches to the Greenskin branch", async () => {
        globalThis.__rollQueue = [5, 2, 2, 2, 2, 2]; // monster type 5 -> Greenskin; row 2 for all 5 columns
        expect((await rollLair()).type).toBe("Greenskin");
    });

    it("dispatches to the Monster branch", async () => {
        globalThis.__rollQueue = [8, 4, 8]; // monster type 8 -> Monster; monster 4 -> Griffon; attitude 8 -> Reclusive
        expect((await rollLair()).type).toBe("Monster");
    });

    it("dispatches to the Undead branch", async () => {
        globalThis.__rollQueue = [10, 3, 7]; // monster type 10 -> Undead; class 3 -> Lone Menace; menace 7 -> Wight
        expect((await rollLair()).type).toBe("Undead");
    });
});

describe("rollLairs", () => {
    it("rolls Table 4-1's count for the style, then a full lair per that count", async () => {
        globalThis.__rollQueue = [
            3, // count roll -> few: 2
            1, 1, 40, // lair 1 (Chaos)
            1, 1, 40, // lair 2 (Chaos)
        ];
        const lairs = await rollLairs("few");
        expect(lairs).toHaveLength(2);
        expect(lairs.every(l => l.type === "Chaos")).toBe(true);
    });
});

describe("generateHazards", () => {
    it("requires a GM-chosen style before rolling anything", async () => {
        await expect(generateHazards({}, undefined)).rejects.toThrow(/campaign style/);
    });
});
