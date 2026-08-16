// Foundry-side effects for materializing Settlements — one JournalEntry ("<Map Name> -
// Settlements") with one page per prince plus one page for the uncontrolled area (same
// per-owner pattern relationships-journal.mjs established), each settlement rendered as a
// subsection. No scene placement at all, per the locked-in "journal-only" decision
// (PLAN.md) — every settlement's placement preference is included as text instead. Kept
// separate from the pure roll logic in generation/settlements.mjs so that stays
// unit-testable without a real Foundry environment.

import { princeDisplayName } from "../tables/princes.mjs";
import {
    COMMUNITY_FEATURE_DESCRIPTIONS, SPECIAL_FEATURE_DESCRIPTIONS, PLACEMENT_GUIDANCE,
} from "../tables/settlements.mjs";
import { getOrCreateJournalFolder } from "./journal-folder.mjs";

const RESOURCE_KINDS = new Set(["Resource", "Craft", "Oddity", "Market"]);

function renderFeatureHtml(feature) {
    if (RESOURCE_KINDS.has(feature.kind)) {
        const detail = feature.detail ? `: ${feature.detail}` : "";
        const strongholdNote = feature.isStronghold ? " — makes this settlement a Stronghold" : "";
        return `<li>Economic Resource (${feature.kind})${detail}${strongholdNote}</li>`;
    }
    const description = COMMUNITY_FEATURE_DESCRIPTIONS[feature.type] ?? SPECIAL_FEATURE_DESCRIPTIONS[feature.type];
    return `<li>${feature.type} — ${description}</li>`;
}

function renderSettlementHtml(settlement) {
    const tierLabel = settlement.tier.charAt(0).toUpperCase() + settlement.tier.slice(1);
    const featureItems = settlement.features.map(renderFeatureHtml).join("");
    return `<h3>${tierLabel}${settlement.isStronghold ? " (Stronghold)" : ""} — population ${settlement.population}</h3>
<p><em>Placement:</em> ${PLACEMENT_GUIDANCE[settlement.tier]}</p>
${featureItems ? `<ul>${featureItems}</ul>` : "<p>No notable features.</p>"}`;
}

/**
 * A single owner's page: every settlement belonging to them, largest population first (a
 * prince's Town — always the biggest, when one exists — leads the page, down through their
 * villages and homesteads). No heading repeating the page's own title — Foundry's journal
 * viewer already shows that.
 */
function renderOwnerPageHtml(settlementsForOwner) {
    const sorted = [...settlementsForOwner].sort((a, b) => b.population - a.population);
    return sorted.map(renderSettlementHtml).join("");
}

/**
 * Creates (or reuses) the "<Map Name> - Settlements" JournalEntry, with one page per prince
 * plus one page for the uncontrolled area (`ownerId: null`) — mirrors
 * relationships-journal.mjs's per-prince pattern. Pages are keyed by an `ownerId` flag
 * (princes by Actor id, the uncontrolled area by the literal string sentinel below, since
 * Foundry flags round-trip `null` fine but a `Map` needs a stable, distinguishable key) so a
 * re-run rebuilds an affected owner's page in place instead of duplicating it —
 * `allSettlements` is expected to be the *complete* accumulated list, not just this run's
 * new settlements, since a page's content is fully rebuilt from scratch each time.
 */
export async function createSettlementsJournal(region, princes, allSettlements) {
    const folder = await getOrCreateJournalFolder(region);
    let journal = region.settlements.journalId ? game.journal.get(region.settlements.journalId) : null;
    if (!journal) {
        journal = await JournalEntry.create({ name: `${region.geography.sceneName} - Settlements`, folder: folder.id });
    }

    const UNCONTROLLED_KEY = "__uncontrolled__";
    const existingPages = new Map(
        journal.pages
            .filter(page => page.getFlag("wfrp4e-borderlands", "ownerId") !== undefined)
            .map(page => [page.getFlag("wfrp4e-borderlands", "ownerId") ?? UNCONTROLLED_KEY, page])
    );

    const owners = [
        ...princes.map(prince => ({ id: prince.actorId, name: princeDisplayName(prince) })),
        { id: null, name: "Uncontrolled Areas" },
    ];

    const toCreate = [];
    const toUpdate = [];
    for (const owner of owners) {
        const settlementsForOwner = allSettlements.filter(s => s.ownerId === owner.id);
        if (!settlementsForOwner.length) continue;

        const content = renderOwnerPageHtml(settlementsForOwner);
        const existing = existingPages.get(owner.id ?? UNCONTROLLED_KEY);
        if (existing) {
            toUpdate.push({ _id: existing.id, name: owner.name, "text.content": content });
        } else {
            toCreate.push({
                name: owner.name,
                text: { content, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML },
                flags: { "wfrp4e-borderlands": { ownerId: owner.id } },
            });
        }
    }

    if (toUpdate.length) await journal.updateEmbeddedDocuments("JournalEntryPage", toUpdate);
    const createdPages = toCreate.length ? await journal.createEmbeddedDocuments("JournalEntryPage", toCreate) : [];
    return { journal, pages: createdPages };
}
