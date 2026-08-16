// Foundry-side effects for materializing Hazards — one JournalEntry ("<Map Name> -
// Hazards") with one page per lair (matches ruins-scene.mjs's pattern — a lair has no
// natural "owner" to group by the way a relationship or settlement has a prince). No scene
// placement at all: the book's own "Placing Lairs" section is explicit that no random table
// could sensibly place a lair without knowledge of the mapped area, so every page carries
// that guidance as text instead. Kept separate from the pure roll logic in
// generation/hazards.mjs so that stays unit-testable without a real Foundry environment.

import {
    PLACEMENT_GUIDANCE, CHAOS_LEADER_DESCRIPTIONS, GREENSKIN_COLUMNS, MONSTER_DESCRIPTIONS,
    MONSTER_ATTITUDE_DESCRIPTIONS, DEAD_LORD_DESCRIPTIONS, LONE_MENACE_DESCRIPTIONS,
    SHAMBLING_HORDE_COLUMNS,
} from "../tables/hazards.mjs";
import {
    GOAL_DESCRIPTIONS, PRINCIPLE_DESCRIPTIONS, STYLE_DESCRIPTIONS, SECRET_DESCRIPTIONS, QUIRK_DESCRIPTIONS,
} from "../tables/princes.mjs";
import { getOrCreateJournalFolder } from "./journal-folder.mjs";

function lairLabel(lair) {
    if (lair.type === "Chaos") return `Chaos (${lair.leader})`;
    if (lair.type === "Greenskin") return `Greenskin${lair.leader ? ` (${lair.leader} led)` : ""}`;
    if (lair.type === "Monster") return lair.monster;
    if (lair.undeadClass === "Dead Lord") return lair.deadLordType;
    if (lair.undeadClass === "Lone Menace") return lair.menace;
    return "Shambling Horde";
}

function renderChaosLairHtml(lair) {
    let html = `<p><strong>Leader:</strong> ${lair.leader} — ${CHAOS_LEADER_DESCRIPTIONS[lair.leader]}</p>
<p><strong>Creature Count:</strong> ${lair.count}</p>`;
    if (lair.aim) html += `<p><strong>Aim:</strong> ${lair.aim}</p>`;
    if (lair.followers) html += `<p><strong>Followers:</strong> ${lair.followers}</p>`;
    return html;
}

function renderGreenskinLairHtml(lair) {
    const countItems = GREENSKIN_COLUMNS.filter(c => lair.counts[c] > 0).map(c => `<li>${c}: ${lair.counts[c]}</li>`).join("");
    let html = `<p><strong>Total:</strong> ${lair.total}</p>
<ul>${countItems || "<li>None</li>"}</ul>
<p><strong>Leader:</strong> ${lair.leader ? `${lair.leader}s` : "None"}</p>`;
    if (lair.raidingArea) {
        html += `<p><strong>Raiding Area</strong> (Table 1-2 roll: ${lair.raidingArea.feature}): ${lair.raidingArea.size} ${lair.raidingArea.sizeUnit} —
place between principalities, moving any inconvenient villages to the edge (they're probably refugees from the Greenskins' territory).</p>`;
    }
    return html;
}

function renderMonsterLairHtml(lair) {
    return `<p><strong>${lair.monster}</strong> — ${MONSTER_DESCRIPTIONS[lair.monster]}</p>
<p><strong>Count:</strong> ${lair.count}</p>
<p><strong>Attitude:</strong> ${lair.attitude} — ${MONSTER_ATTITUDE_DESCRIPTIONS[lair.attitude]}</p>`;
}

function renderShamblingHordeHtml(horde) {
    const countItems = SHAMBLING_HORDE_COLUMNS.filter(c => horde.counts[c] > 0).map(c => `<li>${c}: ${horde.counts[c]}</li>`).join("");
    return `<p><strong>Total:</strong> ${horde.total}</p>
<ul>${countItems || "<li>None</li>"}</ul>
<p><strong>Curse:</strong> ${horde.cursed ? "Yes — anything it kills rises to join it." : "No"}</p>`;
}

function renderUndeadLairHtml(lair) {
    if (lair.undeadClass === "Dead Lord") {
        const p = lair.personality;
        const secretItems = p.secrets.map(s => `<li><strong>${s}</strong> — ${SECRET_DESCRIPTIONS[s]}</li>`).join("");
        const quirkItems = p.quirks.map(q => `<li><strong>${q}</strong> — ${QUIRK_DESCRIPTIONS[q]}</li>`).join("");
        return `<p><strong>${lair.deadLordType}</strong> — ${DEAD_LORD_DESCRIPTIONS[lair.deadLordType]}</p>
<p><strong>Goal:</strong> ${p.goal}<br>${GOAL_DESCRIPTIONS[p.goal]}</p>
<p><strong>Principle:</strong> ${p.principle}<br>${PRINCIPLE_DESCRIPTIONS[p.principle]}</p>
<p><strong>Style:</strong> ${p.style}<br>${STYLE_DESCRIPTIONS[p.style]}</p>
<p><strong>Secrets:</strong></p><ul>${secretItems || "<li>None</li>"}</ul>
<p><strong>Quirks:</strong></p><ul>${quirkItems}</ul>
<h4>Shambling Horde Servants</h4>
${renderShamblingHordeHtml(lair.servants)}`;
    }
    if (lair.undeadClass === "Lone Menace") {
        return `<p><strong>${lair.menace}</strong> — ${LONE_MENACE_DESCRIPTIONS[lair.menace]}</p>`;
    }
    return renderShamblingHordeHtml(lair.horde);
}

function renderLairHtml(lair) {
    if (lair.type === "Chaos") return renderChaosLairHtml(lair);
    if (lair.type === "Greenskin") return renderGreenskinLairHtml(lair);
    if (lair.type === "Monster") return renderMonsterLairHtml(lair);
    return renderUndeadLairHtml(lair);
}

function renderLairPageHtml(lair) {
    return `<p><strong>Type:</strong> ${lair.type}</p>
${renderLairHtml(lair)}
<p><strong>Placement:</strong> ${PLACEMENT_GUIDANCE}</p>`;
}

/** Creates (or reuses, appending pages) the "<Map Name> - Hazards" JournalEntry. */
export async function createHazardsJournal(region, lairs, startIndex) {
    const folder = await getOrCreateJournalFolder(region);
    let journal = region.hazards.journalId ? game.journal.get(region.hazards.journalId) : null;
    if (!journal) {
        journal = await JournalEntry.create({ name: `${region.geography.sceneName} - Hazards`, folder: folder.id });
    }

    const pages = await journal.createEmbeddedDocuments("JournalEntryPage", lairs.map((lair, i) => ({
        name: `Lair ${startIndex + i + 1}: ${lairLabel(lair)}`,
        text: { content: renderLairPageHtml(lair), format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML },
    })));
    return { journal, pages };
}
