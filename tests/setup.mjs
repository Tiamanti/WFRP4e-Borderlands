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
