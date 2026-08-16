// Posts the Relationships phase's roll results to chat when it finishes — mirrors
// ruins-chat.mjs's GM-only ("selfroll") summary message. Foundry-side effect, kept out of
// generation/relationships.mjs so that stays unit-testable without a Foundry stub.

function describeCause({ nature, cause }) {
    if (nature === "Rivalry") return "";
    if (nature === "Alliance") return `; Origin: ${cause.origins.join(" & ")}`;
    if (nature === "War") return `; Cause: ${cause.causeOfWar}${cause.underlyingCause ? ` (${cause.underlyingCause})` : ""}`;
    return `; Cause: ${cause}`;
}

function describeRelationship(relationship, number) {
    const princeAName = game.actors.get(relationship.princeAId)?.name ?? "Unknown Prince";
    const princeBName = game.actors.get(relationship.princeBId)?.name ?? "Unknown Prince";
    return `<li><strong>${number}: ${princeAName} &harr; ${princeBName}</strong>
        — ${relationship.nature}, ${relationship.length}${describeCause(relationship)}</li>`;
}

function renderRelationshipsSummaryHtml(region, newRelationships, startIndex) {
    const items = newRelationships.map((relationship, i) => describeRelationship(relationship, startIndex + i + 1)).join("");
    return `<h3>${region.geography.sceneName} — Relationships Results</h3>
<p>${newRelationships.length} relationship${newRelationships.length === 1 ? "" : "s"} generated.</p>
<ol>${items}</ol>`;
}

/** Posts the newly-generated relationships as a GM-only ("selfroll") chat message. */
export async function postRelationshipsSummary(region, newRelationships, startIndex) {
    const chatData = ChatMessage.applyRollMode({
        content: renderRelationshipsSummaryHtml(region, newRelationships, startIndex),
        speaker: ChatMessage.getSpeaker(),
    }, "selfroll");
    return ChatMessage.create(chatData);
}
