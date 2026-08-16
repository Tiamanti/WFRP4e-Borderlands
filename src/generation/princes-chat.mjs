// Posts the Princes phase's roll results to chat when it finishes — mirrors
// ruins-chat.mjs/geography-chat.mjs's GM-only ("selfroll") summary message.

function describePrince(prince, number) {
    return `<li><strong>Prince ${number}: ${prince.title} (${prince.type}, ${prince.race})</strong>
        — ${prince.career.career} — Tier ${prince.career.tier}: ${prince.career.level};
        Goal: ${prince.goal}; Principle: ${prince.principle}; Style: ${prince.style};
        Courtiers: ${prince.courtiers}; Principality: ${prince.principalitySize} squares</li>`;
}

function renderPrincesSummaryHtml(region, newPrinces, startIndex) {
    const items = newPrinces.map((prince, i) => describePrince(prince, startIndex + i + 1)).join("");
    return `<h3>${region.geography.sceneName} — Princes Results</h3>
<p>${newPrinces.length} prince${newPrinces.length === 1 ? "" : "s"} generated.</p>
<ol>${items}</ol>`;
}

/** Posts the newly-generated princes as a GM-only ("selfroll") chat message. */
export async function postPrincesSummary(region, newPrinces, startIndex) {
    const chatData = ChatMessage.applyRollMode({
        content: renderPrincesSummaryHtml(region, newPrinces, startIndex),
        speaker: ChatMessage.getSpeaker(),
    }, "selfroll");
    return ChatMessage.create(chatData);
}
