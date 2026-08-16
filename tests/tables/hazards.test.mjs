import { describe, it, expect } from "vitest";
import {
    NUMBER_OF_LAIRS_TABLE, PLACEMENT_GUIDANCE, MONSTER_TYPE_TABLE, CHAOS_CREATURE_COUNT_TABLE,
    CHAOS_LEADER_TABLE, CHAOS_LEADER_COLUMNS, CHAOS_FOLLOWERS_TABLE, CHAOS_LEADER_DESCRIPTIONS,
    GREENSKIN_NUMBERS_TABLE, GREENSKIN_COLUMNS, MONSTER_TABLE, MONSTER_ATTITUDE_TABLE,
    MONSTER_DESCRIPTIONS, MONSTER_ATTITUDE_DESCRIPTIONS, UNDEAD_CLASS_TABLE, DEAD_LORD_TABLE,
    DEAD_LORD_DESCRIPTIONS, LONE_MENACE_TABLE, LONE_MENACE_DESCRIPTIONS,
    SHAMBLING_HORDE_START_TABLE, SHAMBLING_HORDE_COLUMNS, SHAMBLING_HORDE_TABLE,
} from "../../src/tables/hazards.mjs";

describe("NUMBER_OF_LAIRS_TABLE (Table 4-1)", () => {
    it("has 6 bands ending at 10, one column per campaign style", () => {
        expect(NUMBER_OF_LAIRS_TABLE.at(-1).max).toBe(10);
        for (const row of NUMBER_OF_LAIRS_TABLE) {
            expect(row.few).toBeTypeOf("number");
            expect(row.moderate).toBeTypeOf("number");
            expect(row.many).toBeTypeOf("number");
        }
    });
});

describe("PLACEMENT_GUIDANCE", () => {
    it("is GM-facing text", () => {
        expect(PLACEMENT_GUIDANCE).toBeTypeOf("string");
        expect(PLACEMENT_GUIDANCE.length).toBeGreaterThan(0);
    });
});

describe("MONSTER_TYPE_TABLE (Table 4-2)", () => {
    it("covers 1-10 across four branches", () => {
        expect(MONSTER_TYPE_TABLE.at(-1).max).toBe(10);
        expect(new Set(MONSTER_TYPE_TABLE.map(e => e.type))).toEqual(new Set(["Chaos", "Greenskin", "Monster", "Undead"]));
    });
});

describe("CHAOS_CREATURE_COUNT_TABLE (Table 4-3)", () => {
    it("has 10 rows (1d10 direct), row 1 skipping the followers roll", () => {
        expect(CHAOS_CREATURE_COUNT_TABLE.filter(Boolean)).toHaveLength(10);
        expect(CHAOS_CREATURE_COUNT_TABLE[1].rollFollowers).toBe(false);
        for (let i = 2; i <= 10; i++) expect(CHAOS_CREATURE_COUNT_TABLE[i].rollFollowers).not.toBe(false);
    });
});

describe("CHAOS_LEADER_TABLE (Table 4-4)", () => {
    it("bands run past 100, up to 120 (max leaderModifier)", () => {
        expect(CHAOS_LEADER_TABLE.at(-1).max).toBe(120);
    });

    it("every leader has a CHAOS_LEADER_COLUMNS entry and a description", () => {
        for (const entry of CHAOS_LEADER_TABLE) {
            expect(CHAOS_LEADER_COLUMNS[entry.leader], entry.leader).toBeTypeOf("string");
            expect(CHAOS_LEADER_DESCRIPTIONS[entry.leader], entry.leader).toBeTypeOf("string");
        }
    });
});

describe("CHAOS_FOLLOWERS_TABLE (Table 4-5)", () => {
    it("has rows 1-5, each with every Table 4-5 column", () => {
        expect(CHAOS_FOLLOWERS_TABLE.filter(Boolean)).toHaveLength(5);
        const columns = new Set(Object.values(CHAOS_LEADER_COLUMNS));
        for (const row of CHAOS_FOLLOWERS_TABLE.filter(Boolean)) {
            for (const column of columns) expect(row[column], column).toBeTypeOf("string");
        }
    });
});

describe("GREENSKIN_NUMBERS_TABLE (Table 4-6)", () => {
    it("has rows 1-10, one value per GREENSKIN_COLUMNS entry, row 1 all zero", () => {
        expect(GREENSKIN_NUMBERS_TABLE.filter(Boolean)).toHaveLength(10);
        for (const column of GREENSKIN_COLUMNS) expect(GREENSKIN_NUMBERS_TABLE[1][column]).toBe(0);
        for (const row of GREENSKIN_NUMBERS_TABLE.filter(Boolean)) {
            for (const column of GREENSKIN_COLUMNS) expect(row[column]).toBeTypeOf("number");
        }
    });
});

describe("MONSTER_TABLE (Table 4-7) and MONSTER_ATTITUDE_TABLE (Table 4-8)", () => {
    it("covers 1-10 across 8 monster types, each with a description", () => {
        expect(MONSTER_TABLE.at(-1).max).toBe(10);
        for (const entry of MONSTER_TABLE) {
            expect(MONSTER_DESCRIPTIONS[entry.monster], entry.monster).toBeTypeOf("string");
            expect(MONSTER_ATTITUDE_TABLE[entry.monster], entry.monster).toBeInstanceOf(Array);
        }
    });

    it("every attitude band lands on a described attitude", () => {
        for (const bands of Object.values(MONSTER_ATTITUDE_TABLE)) {
            expect(bands.at(-1).max).toBe(10);
            for (const band of bands) expect(MONSTER_ATTITUDE_DESCRIPTIONS[band.attitude], band.attitude).toBeTypeOf("string");
        }
    });
});

describe("UNDEAD_CLASS_TABLE (Table 4-9)", () => {
    it("covers 1-10 across three classes", () => {
        expect(UNDEAD_CLASS_TABLE.at(-1).max).toBe(10);
        expect(new Set(UNDEAD_CLASS_TABLE.map(e => e.undeadClass))).toEqual(new Set(["Dead Lord", "Lone Menace", "Shambling Horde"]));
    });
});

describe("DEAD_LORD_TABLE (Table 4-10)", () => {
    it("covers 1-10, every type described", () => {
        expect(DEAD_LORD_TABLE.at(-1).max).toBe(10);
        for (const entry of DEAD_LORD_TABLE) expect(DEAD_LORD_DESCRIPTIONS[entry.type], entry.type).toBeTypeOf("string");
    });
});

describe("LONE_MENACE_TABLE (Table 4-11)", () => {
    it("covers 1-10, every menace described", () => {
        expect(LONE_MENACE_TABLE.at(-1).max).toBe(10);
        for (const entry of LONE_MENACE_TABLE) expect(LONE_MENACE_DESCRIPTIONS[entry.menace], entry.menace).toBeTypeOf("string");
    });
});

describe("Table 4-12 (Shambling Hordes)", () => {
    it("SHAMBLING_HORDE_START_TABLE covers 1-10 across all 4 columns", () => {
        expect(SHAMBLING_HORDE_START_TABLE.at(-1).max).toBe(10);
        expect(new Set(SHAMBLING_HORDE_START_TABLE.map(e => e.column))).toEqual(new Set(SHAMBLING_HORDE_COLUMNS));
    });

    it("SHAMBLING_HORDE_TABLE covers every band (final max: Infinity) with a value per column and a modifierDelta", () => {
        expect(SHAMBLING_HORDE_TABLE.at(-1).max).toBe(Infinity);
        for (const row of SHAMBLING_HORDE_TABLE) {
            for (const column of SHAMBLING_HORDE_COLUMNS) expect(row[column]).toBeTypeOf("number");
            expect(row.modifierDelta).toBeTypeOf("number");
        }
    });
});
