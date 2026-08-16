// Posts the Ancient Ruins phase's roll results to chat when it finishes — mirrors
// geography-chat.mjs's GM-only ("selfroll") summary message. Foundry-side effect, kept
// out of generation/ruins.mjs so that stays unit-testable without a Foundry stub.

function describeRuin(ruin, number) {
    const purposeText = ruin.purpose.join(" & ");
    return `<li><strong>Ruin ${number}: ${ruin.type}</strong>
        — Menace: ${ruin.menace}; Purpose: ${purposeText}; Reason: ${ruin.reason};
        Age: ~${ruin.age.yearsAgo} years ago (${ruin.age.period});
        Cell: (${ruin.cell.x}, ${ruin.cell.y})</li>`;
}

function renderRuinsSummaryHtml(region, newRuins, startIndex) {
    const items = newRuins.map((ruin, i) => describeRuin(ruin, startIndex + i + 1)).join("");
    return `<h3>${region.geography.sceneName} — Ancient Ruins Results</h3>
<p>${newRuins.length} ruin${newRuins.length === 1 ? "" : "s"} generated.</p>
<ol>${items}</ol>`;
}

/** Posts the newly-generated ruins as a GM-only ("selfroll") chat message. */
export async function postRuinsSummary(region, newRuins, startIndex) {
    const chatData = ChatMessage.applyRollMode({
        content: renderRuinsSummaryHtml(region, newRuins, startIndex),
        speaker: ChatMessage.getSpeaker(),
    }, "selfroll");
    return ChatMessage.create(chatData);
}
