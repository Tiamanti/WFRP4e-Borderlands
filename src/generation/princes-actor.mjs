// Materializes rollPrinces()'s output (generation/princes.mjs) onto Foundry: an `npc`
// Actor per prince, with real linked Career/Skill/Talent Items — not just descriptive text.
// Filed into a shared "<Map Name>" Actor folder, mirroring journal-folder.mjs's
// JournalEntry folder (Folders are typed per document type, so this needs its own
// file/flag rather than reusing region.journalFolderId).
//
// Item lookup reuses wfrp4e's own `game.wfrp4e.utility.findExactName`/`findBaseName`
// (packages/wfrp4e/src/system/utility-wfrp4e.js) instead of hand-rolled compendium search.
// These search every compendium pack tagged with the relevant item type
// (`game.wfrp4e.tags.getPacksWithTag`, itself scanning every installed pack's own index —
// not just wfrp4e-core's), which is what actually finds "Basic" skills like Stealth/Ride:
// those ship in the wfrp4e *system's* own bundled pack, not wfrp4e-core's, so a
// wfrp4e-core-only search was missing them. `module.json` still declares `wfrp4e-core` as
// required — it's what supplies the "Advanced"/grouped skills, Careers, and Talents this
// phase also needs, which the system's own pack doesn't have.

import {
    princeDisplayName, GOAL_DESCRIPTIONS, PRINCIPLE_DESCRIPTIONS, STYLE_DESCRIPTIONS,
    SECRET_DESCRIPTIONS, QUIRK_DESCRIPTIONS,
} from "../tables/princes.mjs";

/** Creates (or reuses) the region's Actor folder, named after the map/scene. */
export async function getOrCreateActorFolder(region) {
    let folder = region.actorFolderId ? game.folders.get(region.actorFolderId) : null;
    if (!folder) {
        folder = await Folder.create({ name: region.geography.sceneName, type: "Actor" });
        region.actorFolderId = folder.id;
    }
    return folder;
}

/** Splits a tables/princes.mjs skill entry like "Dodge +10%" into its lookup name and numeric bonus. */
function parseSkillBonus(name) {
    const match = name.match(/^(.*?)\s*\+(\d+)%$/);
    return match ? { baseName: match[1], bonus: Number(match[2]) } : { baseName: name, bonus: 0 };
}

/**
 * Matches an already-4e Skill/Talent name (tables/princes.mjs — see PLAN.md for why this
 * isn't resolving 2e names at runtime) against every compendium pack that has that item
 * type. Exact name first (`findExactName`); for a specialised name with no exact entry
 * (e.g. only a generic "Lore (any)" template exists), `findBaseName` matches on the name
 * before the "(...)" bracket and returns a *clone* already renamed to the full specialised
 * name — so the caller doesn't need its own generic-template fallback logic.
 */
async function findItem(baseName, itemType) {
    return (await game.wfrp4e.utility.findExactName(baseName, itemType))
        ?? (await game.wfrp4e.utility.findBaseName(baseName, itemType));
}

/**
 * Resolves a list of already-4e Skill/Talent names into embeddable Item data. Anything
 * that can't be found in any installed compendium is returned in `missing` instead (added
 * to the biography as a note rather than silently dropped).
 */
async function resolveNamedItems(names, itemType) {
    const items = [];
    const missing = [];
    for (const name of names) {
        const { baseName, bonus } = parseSkillBonus(name);
        const found = await findItem(baseName, itemType);
        if (!found) {
            missing.push(name);
            continue;
        }
        const data = found.toObject();
        delete data._id;
        data.name = name.replace(/\s*\+\d+%$/, "");
        if (itemType === "skill" && bonus) foundry.utils.setProperty(data, "system.advances.value", bonus);
        items.push(data);
    }
    return { items, missing };
}

/**
 * Every NPC should have wfrp4e's standard Basic Skills set (untrained-usable skills like
 * Charm, Dodge, Gossip — makes running the NPC in play far easier, not just flavor), the
 * same set wfrp4e's own "Add Basic Skills?" prompt would add. Fetched directly via
 * `game.wfrp4e.utility.allBasicSkills()` rather than going through that prompt (see
 * `createPrinceActor` — the prompt only fires when an Actor is created with no items at
 * all, so it can't distinguish "add the defaults" from "these skills are already covered,"
 * which is exactly what causes duplicates for skills this phase already resolved, e.g. a
 * Bandit's "Dodge +10%"). Anything already present in `existingSkillNames` (compared by
 * base name, ignoring a "+N%" suffix) is skipped so the two sources never overlap.
 */
async function resolveBasicSkills(existingSkillNames) {
    const basicSkills = await game.wfrp4e.utility.allBasicSkills();
    const existingBaseNames = new Set(existingSkillNames.map(name => parseSkillBonus(name).baseName));
    return basicSkills.filter(skill => !existingBaseNames.has(skill.name));
}

/** Career Items are per-tier: name is the tier's level name (e.g. "Outlaw Chief"), `system.careergroup.value` is the career line (e.g. "Outlaw") — not just a base-name match, so this doesn't reuse findItem. */
async function resolveCareerItem(career) {
    for (const pack of game.wfrp4e.tags.getPacksWithTag("career")) {
        const index = await pack.getIndex({ fields: ["type", "system.careergroup.value", "system.level.value"] });
        const match = index.find(e => e.type === "career" && e.name === career.level
            && (e.system?.careergroup?.value ?? "").toLowerCase() === career.career.toLowerCase());
        if (match) return pack.getDocument(match._id);
    }
    return null;
}

function renderBiography(prince) {
    const missingNotes = [...prince.missingSkills, ...prince.missingTalents].map(name => `<li>${name} — not found in any installed compendium, add manually if needed.</li>`);
    const guidanceItems = prince.guidanceNotes.map(note => `<li>${note}</li>`);
    const priorCareers = prince.priorCareers.map(c => `<li>${c}</li>`);
    const secretItems = prince.secrets.map(secret => `<li><strong>${secret}</strong> — ${SECRET_DESCRIPTIONS[secret]}</li>`);
    const quirkItems = prince.quirks.map(quirk => `<li><strong>${quirk}</strong> — ${QUIRK_DESCRIPTIONS[quirk]}</li>`);

    return `<p><strong>${prince.title} of a small principality</strong> — ${prince.type}, ${prince.race}.</p>
<p><strong>Career:</strong> ${prince.career.career} — Tier ${prince.career.tier}: ${prince.career.level}
   (${prince.careerLevel} career, ${prince.careerProgress})</p>
<p><strong>Prior careers:</strong></p><ul>${priorCareers.join("")}</ul>
<p><strong>Goal:</strong> ${prince.goal}<br>${GOAL_DESCRIPTIONS[prince.goal]}</p>
<p><strong>Principle:</strong> ${prince.principle}<br>${PRINCIPLE_DESCRIPTIONS[prince.principle]}</p>
<p><strong>Style:</strong> ${prince.style}<br>${STYLE_DESCRIPTIONS[prince.style]}</p>
<p><strong>Secrets:</strong></p><ul>${secretItems.join("") || "<li>None</li>"}</ul>
<p><strong>Quirks:</strong></p><ul>${quirkItems.join("")}</ul>
<p><strong>Court:</strong> ${prince.courtiers} courtiers</p>
<p><strong>Principality:</strong> ${prince.principalitySize} squares (size only — place on the map by hand, see Table 1-1 §Principality)</p>
<p><strong>Armour:</strong> ${prince.armour || "None"}<br><strong>Weapons:</strong> ${prince.weapons || "None"}<br><strong>Trappings:</strong> ${prince.trappings || "None"}</p>
${guidanceItems.length ? `<p><strong>Conversion notes:</strong></p><ul>${guidanceItems.join("")}</ul>` : ""}
${missingNotes.length ? `<p><strong>Not found automatically:</strong></p><ul>${missingNotes.join("")}</ul>` : ""}`;
}

/** Creates the `npc` Actor for a single rolled prince, with linked Career/Skill/Talent Items where an installed compendium has a match. */
export async function createPrinceActor(region, prince, folder) {
    const { items: skillItems, missing: missingSkills } = await resolveNamedItems(prince.skills, "skill");
    const { items: talentItems, missing: missingTalents } = await resolveNamedItems(prince.talents, "talent");
    const basicSkillItems = await resolveBasicSkills(prince.skills);
    const careerItem = await resolveCareerItem(prince.career);
    const items = [...skillItems, ...basicSkillItems, ...talentItems];
    if (careerItem) {
        const careerData = careerItem.toObject();
        delete careerData._id;
        foundry.utils.setProperty(careerData, "system.current.value", true);
        items.push(careerData);
    } else {
        prince.missingCareer = `${prince.career.career} — Tier ${prince.career.tier}: ${prince.career.level}`;
    }

    // { skipItems: true } stops wfrp4e's own Actor#_preCreate from prompting "Add Basic
    // Skills?" — this phase already includes the deduped Basic Skills set in `items`
    // (resolveBasicSkills, above), created via createEmbeddedDocuments right after. Without
    // skipItems the prompt fires anyway (it only sees that `data.items` is empty at create
    // time) and, if accepted, would add its own undeduped basic skill set on top.
    const actor = await Actor.create({
        name: princeDisplayName(prince),
        type: "npc",
        folder: folder.id,
        system: {
            characteristics: {
                ws: { initial: prince.characteristics.ws }, bs: { initial: prince.characteristics.bs },
                s: { initial: prince.characteristics.s }, t: { initial: prince.characteristics.t },
                i: { initial: prince.characteristics.initiative }, ag: { initial: prince.characteristics.agi },
                dex: { initial: prince.characteristics.dexterity }, int: { initial: prince.characteristics.int },
                wp: { initial: prince.characteristics.wp }, fel: { initial: prince.characteristics.fel },
            },
            details: {
                species: { value: prince.race },
                move: { value: prince.characteristics.m },
                biography: { value: renderBiography({ ...prince, missingSkills, missingTalents }) },
            },
        },
    }, { skipItems: true });
    await actor.createEmbeddedDocuments("Item", items, { skipSpecialisationChoice: true });
    return actor;
}
