import { describe, it, expect } from "vitest";
import {
    DIPLOMATIC_RELATIONS_TABLE, RELATION_DESCRIPTIONS, MUTUAL_RELATIONS, LENGTH_OF_RELATIONS_TABLE,
    ALLIANCE_ORIGIN_TABLE, ALLIANCE_ORIGIN_DESCRIPTIONS, CAUSE_TABLES, CAUSE_DESCRIPTIONS,
    WAR_CAUSE_TABLE, WAR_CAUSE_DESCRIPTIONS,
} from "../../src/tables/relationships.mjs";

describe("DIPLOMATIC_RELATIONS_TABLE", () => {
    it("has all 10 relations (1d10) with a description each", () => {
        const relations = DIPLOMATIC_RELATIONS_TABLE.filter(Boolean).map(e => e.relation);
        expect(relations).toHaveLength(10);
        for (const relation of relations) expect(RELATION_DESCRIPTIONS[relation], relation).toBeTypeOf("string");
    });
});

describe("MUTUAL_RELATIONS", () => {
    it("is exactly Alliance, Rivalry, and War — every other nature is one-directional (see relationships-journal.mjs)", () => {
        expect(new Set(MUTUAL_RELATIONS)).toEqual(new Set(["Alliance", "Rivalry", "War"]));
    });

    it("only names real Table 2-12 natures", () => {
        const relations = new Set(DIPLOMATIC_RELATIONS_TABLE.filter(Boolean).map(e => e.relation));
        for (const nature of MUTUAL_RELATIONS) expect(relations.has(nature), nature).toBe(true);
    });
});

describe("LENGTH_OF_RELATIONS_TABLE", () => {
    it("covers 1-100 with no gaps and ends at 100", () => {
        expect(LENGTH_OF_RELATIONS_TABLE.at(-1).max).toBe(100);
    });
});

describe("ALLIANCE_ORIGIN_TABLE", () => {
    it("has all 10 origins (1d10) with a description each", () => {
        const origins = ALLIANCE_ORIGIN_TABLE.filter(Boolean).map(e => e.cause);
        expect(origins).toHaveLength(10);
        for (const origin of origins) expect(ALLIANCE_ORIGIN_DESCRIPTIONS[origin], origin).toBeTypeOf("string");
    });
});

describe("CAUSE_TABLES (Tables 2-15..2-21)", () => {
    it("every nature's cause table covers 1-10 with no gaps and has a description for every cause", () => {
        for (const [nature, table] of Object.entries(CAUSE_TABLES)) {
            expect(table.at(-1).max, nature).toBe(10);
            for (const entry of table) {
                expect(CAUSE_DESCRIPTIONS[nature][entry.cause], `${nature}: ${entry.cause}`).toBeTypeOf("string");
            }
        }
    });
});

describe("WAR_CAUSE_TABLE (Table 2-22)", () => {
    it("covers 1-10, redirects Envy/Fear/Hatred/Vengeance into their own cause table, and Conquest has its own description", () => {
        expect(WAR_CAUSE_TABLE.at(-1).max).toBe(10);
        expect(WAR_CAUSE_DESCRIPTIONS["Conquest"]).toBeTypeOf("string");
        for (const entry of WAR_CAUSE_TABLE) {
            if (entry.cause === "Conquest") continue;
            expect(CAUSE_TABLES[entry.rerollNature], entry.cause).toBeDefined();
        }
    });
});
