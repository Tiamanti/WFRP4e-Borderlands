// Posts the Geography phase's roll log to chat once generateGeography finishes. Foundry-side
// effect, kept out of geography.mjs/geography-terrain.mjs/etc. so those stay unit-testable
// without a Foundry stub.

function describeLogEntry(entry) {
    if (entry.type === "river") return `River (${entry.total})`;
    if (entry.type === "terrain") {
        const label = [entry.vegetation, entry.terrain].filter(Boolean).join(" ");
        return `${label} — ${entry.size} squares (${entry.total})`;
    }
    // Special feature (Table 1-2).
    if (entry.feature === "Caves") {
        return `Caves — size ${entry.size} (~${Math.max(1, Math.floor(entry.size / 10))} entrances) (${entry.total})`;
    }
    if (entry.placement === "boundary") return `${entry.feature} — ${entry.size} ${entry.sizeUnit} (${entry.total})`;
    return `${entry.feature} (${entry.total})`;
}

function renderGeographySummaryHtml(region, log, regions, rivers, cliffs) {
    const items = log.map(entry => `<li>${describeLogEntry(entry)}</li>`).join("");
    return `<h3>${region.geography.sceneName ?? "Borderlands"} — Geography Results</h3>
<p>${log.length} roll${log.length === 1 ? "" : "s"}: ${regions.length} terrain region${regions.length === 1 ? "" : "s"}, `
        + `${rivers.length} river${rivers.length === 1 ? "" : "s"}, ${cliffs.length} cliff${cliffs.length === 1 ? "" : "s"}.</p>
<ol>${items}</ol>`;
}

/** Posts the Geography roll log as a GM-only ("selfroll") chat message. */
export async function postGeographySummary(region, log, regions, rivers, cliffs) {
    const chatData = ChatMessage.applyRollMode({
        content: renderGeographySummaryHtml(region, log, regions, rivers, cliffs),
        speaker: ChatMessage.getSpeaker(),
    }, "selfroll");
    return ChatMessage.create(chatData);
}
