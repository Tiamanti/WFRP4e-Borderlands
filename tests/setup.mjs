import { vi } from "vitest";

// Minimal Foundry VTT global stubs so source modules can be imported and called.
// Tests that need specific return values should override these per-test.

globalThis.foundry = {
    applications: {
        api: {
            ApplicationV2: class {
                static DEFAULT_OPTIONS = {};
                constructor() {}
                render() { return this; }
            },
            HandlebarsApplicationMixin: Base => Base,
        },
        handlebars: {
            renderTemplate: vi.fn(async () => "<rendered>"),
        },
    },
};

globalThis.game = {
    user: { isGM: true },
    i18n: {
        localize: key => key,
        format: (key, data) => `${key}:${JSON.stringify(data)}`,
    },
    wfrp4e: {
        commands: { add: vi.fn() },
    },
};

globalThis.ui = { notifications: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } };

// Controllable Roll stub for table-roll tests: push expected totals onto
// `globalThis.__rollQueue` (FIFO, one entry per `new Roll(...).evaluate()` call) before
// exercising code under test.
globalThis.__rollQueue = [];
globalThis.Roll = class {
    constructor(formula) {
        this.formula = formula;
    }
    async evaluate() {
        this.total = globalThis.__rollQueue.length > 0 ? globalThis.__rollQueue.shift() : 0;
        return this;
    }
};
