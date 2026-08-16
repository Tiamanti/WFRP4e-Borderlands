// Table 4-1's lair count is explicitly GM-chosen, not random ("it is something you need to
// decide, in broad terms, rather than randomly generate") — this is the single-field prompt
// the wizard awaits *before* calling the generic one-shot runPhase("hazards", style), as a
// lightweight DialogV2 rather than a whole ApplicationV2 (see PLAN.md's "Hazards phase
// design" section).

/**
 * Prompts the GM for a campaign style (Few/Moderate/Many monster lairs — Table 4-1's three
 * columns). Returns "few"|"moderate"|"many", or `null` if the dialog was dismissed instead
 * of a button being clicked (DialogV2.wait's own convention) — callers should treat that as
 * "cancelled," not default to any particular style.
 */
export async function promptLairStyle() {
    return foundry.applications.api.DialogV2.wait({
        window: { title: game.i18n.localize("BORDERLANDS.LairStyleTitle") },
        content: `<p>${game.i18n.localize("BORDERLANDS.LairStylePrompt")}</p>`,
        buttons: [
            { action: "few", label: game.i18n.localize("BORDERLANDS.LairStyleFew") },
            { action: "moderate", label: game.i18n.localize("BORDERLANDS.LairStyleModerate"), default: true },
            { action: "many", label: game.i18n.localize("BORDERLANDS.LairStyleMany") },
        ],
    });
}
