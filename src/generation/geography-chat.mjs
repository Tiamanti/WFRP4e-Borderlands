// Posts the Geography phase's roll log to chat when the GM ends the phase (PLAN.md
// Geography design, Spec Clarification 3). Foundry-side effect, kept out of
// geography.mjs/geography-grid.mjs so those stay unit-testable without a Foundry stub.

// Mirrors geography-roller.hbs's log line exactly ("Label — N squares (total)" /
// "River (total)" / "Feature — N feet (total)" for boundary features) so the chat
// summary shows the same rolled values as the roll window.
function describeLogEntry(entry) {
    if (entry.type === "river") return `River (${entry.total})`;
    if (entry.placement === "boundary") return `${entry.feature} — ${entry.size} ${entry.sizeUnit} (${entry.total})`;

    const cellCount = entry.cells?.length ?? 0;
    const label = entry.type === "terrain"
        ? [entry.vegetation, entry.terrain].filter(Boolean).join(" ")
        : entry.feature;
    return `${label} — ${cellCount} square${cellCount === 1 ? "" : "s"} (${entry.total})`;
}

function renderGeographySummaryHtml(region) {
    const { log, stoppedReason } = region.geography;
    const items = log.map(entry => `<li>${describeLogEntry(entry)}</li>`).join("");
    const stoppedLabel = stoppedReason === "map-full" ? "map full" : "ended by GM";
    return `<h3>${region.geography.sceneName ?? "Borderlands"} — Geography Results</h3>
<p>${log.length} roll${log.length === 1 ? "" : "s"} (${stoppedLabel}).</p>
<ol>${items}</ol>`;
}

/** Posts the Geography roll log as a GM-only ("selfroll") chat message. */
export async function postGeographySummary(region) {
    const chatData = ChatMessage.applyRollMode({
        content: renderGeographySummaryHtml(region),
        speaker: ChatMessage.getSpeaker(),
    }, "selfroll");
    return ChatMessage.create(chatData);
}
