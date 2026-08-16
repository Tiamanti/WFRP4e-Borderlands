// Foundry-side effects for materializing Relationships — one JournalEntry ("<Map Name> -
// Relationships") with one page **per prince** (not per relationship, per the user's
// correction — a GM looking up a prince wants everything relevant to that prince on one
// page), each relationship rendered as a subsection naming the *other* prince. Which
// relationships land on which prince's page respects the book's own one-sidedness: Alliance/
// Rivalry/War describe the pair mutually and appear on both pages, but every other nature
// (Bitterness, Contempt, Envy, Fear, Hatred, Respect, Vengeance) is one prince's feeling
// *about* the other — only the feeling prince's page shows it, not their target's (see
// relationshipBelongsToPrince, below, and MUTUAL_RELATIONS in tables/relationships.mjs). No
// scene placement: unlike Ancient Ruins, relationships aren't spatial, so there's no Note to
// place. Kept separate from the pure roll logic in generation/relationships.mjs so that
// stays unit-testable without a real Foundry environment (mirrors ruins-scene.mjs).

import { princeDisplayName } from "../tables/princes.mjs";
import {
    RELATION_DESCRIPTIONS, ALLIANCE_ORIGIN_DESCRIPTIONS, WAR_CAUSE_DESCRIPTIONS, CAUSE_DESCRIPTIONS,
    MUTUAL_RELATIONS,
} from "../tables/relationships.mjs";
import { getOrCreateJournalFolder } from "./journal-folder.mjs";

/**
 * Whether `relationship` belongs on `princeId`'s page. Mutual natures (Alliance/Rivalry/War)
 * describe the pair as a whole, so both princes' pages show them; every other nature is
 * one-directional — only princeA (the one whose feeling this is) shows it, not their
 * randomly-picked target princeB, who doesn't necessarily feel the same way — see
 * MUTUAL_RELATIONS in tables/relationships.mjs.
 */
function relationshipBelongsToPrince(relationship, princeId) {
    if (MUTUAL_RELATIONS.includes(relationship.nature)) {
        return relationship.princeAId === princeId || relationship.princeBId === princeId;
    }
    return relationship.princeAId === princeId;
}

/** Renders the nature-specific cause block — shape varies per rollRelationshipCause's return value (see generation/relationships.mjs). */
function renderCauseHtml({ nature, cause }) {
    if (nature === "Rivalry") return "";

    if (nature === "Alliance") {
        const items = cause.origins.map(origin => `<li>${origin} — ${ALLIANCE_ORIGIN_DESCRIPTIONS[origin]}</li>`).join("");
        return `<p><strong>Origin${cause.origins.length > 1 ? "s" : ""} (reinforced by longevity):</strong></p><ul>${items}</ul>`;
    }

    if (nature === "War") {
        const warDescription = WAR_CAUSE_DESCRIPTIONS[cause.causeOfWar];
        let html = `<p><strong>Cause of War:</strong> ${cause.causeOfWar}${warDescription ? ` — ${warDescription}` : ""}</p>`;
        if (cause.underlyingCause) {
            html += `<p><strong>Underlying ${cause.underlyingNature}:</strong> ${cause.underlyingCause} — ${CAUSE_DESCRIPTIONS[cause.underlyingNature][cause.underlyingCause]}</p>`;
        }
        return html;
    }

    return `<p><strong>Cause:</strong> ${cause} — ${CAUSE_DESCRIPTIONS[nature][cause]}</p>`;
}

/** One relationship, from `selfId`'s point of view — subtitled with the *other* prince's name, per the user's requested layout. */
function renderRelationshipSectionHtml(relationship, selfId) {
    const otherId = relationship.princeAId === selfId ? relationship.princeBId : relationship.princeAId;
    const otherName = game.actors.get(otherId)?.name ?? "Unknown Prince";
    return `<h3>${otherName}: ${relationship.nature}</h3>
<p><strong>Nature:</strong> ${relationship.nature} — ${RELATION_DESCRIPTIONS[relationship.nature]}</p>
<p><strong>Length:</strong> ${relationship.length}</p>
${renderCauseHtml(relationship)}
<p>@UUID[Actor.${otherId}]{${otherName}}</p>`;
}

/**
 * A single prince's page: every relationship that belongs on it per relationshipBelongsToPrince,
 * oldest first. No heading repeating the prince's own name — the page's `name` (set to
 * princeDisplayName below) already serves as the title in Foundry's journal viewer.
 */
function renderPrincePageHtml(prince, relationshipsForPrince) {
    return relationshipsForPrince.map(r => renderRelationshipSectionHtml(r, prince.actorId)).join("");
}

/**
 * Creates (or reuses) the "<Map Name> - Relationships" JournalEntry, with one page per
 * prince who's party to at least one relationship. Pages are keyed by the prince's Actor id
 * (`flags["wfrp4e-borderlands"].princeId`) rather than matched by name, so a re-run rebuilds
 * each affected prince's page in place (their full relationship list, old and new together)
 * instead of duplicating pages — `allRelationships` is expected to be the *complete*
 * accumulated list (`region.relationships.entries` plus this run's new ones), not just the
 * new batch, since a page's content is fully rebuilt from scratch each time rather than
 * incrementally appended.
 */
export async function createRelationshipsJournal(region, princes, allRelationships) {
    const folder = await getOrCreateJournalFolder(region);
    let journal = region.relationships.journalId ? game.journal.get(region.relationships.journalId) : null;
    if (!journal) {
        journal = await JournalEntry.create({ name: `${region.geography.sceneName} - Relationships`, folder: folder.id });
    }

    const existingPages = new Map(
        journal.pages
            .filter(page => page.getFlag("wfrp4e-borderlands", "princeId"))
            .map(page => [page.getFlag("wfrp4e-borderlands", "princeId"), page])
    );

    const toCreate = [];
    const toUpdate = [];
    for (const prince of princes) {
        const relationshipsForPrince = allRelationships.filter(r => relationshipBelongsToPrince(r, prince.actorId));
        if (!relationshipsForPrince.length) continue;

        const content = renderPrincePageHtml(prince, relationshipsForPrince);
        const existing = existingPages.get(prince.actorId);
        if (existing) {
            toUpdate.push({ _id: existing.id, name: princeDisplayName(prince), "text.content": content });
        } else {
            toCreate.push({
                name: princeDisplayName(prince),
                text: { content, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML },
                flags: { "wfrp4e-borderlands": { princeId: prince.actorId } },
            });
        }
    }

    if (toUpdate.length) await journal.updateEmbeddedDocuments("JournalEntryPage", toUpdate);
    const createdPages = toCreate.length ? await journal.createEmbeddedDocuments("JournalEntryPage", toCreate) : [];
    return { journal, pages: createdPages };
}
