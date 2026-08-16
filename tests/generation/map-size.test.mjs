import { describe, it, expect } from "vitest";
import { parseMapSize } from "../../src/generation/map-size.mjs";

describe("parseMapSize", () => {
    it("parses a WxH string", () => {
        expect(parseMapSize("15x30")).toEqual({ width: 15, height: 30 });
    });

    it("defaults to 20x20 when no input is given", () => {
        expect(parseMapSize(undefined)).toEqual({ width: 20, height: 20 });
        expect(parseMapSize(null)).toEqual({ width: 20, height: 20 });
        expect(parseMapSize("")).toEqual({ width: 20, height: 20 });
    });

    it("falls back to the default on an unparseable value", () => {
        expect(parseMapSize("not-a-size")).toEqual({ width: 20, height: 20 });
    });
});
