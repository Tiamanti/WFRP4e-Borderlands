// Creates the "<Map Name> - Geography" JournalEntry when the GM ends the phase — one
// entry per unique terrain/river/special feature actually rolled, each with its book
// description (from src/tables/geography.mjs), filed into the region's shared journal
// folder (journal-folder.mjs). Foundry-side effect, not unit tested — see PLAN.md's note
// on geography-scene.mjs for why.

import { TERRAIN_DESCRIPTIONS, VEGETATION_DESCRIPTIONS } from "../tables/geography.mjs";
import { getOrCreateJournalFolder } from "./journal-folder.mjs";

/** Label -> description, deduped, in first-encountered order. */
export function collectFeatureDescriptions(log) {
    const descriptions = new Map();
    for (const entry of log) {
        if (entry.type === "river" && !descriptions.has("River")) {
            descriptions.set("River", TERRAIN_DESCRIPTIONS.River);
        } else if (entry.type === "terrain") {
            const label = entry.vegetation ? `${entry.vegetation} ${entry.terrain}` : entry.terrain;
            if (!descriptions.has(label)) {
                const text = [VEGETATION_DESCRIPTIONS[entry.vegetation], TERRAIN_DESCRIPTIONS[entry.terrain]]
                    .filter(Boolean).join(" ");
                descriptions.set(label, text);
            }
        } else if (entry.type === "special" && !descriptions.has(entry.feature)) {
            descriptions.set(entry.feature, entry.description);
        }
    }
    return descriptions;
}

/** No heading repeating the page's own name/title — Foundry's journal viewer already shows that. */
function renderGeographyPageHtml(descriptions) {
    return [...descriptions.entries()]
        .map(([label, text]) => `<p><strong>${label}</strong> — ${text}</p>`)
        .join("");
}

/** Creates the Geography JournalEntry (one page, one paragraph per terrain/feature type encountered). */
export async function createGeographyJournal(region) {
    const folder = await getOrCreateJournalFolder(region);
    const descriptions = collectFeatureDescriptions(region.geography.log);

    const journal = await JournalEntry.create({
        name: `${region.geography.sceneName} - Geography`,
        folder: folder.id,
        pages: [{
            name: "Geography",
            text: { content: renderGeographyPageHtml(descriptions), format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML },
        }],
    });
    region.geography.journalId = journal.id;
    return journal;
}
