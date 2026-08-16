// Posts the Hazards phase's roll results to chat when it finishes — mirrors
// settlements-chat.mjs's GM-only ("selfroll") summary message. Foundry-side effect, kept
// out of generation/hazards.mjs so that stays unit-testable without a Foundry stub.

function describeLair(lair, number) {
    if (lair.type === "Chaos") {
        return `<li><strong>${number}: Chaos</strong> — ${lair.leader} leading ${lair.count}${lair.followers ? ` (${lair.followers})` : ""}</li>`;
    }
    if (lair.type === "Greenskin") {
        return `<li><strong>${number}: Greenskin</strong> — ${lair.total} total, led by ${lair.leader ?? "no one"}</li>`;
    }
    if (lair.type === "Monster") {
        return `<li><strong>${number}: Monster</strong> — ${lair.count} ${lair.monster}(s), ${lair.attitude}</li>`;
    }
    if (lair.undeadClass === "Dead Lord") {
        return `<li><strong>${number}: Undead</strong> — ${lair.deadLordType}, servant horde of ${lair.servants.total}</li>`;
    }
    if (lair.undeadClass === "Lone Menace") {
        return `<li><strong>${number}: Undead</strong> — ${lair.menace}</li>`;
    }
    return `<li><strong>${number}: Undead</strong> — Shambling Horde of ${lair.horde.total}${lair.horde.cursed ? " (cursed)" : ""}</li>`;
}

function renderHazardsSummaryHtml(region, newLairs, startIndex) {
    const items = newLairs.map((lair, i) => describeLair(lair, startIndex + i + 1)).join("");
    return `<h3>${region.geography.sceneName} — Hazards Results</h3>
<p>${newLairs.length} lair${newLairs.length === 1 ? "" : "s"} generated.</p>
<ol>${items}</ol>`;
}

/** Posts the newly-generated lairs as a GM-only ("selfroll") chat message. */
export async function postHazardsSummary(region, newLairs, startIndex) {
    const chatData = ChatMessage.applyRollMode({
        content: renderHazardsSummaryHtml(region, newLairs, startIndex),
        speaker: ChatMessage.getSpeaker(),
    }, "selfroll");
    return ChatMessage.create(chatData);
}
