// Posts the Settlements phase's roll results to chat when it finishes — mirrors
// relationships-chat.mjs's GM-only ("selfroll") summary message. Foundry-side effect, kept
// out of generation/settlements.mjs so that stays unit-testable without a Foundry stub.

function describeSettlement(settlement, number) {
    const tierLabel = settlement.tier.charAt(0).toUpperCase() + settlement.tier.slice(1);
    const ownerLabel = settlement.ownerId ? (game.actors.get(settlement.ownerId)?.name ?? "Unknown Prince") : "Uncontrolled";
    const featureCount = settlement.features.length;
    return `<li><strong>${number}: ${tierLabel}</strong> (${ownerLabel})
        — population ${settlement.population}${settlement.isStronghold ? ", Stronghold" : ""},
        ${featureCount} feature${featureCount === 1 ? "" : "s"}</li>`;
}

function renderSettlementsSummaryHtml(region, newSettlements, startIndex) {
    const items = newSettlements.map((settlement, i) => describeSettlement(settlement, startIndex + i + 1)).join("");
    return `<h3>${region.geography.sceneName} — Settlements Results</h3>
<p>${newSettlements.length} settlement${newSettlements.length === 1 ? "" : "s"} generated.</p>
<ol>${items}</ol>`;
}

/** Posts the newly-generated settlements as a GM-only ("selfroll") chat message. */
export async function postSettlementsSummary(region, newSettlements, startIndex) {
    const chatData = ChatMessage.applyRollMode({
        content: renderSettlementsSummaryHtml(region, newSettlements, startIndex),
        speaker: ChatMessage.getSpeaker(),
    }, "selfroll");
    return ChatMessage.create(chatData);
}
