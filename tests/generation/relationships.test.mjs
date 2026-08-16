import { describe, it, expect, beforeEach } from "vitest";
import {
    pickRandomPartner, rollRelationshipCause, rollSingleRelationship, rollRelationships,
} from "../../src/generation/relationships.mjs";

describe("pickRandomPartner", () => {
    beforeEach(() => {
        globalThis.__rollQueue = [];
    });

    it("excludes the given index and picks from the remaining candidates in order", async () => {
        globalThis.__rollQueue = [2]; // candidates for excludeIndex=1 are [0, 2]; roll 2 -> candidates[1] -> 2
        const partnerIndex = await pickRandomPartner([{}, {}, {}], 1);
        expect(partnerIndex).toBe(2);
    });
});

describe("rollRelationshipCause", () => {
    beforeEach(() => {
        globalThis.__rollQueue = [];
    });

    it("returns null for Rivalry — no cause table, no roll", async () => {
        const cause = await rollRelationshipCause("Rivalry", 50);
        expect(cause).toBeNull();
        expect(globalThis.__rollQueue).toEqual([]);
    });

    it("rolls a single Origin for a young Alliance (< 10 years)", async () => {
        globalThis.__rollQueue = [3]; // Table 2-14, 3 -> Enlightened Self-Interest
        const cause = await rollRelationshipCause("Alliance", 5);
        expect(cause).toEqual({ origins: ["Enlightened Self-Interest"] });
    });

    it("rolls a reinforcing second Origin for a 10+ year Alliance", async () => {
        globalThis.__rollQueue = [1, 2]; // Common Enemy, Diplomacy
        const cause = await rollRelationshipCause("Alliance", 15);
        expect(cause).toEqual({ origins: ["Common Enemy", "Diplomacy"] });
    });

    it("rolls a third Origin for a particularly old (25+ year) Alliance", async () => {
        globalThis.__rollQueue = [1, 2, 3];
        const cause = await rollRelationshipCause("Alliance", 30);
        expect(cause).toEqual({ origins: ["Common Enemy", "Diplomacy", "Enlightened Self-Interest"] });
    });

    it("resolves War's Conquest cause with no redirect roll", async () => {
        globalThis.__rollQueue = [1]; // Table 2-22, 1 -> Conquest (1-2)
        const cause = await rollRelationshipCause("War", 50);
        expect(cause).toEqual({ causeOfWar: "Conquest" });
    });

    it("redirects War's Envy cause into Table 2-17 for an underlying cause", async () => {
        globalThis.__rollQueue = [3, 1]; // Table 2-22, 3 -> Envy (3-4); Table 2-17, 1 -> Beautiful Consort (1-2)
        const cause = await rollRelationshipCause("War", 50);
        expect(cause).toEqual({ causeOfWar: "Envy", underlyingNature: "Envy", underlyingCause: "Beautiful Consort" });
    });

    it("rolls a plain cause string for every other nature", async () => {
        globalThis.__rollQueue = [5]; // Table 2-15, 5 -> Stolen Inheritance (5-6)
        const cause = await rollRelationshipCause("Bitterness", 50);
        expect(cause).toBe("Stolen Inheritance");
    });
});

describe("rollSingleRelationship", () => {
    beforeEach(() => {
        globalThis.__rollQueue = [];
    });

    it("rolls a partner, nature, length, and nature-specific cause, using the princes' actorIds", async () => {
        const princes = [{ actorId: "actor-a" }, { actorId: "actor-b" }, { actorId: "actor-c" }];
        globalThis.__rollQueue = [
            2, // partner: candidates [1, 2] for excludeIndex 0, roll 2 -> candidates[1] -> 2
            7, // nature: Table 2-12, 7 -> Respect
            50, // length: Table 2-13, 50 -> 2 years (31-60)
            3, // cause: Table 2-20, 3 -> Lineage (3-4)
        ];
        const relationship = await rollSingleRelationship(princes, 0);
        expect(relationship).toEqual({
            princeAId: "actor-a", princeBId: "actor-c",
            nature: "Respect", length: "2 years", cause: "Lineage",
        });
    });
});

describe("rollRelationships", () => {
    beforeEach(() => {
        globalThis.__rollQueue = [];
    });

    it("rolls two relationships per prince", async () => {
        const princes = [{ actorId: "a" }, { actorId: "b" }];
        globalThis.__rollQueue = [
            1, 8, 10, // prince 0, relationship 1: partner -> 1 (only candidate), nature -> Rivalry, length -> 6 months
            1, 8, 10, // prince 0, relationship 2
            1, 8, 10, // prince 1, relationship 1: partner -> 1 (only candidate, index 0)
            1, 8, 10, // prince 1, relationship 2
        ];
        const relationships = await rollRelationships(princes);
        expect(relationships).toHaveLength(4);
        expect(relationships[0]).toEqual({ princeAId: "a", princeBId: "b", nature: "Rivalry", length: "6 months", cause: null });
        expect(relationships[1]).toEqual({ princeAId: "a", princeBId: "b", nature: "Rivalry", length: "6 months", cause: null });
        expect(relationships[2]).toEqual({ princeAId: "b", princeBId: "a", nature: "Rivalry", length: "6 months", cause: null });
        expect(relationships[3]).toEqual({ princeAId: "b", princeBId: "a", nature: "Rivalry", length: "6 months", cause: null });
    });
});
