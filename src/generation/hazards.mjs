// SPECS.md "HAZARDS SUMMARY" — Table 4-1 (lair count), 4-2 (monster type per lair),
// then the matching detail table from 4-3..4-12 for lair inhabitants. PDF pages 60..65.

/**
 * @param {ReturnType<typeof import("./region.mjs").createRegion>} region
 * @returns {Promise<{ hazards: object[] }>}
 */
export async function generateHazards(region) {
    throw new Error("generateHazards not yet implemented — see SPECS.md HAZARDS SUMMARY / Tables 4-1..4-12");
}
