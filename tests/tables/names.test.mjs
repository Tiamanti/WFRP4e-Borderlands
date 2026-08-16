import { describe, it, expect } from "vitest";
import {
    NAMING_STYLES, RACE_TO_STYLE, FIRST_ELEMENT_TABLES, SECOND_ELEMENT_TABLES,
} from "../../src/tables/names.mjs";

describe("NAMING_STYLES", () => {
    it("has all 6 Appendix I styles, each with a First and Second Element table", () => {
        expect(NAMING_STYLES).toEqual(["Empire", "Bretonnian", "Tilean", "Estalian", "Kislevite", "Flavourful"]);
        for (const style of NAMING_STYLES) {
            expect(FIRST_ELEMENT_TABLES[style], style).toBeInstanceOf(Array);
            expect(SECOND_ELEMENT_TABLES[style], style).toBeDefined();
        }
    });
});

describe("First Element tables (Tables A-1, A-3, A-5, A-7, A-9, A-11)", () => {
    it("every style's band widths sum to exactly 100", () => {
        for (const style of NAMING_STYLES) {
            const table = FIRST_ELEMENT_TABLES[style];
            expect(table.at(-1).max, style).toBe(100);
            let prev = 0;
            for (const band of table) {
                expect(band.max, `${style} band order`).toBeGreaterThan(prev);
                prev = band.max;
            }
        }
    });
});

describe("Second Element tables (Tables A-2/A-4/A-6/A-8/A-10 vs A-12)", () => {
    it("the 5 cultural styles are 1d10 direct-index lists of 10 suffixes", () => {
        for (const style of ["Empire", "Bretonnian", "Tilean", "Estalian", "Kislevite"]) {
            const table = SECOND_ELEMENT_TABLES[style];
            expect(table.filter(Boolean), style).toHaveLength(10);
            expect(table[0], style).toBeNull();
        }
    });

    it("Flavourful is a banded d100 table like its First Element, not a 1d10 list", () => {
        const table = SECOND_ELEMENT_TABLES.Flavourful;
        expect(table.at(-1).max).toBe(100);
        expect(table.length).toBeGreaterThan(10);
    });
});

describe("RACE_TO_STYLE", () => {
    it("maps every RACE_TABLE entry except Human—Other (handled separately, split between Estalian/Kislevite)", () => {
        expect(RACE_TO_STYLE).toEqual({
            "Dwarf": "Flavourful",
            "Elf": "Flavourful",
            "Halfling": "Flavourful",
            "Human—Border Princes": "Flavourful",
            "Human—Bretonnian": "Bretonnian",
            "Human—Empire": "Empire",
            "Human—Tilean": "Tilean",
        });
    });

    it("every mapped style is a real naming style", () => {
        for (const style of Object.values(RACE_TO_STYLE)) expect(NAMING_STYLES).toContain(style);
    });
});
