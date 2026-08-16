import { describe, it, expect } from "vitest";
import {
    PRINCE_TYPE_TABLE, PRINCE_TYPES, RACE_TABLE, isImpossibleRaceType, TITLE_TABLE,
    GOAL_TABLE, PRINCIPLE_DESCRIPTIONS, PRINCIPLES_TABLE, GOAL_DESCRIPTIONS,
    STYLE_TABLE, STYLE_DESCRIPTIONS, SECRETS_TABLE, SECRET_DESCRIPTIONS,
    QUIRKS_TABLE, QUIRK_DESCRIPTIONS,
} from "../../src/tables/princes.mjs";

describe("PRINCE_TYPE_TABLE", () => {
    it("covers 1-100 with no gaps and ends at 100", () => {
        expect(PRINCE_TYPE_TABLE.at(-1).max).toBe(100);
        expect(Object.keys(PRINCE_TYPES).sort()).toEqual(PRINCE_TYPE_TABLE.map(e => e.type).sort());
    });
});

describe("RACE_TABLE", () => {
    it("covers 1-100 with no gaps and ends at 100", () => {
        expect(RACE_TABLE.at(-1).max).toBe(100);
    });
});

describe("TITLE_TABLE", () => {
    it("has 20 bands of 5, ending at 100 (corrected from -layout's row-shift misprint — see tables/princes.mjs)", () => {
        expect(TITLE_TABLE).toHaveLength(20);
        expect(TITLE_TABLE.at(-1)).toEqual({ max: 100, title: "Warlord" });
        expect(TITLE_TABLE[0]).toEqual({ max: 5, title: "Autocrat" });
        expect(TITLE_TABLE[1]).toEqual({ max: 10, title: "Baron" });
    });
});

describe("personality description dictionaries", () => {
    it("has a GOAL_DESCRIPTIONS entry for every unique GOAL_TABLE result", () => {
        const goals = new Set(GOAL_TABLE.filter(Boolean).map(e => e.goal));
        for (const goal of goals) expect(GOAL_DESCRIPTIONS[goal], goal).toBeTypeOf("string");
    });

    it("has a PRINCIPLE_DESCRIPTIONS entry for every unique PRINCIPLES_TABLE result", () => {
        const principles = new Set(PRINCIPLES_TABLE.filter(Boolean).map(e => e.principle));
        for (const principle of principles) expect(PRINCIPLE_DESCRIPTIONS[principle], principle).toBeTypeOf("string");
    });

    it("has a STYLE_DESCRIPTIONS entry for every unique STYLE_TABLE result", () => {
        const styles = new Set(STYLE_TABLE.filter(Boolean).map(e => e.style));
        for (const style of styles) expect(STYLE_DESCRIPTIONS[style], style).toBeTypeOf("string");
    });

    it("has a SECRET_DESCRIPTIONS entry for every unique SECRETS_TABLE result except the Roll Twice marker", () => {
        const secrets = new Set(SECRETS_TABLE.filter(Boolean).map(e => e.secret).filter(s => s !== "Roll Twice"));
        for (const secret of secrets) expect(SECRET_DESCRIPTIONS[secret], secret).toBeTypeOf("string");
    });

    it("has a QUIRK_DESCRIPTIONS entry for every unique QUIRKS_TABLE result except the Roll Twice marker", () => {
        const quirks = new Set(QUIRKS_TABLE.filter(Boolean).map(e => e.quirk).filter(q => q !== "Roll Twice"));
        for (const quirk of quirks) expect(QUIRK_DESCRIPTIONS[quirk], quirk).toBeTypeOf("string");
    });
});

describe("isImpossibleRaceType", () => {
    it("forbids Dwarf/Halfling Wizards and Priests", () => {
        expect(isImpossibleRaceType("Dwarf", "Wizard")).toBe(true);
        expect(isImpossibleRaceType("Halfling", "Priest")).toBe(true);
    });

    it("allows every other race/type combination", () => {
        expect(isImpossibleRaceType("Dwarf", "Bandit")).toBe(false);
        expect(isImpossibleRaceType("Elf", "Wizard")).toBe(false);
        expect(isImpossibleRaceType("Human—Tilean", "Priest")).toBe(false);
    });
});
