// Foundry-side effects for materializing Ancient Ruins — one JournalEntry ("<Map Name> -
// Ancient Ruins") with a page per ruin, and a scene Note per ruin deep-linked to its page.
// Kept separate from the pure roll logic in generation/ruins.mjs so that stays
// unit-testable without a real Foundry environment (mirrors geography-scene.mjs).

import { RUIN_TYPE_DESCRIPTIONS, MENACE_DESCRIPTIONS, PURPOSE_DESCRIPTIONS, REASON_DESCRIPTIONS } from "../tables/ruins.mjs";
import { getOrCreateJournalFolder } from "./journal-folder.mjs";

function renderRuinPageHtml(ruin) {
    const purposeText = ruin.purpose
        .map(purpose => `${purpose} (${PURPOSE_DESCRIPTIONS[purpose]})`)
        .join(" and ");

    return `<p><strong>Type</strong>: ${ruin.type} — ${RUIN_TYPE_DESCRIPTIONS[ruin.type]}</p>
<p><strong>Ancient Menace</strong>: ${ruin.menace} — ${MENACE_DESCRIPTIONS[ruin.menace]}</p>
<p><strong>Original Purpose</strong>: ${purposeText}</p>
<p><strong>Reason for Ruin</strong>: ${ruin.reason} — ${REASON_DESCRIPTIONS[ruin.reason]}</p>
<p><strong>Suggested Age</strong>: ~${ruin.age.yearsAgo} years ago (${ruin.age.period}). The book leaves this to
the GM rather than a roll — this is only a starting suggestion, edit it freely to fit the region's history.</p>`;
}

/** Creates (or reuses, appending pages) the "<Map Name> - Ancient Ruins" JournalEntry. */
export async function createRuinsJournal(region, ruins) {
    const folder = await getOrCreateJournalFolder(region);
    let journal = region.ruins.journalId ? game.journal.get(region.ruins.journalId) : null;
    if (!journal) {
        journal = await JournalEntry.create({ name: `${region.geography.sceneName} - Ancient Ruins`, folder: folder.id });
    }

    const startIndex = region.ruins.entries.length;
    const pages = await journal.createEmbeddedDocuments("JournalEntryPage", ruins.map((ruin, i) => ({
        name: `Ruin ${startIndex + i + 1}: ${ruin.type}`,
        text: { content: renderRuinPageHtml(ruin), format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML },
    })));
    return { journal, pages };
}

/** One Note per ruin, deep-linked to its journal page, centered on its grid cell. */
export async function placeRuinNotes(scene, journal, ruins, pages) {
    const gridSize = scene.grid.size;
    const notes = ruins.map((ruin, i) => ({
        entryId: journal.id,
        pageId: pages[i].id,
        x: ruin.cell.x * gridSize + gridSize / 2,
        y: ruin.cell.y * gridSize + gridSize / 2,
        text: ruin.type,
    }));
    return scene.createEmbeddedDocuments("Note", notes);
}
