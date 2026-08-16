import { describe, it, expect, beforeEach } from "vitest";
import {
    rollNamingStyleForRace, rollSettlementNamingStyle, rollPlaceName, rollSettlementName,
} from "../../src/generation/names.mjs";

beforeEach(() => { globalThis.__rollQueue = []; });

describe("rollNamingStyleForRace", () => {
    it("maps a directly-named race with no roll at all", async () => {
        expect(await rollNamingStyleForRace("Human—Bretonnian")).toBe("Bretonnian");
        expect(await rollNamingStyleForRace("Dwarf")).toBe("Flavourful");
        expect(globalThis.__rollQueue).toEqual([]);
    });

    it("splits Human—Other 50/50 between Estalian and Kislevite", async () => {
        globalThis.__rollQueue = [1];
        expect(await rollNamingStyleForRace("Human—Other")).toBe("Estalian");
        globalThis.__rollQueue = [2];
        expect(await rollNamingStyleForRace("Human—Other")).toBe("Kislevite");
    });
});

describe("rollSettlementNamingStyle", () => {
    it("is the bias style on a roll of 1-50", async () => {
        globalThis.__rollQueue = [50];
        expect(await rollSettlementNamingStyle("Tilean")).toBe("Tilean");
    });

    it("splits the remaining 50% into 10% bands across the other 5 styles, in NAMING_STYLES order", async () => {
        // bias = Empire; remaining in order: Bretonnian, Tilean, Estalian, Kislevite, Flavourful
        globalThis.__rollQueue = [51];
        expect(await rollSettlementNamingStyle("Empire")).toBe("Bretonnian");
        globalThis.__rollQueue = [70];
        expect(await rollSettlementNamingStyle("Empire")).toBe("Tilean");
        globalThis.__rollQueue = [100];
        expect(await rollSettlementNamingStyle("Empire")).toBe("Flavourful");
    });

    it("defaults the bias to Flavourful when there's no owner (the uncontrolled area)", async () => {
        globalThis.__rollQueue = [50];
        expect(await rollSettlementNamingStyle(null)).toBe("Flavourful");
        globalThis.__rollQueue = [51]; // first of the remaining 5 (Empire, since Flavourful is excluded)
        expect(await rollSettlementNamingStyle(null)).toBe("Empire");
    });
});

describe("rollPlaceName", () => {
    it("concatenates a cultural style's First + Second Element with no separator", async () => {
        globalThis.__rollQueue = [2, 2]; // Empire First: 2 -> "Aber"; Second (1d10): 2 -> "burg"
        expect(await rollPlaceName("Empire")).toBe("Aberburg");
    });

    it("space-joins Flavourful's two whole-word elements", async () => {
        globalThis.__rollQueue = [12, 34]; // First: 12 -> "Black"; Second: 34 -> "Hill"
        expect(await rollPlaceName("Flavourful")).toBe("Black Hill");
    });
});

describe("rollSettlementName", () => {
    it("rolls a style then a name in that style", async () => {
        globalThis.__rollQueue = [
            50, // style roll: <=50 -> bias style (Tilean)
            5, 3, // Tilean First: 5 -> "Arn"; Second (1d10): 3 -> "enze"
        ];
        expect(await rollSettlementName("Tilean")).toBe("Arnenze");
    });
});
