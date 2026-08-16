import { generateGeography } from "./geography.mjs";
import { generateAncientRuins } from "./ruins.mjs";
import { generatePrinces } from "./princes.mjs";
import { generateRelationships } from "./relationships.mjs";
import { generateSettlements } from "./settlements.mjs";
import { generateHazards } from "./hazards.mjs";

/**
 * The six generation phases, in SPECS.md order. Each entry's `run` takes the
 * region data built so far and returns the fields it produced.
 */
export const REGION_PHASES = [
    { id: "geography",     label: "BORDERLANDS.PhaseGeography",     run: generateGeography },
    { id: "ruins",         label: "BORDERLANDS.PhaseRuins",         run: generateAncientRuins },
    { id: "princes",       label: "BORDERLANDS.PhasePrinces",       run: generatePrinces },
    { id: "relationships", label: "BORDERLANDS.PhaseRelationships", run: generateRelationships },
    { id: "settlements",   label: "BORDERLANDS.PhaseSettlements",   run: generateSettlements },
    { id: "hazards",       label: "BORDERLANDS.PhaseHazards",       run: generateHazards },
];

/** Empty region data shape — one array/object per phase's output. */
export function createRegion({ sceneName = "Borderlands", mapSize = { width: 20, height: 20 } } = {}) {
    return {
        // Shared by every phase's Journal Entries (see generation/journal-folder.mjs) —
        // one "<Map Name>" folder holds Geography's, Ruins', etc. journals together.
        journalFolderId: null,
        geography: { sceneId: null, sceneName, mapSize, journalId: null, log: [], stoppedReason: null },
        ruins: { journalId: null, entries: [] },
        princes: [],
        relationships: [],
        settlements: [],
        hazards: [],
    };
}

/** Runs a single phase against the region in place, returning the updated region. */
export async function runPhase(region, phaseId, ...args) {
    const phase = REGION_PHASES.find(p => p.id === phaseId);
    if (!phase) throw new Error(`Unknown Borderlands phase: ${phaseId}`);

    const result = await phase.run(region, ...args);
    Object.assign(region, result);
    return region;
}

/** Whether a phase has produced any output yet, for the wizard's checklist UI. */
export function isPhaseDone(region, phaseId) {
    const data = region[phaseId];
    if (phaseId === "geography") return data.log.length > 0;
    if (phaseId === "ruins") return data.entries.length > 0;
    return Array.isArray(data) ? data.length > 0 : Object.keys(data ?? {}).length > 0;
}
